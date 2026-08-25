import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import * as constituencyController from "../../../controllers/admin/constituency/constituency.controller.js";
import * as representativeController from "../../../controllers/admin/constituency/representative.controller.js";
import * as geographyController from "../../../controllers/admin/constituency/geography.controller.js";
import * as importController from "../../../controllers/admin/constituency/geographyImport.controller.js";
import * as schemas from "../../../schemas/admin/constituency/constituency.schema.js";
import {
  createImageUploader,
  enforceStorageAndTrack,
} from "../../../lib/upload.js";

const router = Router();
const representativeUploader = createImageUploader("attachments");

// ─── CONSTITUENCIES ───
router.get(
  "/constituencies",
  requirePermission("constituency", "read"),
  geographyController.getTree,
);
router.post(
  "/constituencies",
  requirePermission("constituency", "create"),
  validate(schemas.createConstituencySchema),
  constituencyController.createConstituency,
);
router.get(
  "/constituencies/list",
  requirePermission("constituency", "read"),
  constituencyController.listConstituencies,
);
router.get(
  "/constituencies/:id",
  requirePermission("constituency", "read"),
  constituencyController.getConstituency,
);
router.patch(
  "/constituencies/:id",
  requirePermission("constituency", "update"),
  validate(schemas.updateConstituencySchema),
  constituencyController.updateConstituency,
);
router.delete(
  "/constituencies/:id",
  requirePermission("constituency", "delete"),
  constituencyController.deleteConstituency,
);
router.patch(
  "/constituencies/:id/toggle",
  requirePermission("constituency", "update"),
  constituencyController.toggleConstituency,
);
router.post(
  "/constituencies/:id/restore",
  requirePermission("constituency", "create"),
  constituencyController.restoreConstituency,
);

router.get(
  "/constituencies/:id/wards",
  requirePermission("constituency", "read"),
  constituencyController.getConstituencyWards,
);
router.post(
  "/constituencies/:id/wards",
  requirePermission("constituency", "update"),
  constituencyController.linkWard,
);
router.post(
  "/constituencies/:id/wards/unlink",
  requirePermission("constituency", "update"),
  constituencyController.unlinkWard,
);

router.get(
  "/constituencies/:id/town-villages",
  requirePermission("constituency", "read"),
  constituencyController.getConstituencyTownVillages,
);
router.post(
  "/constituencies/:id/town-villages",
  requirePermission("constituency", "update"),
  constituencyController.linkTownVillage,
);
router.post(
  "/constituencies/:id/town-villages/unlink",
  requirePermission("constituency", "update"),
  constituencyController.unlinkTownVillage,
);

// ─── REPRESENTATIVE PROFILE ───
router.get(
  "/constituencies/:constituencyId/representative",
  requirePermission("representative", "read"),
  representativeController.getRepresentativeProfile,
);
router.put(
  "/constituencies/:constituencyId/representative",
  requirePermission("representative", "update"),
  validate(schemas.updateRepresentativeSchema),
  representativeController.upsertRepresentativeProfile,
);
router.post(
  "/constituencies/:constituencyId/representative/photo",
  requirePermission("representative", "update"),
  representativeUploader.single("file"),
  enforceStorageAndTrack,
  representativeController.uploadRepresentativePhoto,
);

router.delete(
  "/constituencies/:constituencyId/representative/photo",
  requirePermission("representative", "update"),
  representativeController.deleteRepresentativePhoto,
);

// ─── DISTRICTS ───
router.get(
  "/districts",
  requirePermission("constituency", "read"),
  geographyController.districts.list,
);
router.post(
  "/districts",
  requirePermission("constituency", "create"),
  validate(schemas.createDistrictSchema),
  geographyController.districts.create,
);
router.get(
  "/districts/:id",
  requirePermission("constituency", "read"),
  geographyController.districts.get,
);
router.patch(
  "/districts/:id",
  requirePermission("constituency", "update"),
  validate(schemas.updateDistrictSchema),
  geographyController.districts.update,
);
router.delete(
  "/districts/:id",
  requirePermission("constituency", "delete"),
  geographyController.districts.delete,
);
router.patch(
  "/districts/:id/toggle",
  requirePermission("constituency", "update"),
  geographyController.districts.toggle,
);
router.post(
  "/districts/:id/restore",
  requirePermission("constituency", "create"),
  geographyController.districts.restore,
);

// ─── BLOCKS ───
router.get(
  "/blocks",
  requirePermission("constituency", "read"),
  geographyController.blocks.list,
);
router.post(
  "/blocks",
  requirePermission("constituency", "create"),
  validate(schemas.createBlockSchema),
  geographyController.blocks.create,
);
router.get(
  "/blocks/:id",
  requirePermission("constituency", "read"),
  geographyController.blocks.get,
);
router.patch(
  "/blocks/:id",
  requirePermission("constituency", "update"),
  validate(schemas.updateBlockSchema),
  geographyController.blocks.update,
);
router.delete(
  "/blocks/:id",
  requirePermission("constituency", "delete"),
  geographyController.blocks.delete,
);
router.patch(
  "/blocks/:id/toggle",
  requirePermission("constituency", "update"),
  geographyController.blocks.toggle,
);
router.post(
  "/blocks/:id/restore",
  requirePermission("constituency", "create"),
  geographyController.blocks.restore,
);

// ─── TOWNS / VILLAGES ───
router.get(
  "/town-villages",
  requirePermission("constituency", "read"),
  geographyController.townVillages.list,
);
router.post(
  "/town-villages",
  requirePermission("constituency", "create"),
  validate(schemas.createTownVillageSchema),
  geographyController.townVillages.create,
);
router.get(
  "/town-villages/:id",
  requirePermission("constituency", "read"),
  geographyController.townVillages.get,
);
router.patch(
  "/town-villages/:id",
  requirePermission("constituency", "update"),
  validate(schemas.updateTownVillageSchema),
  geographyController.townVillages.update,
);
router.delete(
  "/town-villages/:id",
  requirePermission("constituency", "delete"),
  geographyController.townVillages.delete,
);
router.patch(
  "/town-villages/:id/toggle",
  requirePermission("constituency", "update"),
  geographyController.townVillages.toggle,
);
router.post(
  "/town-villages/:id/restore",
  requirePermission("constituency", "create"),
  geographyController.townVillages.restore,
);

// ─── WARDS (Phase 3 Integration) ───
router.get(
  "/wards",
  requirePermission("wards", "read"),
  geographyController.wards.list,
);
router.post(
  "/wards",
  requirePermission("wards", "create"),
  validate(schemas.createWardGeomSchema),
  geographyController.wards.create,
);
router.get(
  "/wards/:id",
  requirePermission("wards", "read"),
  geographyController.wards.get,
);
router.patch(
  "/wards/:id",
  requirePermission("wards", "update"),
  validate(schemas.updateWardGeomSchema),
  geographyController.wards.update,
);
router.delete(
  "/wards/:id",
  requirePermission("wards", "delete"),
  geographyController.wards.delete,
);
router.patch(
  "/wards/:id/toggle",
  requirePermission("wards", "update"),
  geographyController.wards.toggle,
);
router.post(
  "/wards/:id/restore",
  requirePermission("wards", "create"),
  geographyController.wards.restore,
);

// ─── POLLING LOCATIONS ───
router.get(
  "/polling-locations",
  requirePermission("constituency", "read"),
  geographyController.pollingLocations.list,
);
router.post(
  "/polling-locations",
  requirePermission("constituency", "create"),
  validate(schemas.createPollingLocationSchema),
  geographyController.pollingLocations.create,
);
router.get(
  "/polling-locations/:id",
  requirePermission("constituency", "read"),
  geographyController.pollingLocations.get,
);
router.patch(
  "/polling-locations/:id",
  requirePermission("constituency", "update"),
  validate(schemas.updatePollingLocationSchema),
  geographyController.pollingLocations.update,
);
router.delete(
  "/polling-locations/:id",
  requirePermission("constituency", "delete"),
  geographyController.pollingLocations.delete,
);
router.patch(
  "/polling-locations/:id/toggle",
  requirePermission("constituency", "update"),
  geographyController.pollingLocations.toggle,
);
router.post(
  "/polling-locations/:id/restore",
  requirePermission("constituency", "create"),
  geographyController.pollingLocations.restore,
);

// ─── BOOTHS ───
router.get(
  "/booths",
  requirePermission("constituency", "read"),
  geographyController.booths.list,
);
router.post(
  "/booths",
  requirePermission("constituency", "create"),
  validate(schemas.createBoothSchema),
  geographyController.booths.create,
);
router.get(
  "/booths/:id",
  requirePermission("constituency", "read"),
  geographyController.booths.get,
);
router.patch(
  "/booths/:id",
  requirePermission("constituency", "update"),
  validate(schemas.updateBoothSchema),
  geographyController.booths.update,
);
router.delete(
  "/booths/:id",
  requirePermission("constituency", "delete"),
  geographyController.booths.delete,
);
router.patch(
  "/booths/:id/toggle",
  requirePermission("constituency", "update"),
  geographyController.booths.toggle,
);
router.post(
  "/booths/:id/restore",
  requirePermission("constituency", "create"),
  geographyController.booths.restore,
);

// ─── GEOGRAPHY OVERVIEW & TREE ───
router.get(
  "/tree",
  requirePermission("constituency", "read"),
  geographyController.getTree,
);
router.get(
  "/stats",
  requirePermission("constituency", "read"),
  geographyController.getStats,
);
router.get(
  "/overview",
  requirePermission("constituency", "read"),
  geographyController.getOverview,
);

// ─── HIERARCHY / DROPDOWN APIS ───
router.get(
  "/constituencies/:id/districts",
  requirePermission("constituency", "read"),
  geographyController.getDistrictsByConstituency,
);
router.get(
  "/districts/:id/blocks",
  requirePermission("constituency", "read"),
  geographyController.getBlocksByDistrict,
);
router.get(
  "/districts/:id/town-villages",
  requirePermission("constituency", "read"),
  geographyController.getTownVillagesByDistrict,
);
router.get(
  "/blocks/:id/town-villages",
  requirePermission("constituency", "read"),
  geographyController.getTownVillagesByBlock,
);
router.get(
  "/town-villages/:id/wards",
  requirePermission("constituency", "read"),
  geographyController.getWardsByTownVillage,
);
router.get(
  "/constituencies/:id/booths",
  requirePermission("constituency", "read"),
  geographyController.getBoothsByConstituency,
);

// ─── GEOGRAPHY BULK IMPORTS ───
router.post(
  "/import",
  requirePermission("constituency", "create"),
  validate(schemas.geographyImportSchema),
  importController.uploadImportData,
);
router.get(
  "/import/:id",
  requirePermission("constituency", "read"),
  importController.getImportStatus,
);
router.get(
  "/import/:id/errors",
  requirePermission("constituency", "read"),
  importController.getImportErrors,
);
router.post(
  "/import/:id/confirm",
  requirePermission("constituency", "create"),
  importController.confirmImport,
);

export default router;
