import fs from 'fs';
import path from 'path';
import prisma from '../lib/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import logger from '../utils/logger.js';

// Base directory for backups storage
const UPLOADS_ROOT = path.resolve(process.cwd(), 'public', 'uploads');
const BACKUPS_ROOT = path.resolve(UPLOADS_ROOT, 'backups');

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// Helper to convert ISO date strings in objects to Date objects for Prisma
function deserializeDates(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    // Check for ISO-8601 date string
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(obj)) {
      const d = new Date(obj);
      if (!isNaN(d.getTime())) return d;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(deserializeDates);
  }
  if (typeof obj === 'object') {
    const res: any = {};
    for (const [key, value] of Object.entries(obj)) {
      res[key] = deserializeDates(value);
    }
    return res;
  }
  return obj;
}

// Convert BigInt to number/string for JSON serialization
function serializeSafe(data: any): any {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}

// Find any file URLs referenced in an object
function extractFilePaths(obj: any, found: Set<string> = new Set()): Set<string> {
  if (!obj) return found;
  if (typeof obj === 'string') {
    if (obj.startsWith('/uploads/') || obj.startsWith('uploads/')) {
      const cleanPath = obj.startsWith('/') ? obj.slice(1) : obj;
      found.add(cleanPath);
    }
  } else if (Array.isArray(obj)) {
    for (const item of obj) extractFilePaths(item, found);
  } else if (typeof obj === 'object') {
    for (const val of Object.values(obj)) extractFilePaths(val, found);
  }
  return found;
}

function formatBackup(item: any) {
  if (!item) return item;
  return {
    ...item,
    fileSize: item.fileSize !== null && item.fileSize !== undefined ? Number(item.fileSize) : null,
    tablesIncluded:
      typeof item.tablesIncluded === 'string'
        ? JSON.parse(item.tablesIncluded)
        : item.tablesIncluded || [],
    recordCounts:
      typeof item.recordCounts === 'string'
        ? JSON.parse(item.recordCounts)
        : item.recordCounts || {},
  };
}

export class BackupService {
  /**
   * Create a comprehensive tenant-scoped backup
   */
  static async createTenantBackup(
    tenantId: string,
    triggeredById?: string,
    triggeredByName?: string,
    notes?: string
  ) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        organization: true,
        subscription: true,
        moduleAccess: true,
        settings: true,
      },
    });

    if (!tenant) {
      throw ApiError.notFound(`Tenant with ID ${tenantId} not found`);
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTenantName = tenant.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `backup_${safeTenantName}_${tenantId}_${timestamp}.json`;

    // Create initial Backup record
    const backup = await prisma.backup.create({
      data: {
        tenantId,
        fileName,
        status: 'IN_PROGRESS',
        type: 'MANUAL',
        triggeredBy: triggeredByName || triggeredById || 'SUPER_ADMIN',
        notes: notes || `Manual backup created for tenant: ${tenant.name}`,
        startedAt: new Date(),
      },
    });

    try {
      // 1. Fetch all tenant-scoped data in parallel groups
      const [
        users,
        tenantSettings,
        tenantModuleAccess,
        tenantSubscription,
        planUpgradeRequests,
        representativeProfiles,
      ] = await Promise.all([
        prisma.user.findMany({ where: { tenantId } }),
        prisma.tenantSetting.findMany({ where: { tenantId } }),
        prisma.tenantModuleAccess.findMany({ where: { tenantId } }),
        prisma.tenantSubscription.findMany({ where: { tenantId } }),
        prisma.planUpgradeRequest.findMany({ where: { tenantId } }),
        prisma.representativeProfile.findMany({ where: { tenantId } }),
      ]);

      const userIds = users.map((u) => u.id);
      const userPermissions = userIds.length > 0
        ? await prisma.userPermission.findMany({
            where: { userId: { in: userIds } },
          })
        : [];

      // Geography & Administration
      const [
        constituencies,
        wards,
        wardAreas,
        wardCouncillors,
        constituencyWards,
        districts,
        blocks,
        townVillages,
        pollingLocations,
        booths,
      ] = await Promise.all([
        prisma.constituency.findMany({ where: { tenantId } }),
        prisma.ward.findMany({ where: { tenantId } }),
        prisma.wardArea.findMany({ where: { tenantId } }),
        prisma.wardCouncillor.findMany({ where: { tenantId } }),
        prisma.constituencyWard.findMany({ where: { tenantId } }),
        prisma.district.findMany({ where: { tenantId } }),
        prisma.block.findMany({ where: { tenantId } }),
        prisma.townVillage.findMany({ where: { tenantId } }),
        prisma.pollingLocation.findMany({ where: { tenantId } }),
        prisma.booth.findMany({ where: { tenantId } }),
      ]);

      // Voters & Geography Jobs
      const [
        voters,
        voterFamilyMembers,
        voterIdentityVerifications,
        voterAccountMemberships,
        voterApplicationSequence,
        bulkUploadJobs,
        geographyImportJobs,
      ] = await Promise.all([
        prisma.voter.findMany({ where: { tenantId } }),
        prisma.voterFamilyMember.findMany({ where: { tenantId } }),
        prisma.voterIdentityVerification.findMany({ where: { tenantId } }),
        prisma.voterAccountMembership.findMany({ where: { tenantId } }),
        prisma.voterApplicationSequence.findMany({ where: { tenantId } }),
        prisma.bulkUploadJob.findMany({ where: { tenantId } }),
        prisma.geographyImportJob.findMany({ where: { tenantId } }),
      ]);

      // Grievances & SLAs
      const [
        departmentSLAs,
        grievances,
        grievanceTimelines,
        grievanceAttachments,
      ] = await Promise.all([
        prisma.departmentSLA.findMany({ where: { tenantId } }),
        prisma.grievance.findMany({ where: { tenantId } }),
        prisma.grievanceTimeline.findMany({ where: { tenantId } }),
        prisma.grievanceAttachment.findMany({ where: { tenantId } }),
      ]);

      // Projects & Tasks
      const [
        projects,
        projectMilestones,
        projectUpdates,
        projectAttachments,
        projectTimelines,
        tasks,
        taskTimelines,
      ] = await Promise.all([
        prisma.project.findMany({ where: { tenantId } }),
        prisma.projectMilestone.findMany({ where: { tenantId } }),
        prisma.projectUpdate.findMany({ where: { tenantId } }),
        prisma.projectAttachment.findMany({ where: { tenantId } }),
        prisma.projectTimeline.findMany({ where: { tenantId } }),
        prisma.task.findMany({ where: { tenantId } }),
        prisma.taskTimeline.findMany({ where: { tenantId } }),
      ]);

      // Events & Janata Darbar
      const [
        events,
        eventTeamMembers,
        eventGuests,
        eventAttendances,
        eventMedia,
        eventAgendas,
        eventReports,
        eventTimelines,
        appointments,
        janataSessions,
        janataTokens,
      ] = await Promise.all([
        prisma.event.findMany({ where: { tenantId } }),
        prisma.eventTeamMember.findMany({ where: { tenantId } }),
        prisma.eventGuest.findMany({ where: { tenantId } }),
        prisma.eventAttendance.findMany({ where: { tenantId } }),
        prisma.eventMedia.findMany({ where: { tenantId } }),
        prisma.eventAgenda.findMany({ where: { tenantId } }),
        prisma.eventReport.findMany({ where: { tenantId } }),
        prisma.eventTimeline.findMany({ where: { tenantId } }),
        prisma.appointment.findMany({ where: { tenantId } }),
        prisma.janataDarbarSession.findMany({ where: { tenantId } }),
        prisma.janataDarbarToken.findMany({ where: { tenantId } }),
      ]);

      // Schemes, CRM, Documents
      const [
        schemes,
        schemeApplications,
        schemeApplicationDocuments,
        contacts,
        crmInteractions,
        crmFollowUps,
        documents,
        documentLinks,
        correspondences,
        correspondenceDocuments,
        correspondenceTimelines,
      ] = await Promise.all([
        prisma.scheme.findMany({ where: { tenantId } }),
        prisma.schemeApplication.findMany({ where: { tenantId } }),
        prisma.schemeApplicationDocument.findMany({ where: { tenantId } }),
        prisma.contact.findMany({ where: { tenantId } }),
        prisma.cRMInteraction.findMany({ where: { tenantId } }),
        prisma.cRMFollowUp.findMany({ where: { tenantId } }),
        prisma.document.findMany({ where: { tenantId } }),
        prisma.documentLink.findMany({ where: { tenantId } }),
        prisma.correspondence.findMany({ where: { tenantId } }),
        prisma.correspondenceDocument.findMany({ where: { tenantId } }),
        prisma.correspondenceTimeline.findMany({ where: { tenantId } }),
      ]);

      const documentIds = documents.map((d) => d.id);
      const documentVersions = documentIds.length > 0
        ? await prisma.documentVersion.findMany({
            where: { documentId: { in: documentIds } },
          })
        : [];

      // Finance, Institutions, Leaders, Community, Competitors, Logs
      const [
        funds,
        fundTransactions,
        payments,
        departments,
        institutions,
        incharges,
        institutionRequests,
        leaders,
        leaderGreetings,
        communityGroups,
        demographics,
        competitors,
        competitorMetricEntries,
        competitorAnalyses,
        competitorChats,
        ownMetrics,
        meetings,
        notifications,
        auditLogs,
        recycleBinEntries,
        dataActivities,
      ] = await Promise.all([
        prisma.fund.findMany({ where: { tenantId } }),
        prisma.fundTransaction.findMany({ where: { tenantId } }),
        prisma.payment.findMany({ where: { tenantId } }),
        prisma.department.findMany({ where: { tenantId } }),
        prisma.institution.findMany({ where: { tenantId } }),
        prisma.incharge.findMany({ where: { tenantId } }),
        prisma.institutionRequest.findMany({ where: { tenantId } }),
        prisma.leader.findMany({ where: { tenantId } }),
        prisma.leaderGreeting.findMany({ where: { tenantId } }),
        prisma.communityGroup.findMany({ where: { tenantId } }),
        prisma.demographics.findMany({ where: { tenantId } }),
        prisma.competitor.findMany({ where: { tenantId } }),
        prisma.competitorMetricEntry.findMany({ where: { tenantId } }),
        prisma.competitorAnalysis.findMany({ where: { tenantId } }),
        prisma.competitorChat.findMany({ where: { tenantId } }),
        prisma.ownMetricEntry.findMany({ where: { tenantId } }),
        prisma.meeting.findMany({ where: { tenantId } }),
        prisma.notification.findMany({ where: { tenantId } }),
        prisma.auditLog.findMany({ where: { tenantId } }),
        prisma.recycleBinEntry.findMany({ where: { tenantId } }),
        prisma.dataActivity.findMany({ where: { tenantId } }),
      ]);

      // Compile tables data map
      const tablesData: Record<string, any[]> = {
        users,
        userPermissions,
        tenantSettings,
        tenantModuleAccess,
        tenantSubscription,
        planUpgradeRequests,
        representativeProfiles,
        constituencies,
        wards,
        wardAreas,
        wardCouncillors,
        constituencyWards,
        districts,
        blocks,
        townVillages,
        pollingLocations,
        booths,
        voters,
        voterFamilyMembers,
        voterIdentityVerifications,
        voterAccountMemberships,
        voterApplicationSequence,
        bulkUploadJobs,
        geographyImportJobs,
        departmentSLAs,
        grievances,
        grievanceTimelines,
        grievanceAttachments,
        projects,
        projectMilestones,
        projectUpdates,
        projectAttachments,
        projectTimelines,
        tasks,
        taskTimelines,
        events,
        eventTeamMembers,
        eventGuests,
        eventAttendances,
        eventMedia,
        eventAgendas,
        eventReports,
        eventTimelines,
        appointments,
        janataSessions,
        janataTokens,
        schemes,
        schemeApplications,
        schemeApplicationDocuments,
        contacts,
        crmInteractions,
        crmFollowUps,
        documents,
        documentVersions,
        documentLinks,
        correspondences,
        correspondenceDocuments,
        correspondenceTimelines,
        funds,
        fundTransactions,
        payments,
        departments,
        institutions,
        incharges,
        institutionRequests,
        leaders,
        leaderGreetings,
        communityGroups,
        demographics,
        competitors,
        competitorMetricEntries,
        competitorAnalyses,
        competitorChats,
        ownMetrics,
        meetings,
        notifications,
        auditLogs,
        recycleBinEntries,
        dataActivities,
      };

      // Record counts per table
      const recordCounts: Record<string, number> = {};
      for (const [key, rows] of Object.entries(tablesData)) {
        recordCounts[key] = rows.length;
      }

      // Collect referenced file paths
      const referencedFiles = Array.from(extractFilePaths(tablesData));

      // Backup bundle structure
      const backupBundle = {
        metadata: {
          version: '1.0',
          backupId: backup.id,
          tenantId: tenant.id,
          tenantName: tenant.name,
          constituencyName: tenant.constituencyName,
          state: tenant.state,
          district: tenant.district,
          createdAt: new Date().toISOString(),
          triggeredBy: backup.triggeredBy,
          totalTables: Object.keys(tablesData).length,
          totalRecords: Object.values(recordCounts).reduce((a, b) => a + b, 0),
        },
        tenantConfig: {
          organization: tenant.organization,
          status: tenant.status,
          storageUsedMB: tenant.storageUsedMB,
          address: tenant.address,
          phone: tenant.phone,
          email: tenant.email,
          website: tenant.website,
          logoUrl: tenant.logoUrl,
          faviconUrl: tenant.faviconUrl,
          primaryColor: tenant.primaryColor,
          secondaryColor: tenant.secondaryColor,
          representativeName: tenant.representativeName,
          representativeTitle: tenant.representativeTitle,
          representativePhoto: tenant.representativePhoto,
          partyName: tenant.partyName,
          partyLogoUrl: tenant.partyLogoUrl,
          termStartDate: tenant.termStartDate,
          termEndDate: tenant.termEndDate,
        },
        data: tablesData,
        referencedFiles,
      };

      // 2. Write backup JSON to disk
      const tenantBackupDir = path.join(BACKUPS_ROOT, tenantId);
      ensureDir(tenantBackupDir);

      const backupFilePath = path.join(tenantBackupDir, fileName);
      const serializedContent = JSON.stringify(serializeSafe(backupBundle), null, 2);
      fs.writeFileSync(backupFilePath, serializedContent, 'utf-8');

      const stats = fs.statSync(backupFilePath);
      const fileSize = BigInt(stats.size);
      const fileUrl = `/uploads/backups/${tenantId}/${fileName}`;

      // 3. Snapshot tenant files into a subfolder
      const filesSnapshotDir = path.join(tenantBackupDir, `${backup.id}_files`);
      let copiedFilesCount = 0;

      for (const relPath of referencedFiles) {
        try {
          const srcFilePath = path.resolve(process.cwd(), 'public', relPath);
          if (fs.existsSync(srcFilePath) && fs.statSync(srcFilePath).isFile()) {
            const destFilePath = path.join(filesSnapshotDir, relPath);
            ensureDir(path.dirname(destFilePath));
            fs.copyFileSync(srcFilePath, destFilePath);
            copiedFilesCount++;
          }
        } catch (copyErr) {
          logger.warn(`Failed to snapshot backup file ${relPath}:`, copyErr);
        }
      }

      // 4. Update Backup record to COMPLETED
      const updatedBackup = await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: 'COMPLETED',
          fileSize,
          fileUrl,
          tablesIncluded: JSON.stringify(Object.keys(tablesData)),
          recordCounts: JSON.stringify(recordCounts),
          completedAt: new Date(),
          notes: notes
            ? `${notes} (Snapshot: ${copiedFilesCount} files included)`
            : `Backup completed successfully (${copiedFilesCount} files included)`,
        },
      });

      logger.info(`Backup ${backup.id} created successfully for tenant ${tenantId}`);
      return formatBackup(updatedBackup);
    } catch (err: any) {
      logger.error(`Error creating backup for tenant ${tenantId}:`, err);
      await prisma.backup.update({
        where: { id: backup.id },
        data: {
          status: 'FAILED',
          errorMessage: err.message || 'Unknown backup error',
          completedAt: new Date(),
        },
      });
      throw ApiError.internal(`Backup failed: ${err.message || 'Unknown error'}`);
    }
  }

  /**
   * Restore a tenant from a backup file snapshot
   */
  static async restoreTenantBackup(
    backupId: string,
    restoredById?: string,
    restoredByName?: string
  ) {
    const backup = await prisma.backup.findUnique({
      where: { id: backupId },
      include: { tenant: true },
    });

    if (!backup) {
      throw ApiError.notFound(`Backup with ID ${backupId} not found`);
    }

    if (backup.status !== 'COMPLETED') {
      throw ApiError.badRequest(
        `Cannot restore backup with status '${backup.status}'. Only COMPLETED backups can be restored.`
      );
    }

    if (!backup.tenantId) {
      throw ApiError.badRequest('Backup is not associated with any tenant ID');
    }

    const tenantId = backup.tenantId;
    const backupFilePath = path.join(BACKUPS_ROOT, tenantId, backup.fileName);

    if (!fs.existsSync(backupFilePath)) {
      throw ApiError.notFound(
        `Backup file on disk (${backup.fileName}) was not found at ${backupFilePath}`
      );
    }

    // Read and parse backup bundle
    let bundle: any;
    try {
      const raw = fs.readFileSync(backupFilePath, 'utf-8');
      bundle = deserializeDates(JSON.parse(raw));
    } catch (err: any) {
      throw ApiError.badRequest(`Failed to read or parse backup JSON file: ${err.message}`);
    }

    if (!bundle || !bundle.data) {
      throw ApiError.badRequest('Invalid backup format: data payload is missing');
    }

    const data = bundle.data;

    logger.info(`Starting atomic restore for tenant ${tenantId} from backup ${backupId}...`);

    // Execute in a single atomic transaction with extended timeout (2 minutes)
    await prisma.$transaction(
      async (tx) => {
        // ── STEP 1: DELETE EXISTING DATA (Reverse dependency order) ──
        const userIds = (await tx.user.findMany({ where: { tenantId }, select: { id: true } })).map((u) => u.id);
        const docIds = (await tx.document.findMany({ where: { tenantId }, select: { id: true } })).map((d) => d.id);

        if (userIds.length > 0) {
          await tx.userPermission.deleteMany({ where: { userId: { in: userIds } } });
        }
        if (docIds.length > 0) {
          await tx.documentVersion.deleteMany({ where: { documentId: { in: docIds } } });
        }

        await tx.recycleBinEntry.deleteMany({ where: { tenantId } });
        await tx.auditLog.deleteMany({ where: { tenantId } });
        await tx.notification.deleteMany({ where: { tenantId } });
        await tx.dataActivity.deleteMany({ where: { tenantId } });

        await tx.documentLink.deleteMany({ where: { tenantId } });
        await tx.correspondenceDocument.deleteMany({ where: { tenantId } });
        await tx.correspondenceTimeline.deleteMany({ where: { tenantId } });
        await tx.correspondence.deleteMany({ where: { tenantId } });
        await tx.document.deleteMany({ where: { tenantId } });

        await tx.schemeApplicationDocument.deleteMany({ where: { tenantId } });
        await tx.schemeApplication.deleteMany({ where: { tenantId } });
        await tx.scheme.deleteMany({ where: { tenantId } });

        await tx.projectAttachment.deleteMany({ where: { tenantId } });
        await tx.projectUpdate.deleteMany({ where: { tenantId } });
        await tx.projectMilestone.deleteMany({ where: { tenantId } });
        await tx.projectTimeline.deleteMany({ where: { tenantId } });
        await tx.project.deleteMany({ where: { tenantId } });

        await tx.taskTimeline.deleteMany({ where: { tenantId } });
        await tx.task.deleteMany({ where: { tenantId } });

        await tx.grievanceAttachment.deleteMany({ where: { tenantId } });
        await tx.grievanceTimeline.deleteMany({ where: { tenantId } });
        await tx.grievance.deleteMany({ where: { tenantId } });
        await tx.departmentSLA.deleteMany({ where: { tenantId } });

        await tx.eventMedia.deleteMany({ where: { tenantId } });
        await tx.eventAgenda.deleteMany({ where: { tenantId } });
        await tx.eventReport.deleteMany({ where: { tenantId } });
        await tx.eventAttendance.deleteMany({ where: { tenantId } });
        await tx.eventGuest.deleteMany({ where: { tenantId } });
        await tx.eventTeamMember.deleteMany({ where: { tenantId } });
        await tx.eventTimeline.deleteMany({ where: { tenantId } });
        await tx.event.deleteMany({ where: { tenantId } });

        await tx.janataDarbarToken.deleteMany({ where: { tenantId } });
        await tx.janataDarbarSession.deleteMany({ where: { tenantId } });
        await tx.appointment.deleteMany({ where: { tenantId } });

        await tx.cRMFollowUp.deleteMany({ where: { tenantId } });
        await tx.cRMInteraction.deleteMany({ where: { tenantId } });
        await tx.contact.deleteMany({ where: { tenantId } });

        await tx.leaderGreeting.deleteMany({ where: { tenantId } });
        await tx.leader.deleteMany({ where: { tenantId } });

        await tx.institutionRequest.deleteMany({ where: { tenantId } });
        await tx.incharge.deleteMany({ where: { tenantId } });
        await tx.institution.deleteMany({ where: { tenantId } });

        await tx.communityGroup.deleteMany({ where: { tenantId } });
        await tx.demographics.deleteMany({ where: { tenantId } });

        await tx.fundTransaction.deleteMany({ where: { tenantId } });
        await tx.fund.deleteMany({ where: { tenantId } });
        await tx.payment.deleteMany({ where: { tenantId } });

        await tx.competitorChat.deleteMany({ where: { tenantId } });
        await tx.competitorAnalysis.deleteMany({ where: { tenantId } });
        await tx.competitorMetricEntry.deleteMany({ where: { tenantId } });
        await tx.competitor.deleteMany({ where: { tenantId } });
        await tx.ownMetricEntry.deleteMany({ where: { tenantId } });

        await tx.meeting.deleteMany({ where: { tenantId } });

        await tx.voterFamilyMember.deleteMany({ where: { tenantId } });
        await tx.voterIdentityVerification.deleteMany({ where: { tenantId } });
        await tx.voterAccountMembership.deleteMany({ where: { tenantId } });
        await tx.voterApplicationSequence.deleteMany({ where: { tenantId } });
        await tx.bulkUploadJob.deleteMany({ where: { tenantId } });
        await tx.geographyImportJob.deleteMany({ where: { tenantId } });
        await tx.voter.deleteMany({ where: { tenantId } });

        await tx.booth.deleteMany({ where: { tenantId } });
        await tx.pollingLocation.deleteMany({ where: { tenantId } });
        await tx.townVillage.deleteMany({ where: { tenantId } });
        await tx.block.deleteMany({ where: { tenantId } });
        await tx.district.deleteMany({ where: { tenantId } });
        await tx.constituencyWard.deleteMany({ where: { tenantId } });
        await tx.wardCouncillor.deleteMany({ where: { tenantId } });
        await tx.wardArea.deleteMany({ where: { tenantId } });
        await tx.ward.deleteMany({ where: { tenantId } });
        await tx.representativeProfile.deleteMany({ where: { tenantId } });
        await tx.constituency.deleteMany({ where: { tenantId } });

        await tx.tenantSetting.deleteMany({ where: { tenantId } });
        await tx.tenantModuleAccess.deleteMany({ where: { tenantId } });
        await tx.planUpgradeRequest.deleteMany({ where: { tenantId } });
        await tx.tenantSubscription.deleteMany({ where: { tenantId } });

        await tx.user.deleteMany({ where: { tenantId } });
        await tx.department.deleteMany({ where: { tenantId } });

        // ── STEP 2: RESTORE TENANT CONFIGURATION ──
        if (bundle.tenantConfig) {
          const { organization, ...tConfig } = bundle.tenantConfig;
          await tx.tenant.update({
            where: { id: tenantId },
            data: {
              ...tConfig,
            },
          });

          if (organization) {
            await tx.organization.upsert({
              where: { tenantId },
              update: { ...organization },
              create: { ...organization, tenantId },
            });
          }
        }

        // ── STEP 3: INSERT RESTORED RECORDS (Forward dependency order) ──
        if (data.departments?.length) await tx.department.createMany({ data: data.departments });
        if (data.users?.length) await tx.user.createMany({ data: data.users });
        if (data.userPermissions?.length) await tx.userPermission.createMany({ data: data.userPermissions });

        if (data.tenantSettings?.length) await tx.tenantSetting.createMany({ data: data.tenantSettings });
        if (data.tenantModuleAccess?.length) await tx.tenantModuleAccess.createMany({ data: data.tenantModuleAccess });
        if (data.tenantSubscription?.length) await tx.tenantSubscription.createMany({ data: data.tenantSubscription });
        if (data.planUpgradeRequests?.length) await tx.planUpgradeRequest.createMany({ data: data.planUpgradeRequests });

        if (data.constituencies?.length) await tx.constituency.createMany({ data: data.constituencies });
        if (data.representativeProfiles?.length) await tx.representativeProfile.createMany({ data: data.representativeProfiles });
        if (data.districts?.length) await tx.district.createMany({ data: data.districts });
        if (data.blocks?.length) await tx.block.createMany({ data: data.blocks });
        if (data.wards?.length) await tx.ward.createMany({ data: data.wards });
        if (data.wardAreas?.length) await tx.wardArea.createMany({ data: data.wardAreas });
        if (data.wardCouncillors?.length) await tx.wardCouncillor.createMany({ data: data.wardCouncillors });
        if (data.constituencyWards?.length) await tx.constituencyWard.createMany({ data: data.constituencyWards });
        if (data.townVillages?.length) await tx.townVillage.createMany({ data: data.townVillages });
        if (data.pollingLocations?.length) await tx.pollingLocation.createMany({ data: data.pollingLocations });
        if (data.booths?.length) await tx.booth.createMany({ data: data.booths });

        if (data.voters?.length) await tx.voter.createMany({ data: data.voters });
        if (data.voterFamilyMembers?.length) await tx.voterFamilyMember.createMany({ data: data.voterFamilyMembers });
        if (data.voterIdentityVerifications?.length) await tx.voterIdentityVerification.createMany({ data: data.voterIdentityVerifications });
        if (data.voterAccountMemberships?.length) await tx.voterAccountMembership.createMany({ data: data.voterAccountMemberships });
        if (data.voterApplicationSequence?.length) await tx.voterApplicationSequence.createMany({ data: data.voterApplicationSequence });
        if (data.bulkUploadJobs?.length) await tx.bulkUploadJob.createMany({ data: data.bulkUploadJobs });
        if (data.geographyImportJobs?.length) await tx.geographyImportJob.createMany({ data: data.geographyImportJobs });

        if (data.meetings?.length) await tx.meeting.createMany({ data: data.meetings });
        if (data.competitors?.length) await tx.competitor.createMany({ data: data.competitors });
        if (data.competitorMetricEntries?.length) await tx.competitorMetricEntry.createMany({ data: data.competitorMetricEntries });
        if (data.competitorAnalyses?.length) await tx.competitorAnalysis.createMany({ data: data.competitorAnalyses });
        if (data.competitorChats?.length) await tx.competitorChat.createMany({ data: data.competitorChats });
        if (data.ownMetrics?.length) await tx.ownMetricEntry.createMany({ data: data.ownMetrics });

        if (data.funds?.length) await tx.fund.createMany({ data: data.funds });
        if (data.fundTransactions?.length) await tx.fundTransaction.createMany({ data: data.fundTransactions });
        if (data.payments?.length) await tx.payment.createMany({ data: data.payments });

        if (data.communityGroups?.length) await tx.communityGroup.createMany({ data: data.communityGroups });
        if (data.demographics?.length) await tx.demographics.createMany({ data: data.demographics });

        if (data.institutions?.length) await tx.institution.createMany({ data: data.institutions });
        if (data.incharges?.length) await tx.incharge.createMany({ data: data.incharges });
        if (data.institutionRequests?.length) await tx.institutionRequest.createMany({ data: data.institutionRequests });

        if (data.leaders?.length) await tx.leader.createMany({ data: data.leaders });
        if (data.leaderGreetings?.length) await tx.leaderGreeting.createMany({ data: data.leaderGreetings });

        if (data.contacts?.length) await tx.contact.createMany({ data: data.contacts });
        if (data.crmInteractions?.length) await tx.cRMInteraction.createMany({ data: data.crmInteractions });
        if (data.crmFollowUps?.length) await tx.cRMFollowUp.createMany({ data: data.crmFollowUps });

        if (data.appointments?.length) await tx.appointment.createMany({ data: data.appointments });
        if (data.janataSessions?.length) await tx.janataDarbarSession.createMany({ data: data.janataSessions });
        if (data.janataTokens?.length) await tx.janataDarbarToken.createMany({ data: data.janataTokens });

        if (data.events?.length) await tx.event.createMany({ data: data.events });
        if (data.eventTimelines?.length) await tx.eventTimeline.createMany({ data: data.eventTimelines });
        if (data.eventTeamMembers?.length) await tx.eventTeamMember.createMany({ data: data.eventTeamMembers });
        if (data.eventGuests?.length) await tx.eventGuest.createMany({ data: data.eventGuests });
        if (data.eventAttendances?.length) await tx.eventAttendance.createMany({ data: data.eventAttendances });
        if (data.eventMedia?.length) await tx.eventMedia.createMany({ data: data.eventMedia });
        if (data.eventAgendas?.length) await tx.eventAgenda.createMany({ data: data.eventAgendas });
        if (data.eventReports?.length) await tx.eventReport.createMany({ data: data.eventReports });

        if (data.departmentSLAs?.length) await tx.departmentSLA.createMany({ data: data.departmentSLAs });
        if (data.grievances?.length) await tx.grievance.createMany({ data: data.grievances });
        if (data.grievanceTimelines?.length) await tx.grievanceTimeline.createMany({ data: data.grievanceTimelines });
        if (data.grievanceAttachments?.length) await tx.grievanceAttachment.createMany({ data: data.grievanceAttachments });

        if (data.tasks?.length) await tx.task.createMany({ data: data.tasks });
        if (data.taskTimelines?.length) await tx.taskTimeline.createMany({ data: data.taskTimelines });

        if (data.projects?.length) await tx.project.createMany({ data: data.projects });
        if (data.projectTimelines?.length) await tx.projectTimeline.createMany({ data: data.projectTimelines });
        if (data.projectMilestones?.length) await tx.projectMilestone.createMany({ data: data.projectMilestones });
        if (data.projectUpdates?.length) await tx.projectUpdate.createMany({ data: data.projectUpdates });
        if (data.projectAttachments?.length) await tx.projectAttachment.createMany({ data: data.projectAttachments });

        if (data.schemes?.length) await tx.scheme.createMany({ data: data.schemes });
        if (data.schemeApplications?.length) await tx.schemeApplication.createMany({ data: data.schemeApplications });
        if (data.schemeApplicationDocuments?.length) await tx.schemeApplicationDocument.createMany({ data: data.schemeApplicationDocuments });

        if (data.documents?.length) await tx.document.createMany({ data: data.documents });
        if (data.documentVersions?.length) await tx.documentVersion.createMany({ data: data.documentVersions });
        if (data.documentLinks?.length) await tx.documentLink.createMany({ data: data.documentLinks });

        if (data.correspondences?.length) await tx.correspondence.createMany({ data: data.correspondences });
        if (data.correspondenceDocuments?.length) await tx.correspondenceDocument.createMany({ data: data.correspondenceDocuments });
        if (data.correspondenceTimelines?.length) await tx.correspondenceTimeline.createMany({ data: data.correspondenceTimelines });

        if (data.notifications?.length) await tx.notification.createMany({ data: data.notifications });
        if (data.auditLogs?.length) await tx.auditLog.createMany({ data: data.auditLogs });
        if (data.recycleBinEntries?.length) await tx.recycleBinEntry.createMany({ data: data.recycleBinEntries });
        if (data.dataActivities?.length) await tx.dataActivity.createMany({ data: data.dataActivities });
      },
      {
        maxWait: 10000,
        timeout: 120000,
      }
    );

    // ── STEP 4: RESTORE FILES SNAPSHOT ──
    const filesSnapshotDir = path.join(BACKUPS_ROOT, tenantId, `${backup.id}_files`);
    let restoredFilesCount = 0;

    if (fs.existsSync(filesSnapshotDir)) {
      const copyRecursive = (srcDir: string, destDir: string) => {
        const entries = fs.readdirSync(srcDir, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(srcDir, entry.name);
          const destPath = path.join(destDir, entry.name);
          if (entry.isDirectory()) {
            ensureDir(destPath);
            copyRecursive(srcPath, destPath);
          } else if (entry.isFile()) {
            ensureDir(path.dirname(destPath));
            fs.copyFileSync(srcPath, destPath);
            restoredFilesCount++;
          }
        }
      };

      try {
        copyRecursive(filesSnapshotDir, path.resolve(process.cwd(), 'public'));
      } catch (fileErr) {
        logger.warn(`Warning: some snapshot files failed to restore:`, fileErr);
      }
    }

    // ── STEP 5: RECALCULATE STORAGE USED MB ──
    let totalBytes = 0;
    try {
      const tenantUploadDir = path.join(UPLOADS_ROOT, 'documents');
      // Calculate total storage from document file sizes or referenced files
      const referencedFiles: string[] = bundle.referencedFiles || [];
      for (const relPath of referencedFiles) {
        const fullP = path.resolve(process.cwd(), 'public', relPath);
        if (fs.existsSync(fullP) && fs.statSync(fullP).isFile()) {
          totalBytes += fs.statSync(fullP).size;
        }
      }
      const recalculatedMB = Math.round((totalBytes / (1024 * 1024)) * 100) / 100;
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { storageUsedMB: recalculatedMB },
      });
    } catch (e) {
      logger.warn('Failed to calculate storage used during restore:', e);
    }

    // ── STEP 6: UPDATE BACKUP RECORD ──
    const updatedBackup = await prisma.backup.update({
      where: { id: backup.id },
      data: {
        restoredAt: new Date(),
        restoredBy: restoredByName || restoredById || 'SUPER_ADMIN',
      },
    });

    logger.info(`Backup ${backupId} successfully restored for tenant ${tenantId}`);
    return {
      backup: formatBackup(updatedBackup),
      restoredFilesCount,
      totalRecordsRestored: bundle.metadata?.totalRecords || 0,
    };
  }

  /**
   * List backups with optional filters and pagination
   */
  static async listBackups(params: {
    tenantId?: string;
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.tenantId) {
      where.tenantId = params.tenantId;
    }
    if (params.status) {
      where.status = params.status;
    }
    if (params.search) {
      where.OR = [
        { fileName: { contains: params.search, mode: 'insensitive' } },
        { notes: { contains: params.search, mode: 'insensitive' } },
        { triggeredBy: { contains: params.search, mode: 'insensitive' } },
        { tenant: { name: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.backup.count({ where }),
      prisma.backup.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              constituencyName: true,
              state: true,
              district: true,
              logoUrl: true,
              storageUsedMB: true,
            },
          },
        },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const formattedItems = items.map(formatBackup);

    return {
      items: formattedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single backup details
   */
  static async getBackupById(backupId: string) {
    const backup = await prisma.backup.findUnique({
      where: { id: backupId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            constituencyName: true,
            state: true,
            district: true,
            logoUrl: true,
            storageUsedMB: true,
          },
        },
      },
    });

    if (!backup) {
      throw ApiError.notFound(`Backup with ID ${backupId} not found`);
    }

    return formatBackup(backup);
  }

  /**
   * Delete a backup and its associated files on disk
   */
  static async deleteBackup(backupId: string) {
    const backup = await prisma.backup.findUnique({
      where: { id: backupId },
    });

    if (!backup) {
      throw ApiError.notFound(`Backup with ID ${backupId} not found`);
    }

    if (backup.tenantId && backup.fileName) {
      const backupDir = path.join(BACKUPS_ROOT, backup.tenantId);
      const filePath = path.join(backupDir, backup.fileName);
      const snapshotDir = path.join(backupDir, `${backup.id}_files`);

      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          logger.warn(`Could not delete backup file ${filePath}:`, e);
        }
      }

      if (fs.existsSync(snapshotDir)) {
        try {
          fs.rmSync(snapshotDir, { recursive: true, force: true });
        } catch (e) {
          logger.warn(`Could not delete snapshot folder ${snapshotDir}:`, e);
        }
      }
    }

    await prisma.backup.delete({
      where: { id: backupId },
    });

    return { success: true, message: 'Backup and files deleted successfully' };
  }

  /**
   * Get absolute path for file download
   */
  static getDownloadPath(backup: { tenantId?: string | null; fileName: string }) {
    if (!backup.tenantId || !backup.fileName) {
      throw ApiError.badRequest('Backup has missing tenant or filename details');
    }

    const filePath = path.join(BACKUPS_ROOT, backup.tenantId, backup.fileName);
    if (!fs.existsSync(filePath)) {
      throw ApiError.notFound('Backup file not found on disk');
    }

    return filePath;
  }
}
