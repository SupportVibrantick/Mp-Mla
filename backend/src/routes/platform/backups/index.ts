import { Router } from 'express';
import {
  authenticatePlatform,
  requireActivePlatformUser,
  authorizePlatform,
} from '../../../middleware/platformAuth.js';
import { validate, validateQuery } from '../../../middleware/validate.js';
import {
  createTenantBackupSchema,
  restoreTenantBackupSchema,
  listBackupsQuerySchema,
} from '../../../schemas/platform/backups/index.js';
import {
  createBackup,
  listBackups,
  getBackupById,
  restoreBackup,
  deleteBackup,
  downloadBackup,
} from '../../../controllers/platform/backups.controller.js';

const router = Router();
const readRoles = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'SUPPORT_STAFF', 'BILLING_MANAGER'] as const;
const superAdminOnly = ['SUPER_ADMIN'] as const;

router.use(authenticatePlatform, requireActivePlatformUser);

// List all backups
router.get(
  '/',
  authorizePlatform(...readRoles),
  validateQuery(listBackupsQuerySchema),
  listBackups
);

// Get single backup
router.get(
  '/:id',
  authorizePlatform(...readRoles),
  getBackupById
);

// Download backup JSON file
router.get(
  '/:id/download',
  authorizePlatform(...readRoles),
  downloadBackup
);

// Create backup for a tenant
router.post(
  '/',
  authorizePlatform(...superAdminOnly),
  validate(createTenantBackupSchema),
  createBackup
);

// Restore tenant data from backup
router.post(
  '/:id/restore',
  authorizePlatform(...superAdminOnly),
  validate(restoreTenantBackupSchema),
  restoreBackup
);

// Delete backup
router.delete(
  '/:id',
  authorizePlatform(...superAdminOnly),
  deleteBackup
);

export default router;
