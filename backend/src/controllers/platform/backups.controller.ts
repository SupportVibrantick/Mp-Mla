import { Request, Response, NextFunction } from 'express';
import { BackupService } from '../../services/backup.service.js';
import ApiResponse from '../../utils/ApiResponse.js';
import { ApiError } from '../../utils/ApiError.js';

export async function createBackup(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, notes } = req.body;
    const platformUser = (req as any).platformUser;

    const backup = await BackupService.createTenantBackup(
      tenantId,
      platformUser?.id,
      platformUser?.name,
      notes
    );

    res.status(201).json(ApiResponse.created(backup, 'Backup created successfully'));
  } catch (error) {
    next(error);
  }
}

export async function listBackups(req: Request, res: Response, next: NextFunction) {
  try {
    const { tenantId, status, page, limit, search } = req.query as any;

    const result = await BackupService.listBackups({
      tenantId,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
    });

    res.json(ApiResponse.success(result, 'Backups retrieved successfully'));
  } catch (error) {
    next(error);
  }
}

export async function getBackupById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const backup = await BackupService.getBackupById(id);
    res.json(ApiResponse.success(backup, 'Backup retrieved successfully'));
  } catch (error) {
    next(error);
  }
}

export async function restoreBackup(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const { confirmRestore } = req.body;
    const platformUser = (req as any).platformUser;

    if (!confirmRestore) {
      throw ApiError.badRequest('Explicit confirmation is required to restore a backup');
    }

    const result = await BackupService.restoreTenantBackup(
      id,
      platformUser?.id,
      platformUser?.name
    );

    res.json(ApiResponse.success(result, 'Tenant data restored successfully from backup'));
  } catch (error) {
    next(error);
  }
}

export async function deleteBackup(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const result = await BackupService.deleteBackup(id);
    res.json(ApiResponse.success(result, 'Backup deleted successfully'));
  } catch (error) {
    next(error);
  }
}

export async function downloadBackup(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const backup = await BackupService.getBackupById(id);
    const filePath = BackupService.getDownloadPath(backup);

    res.download(filePath, backup.fileName, (err) => {
      if (err && !res.headersSent) {
        next(ApiError.internal('Failed to download backup file'));
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function triggerTenantBackup(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = req.params.id as string;
    const { notes } = req.body;
    const platformUser = (req as any).platformUser;

    const backup = await BackupService.createTenantBackup(
      tenantId,
      platformUser?.id,
      platformUser?.name,
      notes
    );

    res.status(201).json(ApiResponse.created(backup, 'Tenant backup initiated and completed'));
  } catch (error) {
    next(error);
  }
}
