import { Request, Response } from "express";
import * as importService from "../../../services/geographyImport.service.js";
import catchAsync from "../../../utils/catchAsync.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { requireTenantId } from "../../../utils/tenant.js";
import { createAuditLog, getRequestMeta } from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

export const uploadImportData = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const { type, rows, fileName } = req.body;

  if (!type || !Array.isArray(rows) || rows.length === 0) {
    throw ApiError.badRequest("Invalid request body. 'type' and a non-empty 'rows' array are required.");
  }

  const job = await importService.createImportJob(
    tenantId,
    type,
    fileName || "import_data",
    rows.length,
    req.user?.id,
    req.user?.name
  );

  // Kick off async background validation
  await importService.startValidationJob(job.id, tenantId, type, rows);

  await createAuditLog({
    userId: req.user!.id,
    tenantId,
    action: "CREATE",
    module: "geography-import",
    recordId: job.id,
    description: `Initiated geographic import job for type "${type}" (${rows.length} rows)`,
    ...getRequestMeta(req),
  });

  res.status(201).json(ApiResponse.created({
    jobId: job.id,
    status: job.status,
    totalRows: job.totalRows,
  }, "Geography import file uploaded and validation started in background."));
});

export const getImportStatus = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const id = req.params.id as string;

  const job = await importService.getImportJob(tenantId, id);

  res.json(ApiResponse.success({
    id: job.id,
    status: job.status,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    successCount: job.successCount,
    failedCount: job.failedCount,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    uploadedByName: job.uploadedByName,
    summary: job.summary,
  }, "Geography import status fetched successfully."));
});

export const getImportErrors = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const id = req.params.id as string;

  const job = await importService.getImportJob(tenantId, id);

  res.json(ApiResponse.success(job.errors, "Geography import errors fetched successfully."));
});

export const confirmImport = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const id = req.params.id as string;

  const job = await importService.getImportJob(tenantId, id);

  // Trigger background import execution
  await importService.startImportExecution(job.id, tenantId);

  await createAuditLog({
    userId: req.user!.id,
    tenantId,
    action: "IMPORT",
    module: "geography-import",
    recordId: job.id,
    description: `Confirmed import execution for job ID ${job.id}`,
    ...getRequestMeta(req),
  });

  res.json(ApiResponse.success({
    jobId: job.id,
    status: "IMPORTING",
  }, "Geography import execution started in background."));
});
