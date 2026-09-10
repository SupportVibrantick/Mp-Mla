import { z } from 'zod';

export const createTenantBackupSchema = z.object({
  tenantId: z.string({
    required_error: 'Tenant ID is required',
  }).min(1, 'Tenant ID cannot be empty'),
  notes: z.string().optional(),
});

export const restoreTenantBackupSchema = z.object({
  confirmRestore: z.boolean({
    required_error: 'confirmRestore must be explicitly set to true',
  }).refine((val) => val === true, {
    message: 'confirmRestore must be true to proceed with restoration',
  }),
});

export const listBackupsQuerySchema = z.object({
  tenantId: z.string().optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'FAILED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type CreateTenantBackupInput = z.infer<typeof createTenantBackupSchema>;
export type RestoreTenantBackupInput = z.infer<typeof restoreTenantBackupSchema>;
export type ListBackupsQuery = z.infer<typeof listBackupsQuerySchema>;
