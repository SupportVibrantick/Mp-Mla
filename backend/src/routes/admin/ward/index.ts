import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import { listWards, getWard, getWardStats } from "./read.js";
import { createWard } from "./create.js";
import { updateWard } from "./update.js";
import { deleteWard } from "./delete.js";
import {
  listAreas,
  getArea,
  createArea,
  updateArea,
  deleteArea,
} from "./areas.js";
import {
  listCouncillors,
  createCouncillor,
  updateCouncillor,
} from "./councillors.js";
import {
  getWardDemographics,
  upsertWardDemographics,
} from "./demographics.js";
import { createAreaSchema, updateAreaSchema, createCouncillorSchema, updateCouncillorSchema, createWardSchema, updateWardSchema, wardDemographicsSchema } from "@/schemas/admin/ward/index.js";

const router = Router();

// ─── Ward CRUD ──────────────────────────────────────────
router.get("/", requirePermission("wards", "read"), listWards);
router.get("/stats", requirePermission("wards", "read"), getWardStats);
router.get("/:id", requirePermission("wards", "read"), getWard);
router.post(
  "/",
  requirePermission("wards", "create"),
  validate(createWardSchema),
  createWard,
);
router.put(
  "/:id",
  requirePermission("wards", "update"),
  validate(updateWardSchema),
  updateWard,
);
router.delete("/:id", requirePermission("wards", "delete"), deleteWard);

// ─── Ward Areas ─────────────────────────────────────────
router.get("/:wardId/areas", requirePermission("wards", "read"), listAreas);
router.get(
  "/:wardId/areas/:areaId",
  requirePermission("wards", "read"),
  getArea,
);
router.post(
  "/:wardId/areas",
  requirePermission("wards", "create"),
  validate(createAreaSchema),
  createArea,
);
router.put(
  "/:wardId/areas/:areaId",
  requirePermission("wards", "update"),
  validate(updateAreaSchema),
  updateArea,
);
router.delete(
  "/:wardId/areas/:areaId",
  requirePermission("wards", "delete"),
  deleteArea,
);

// ─── Ward Councillors ───────────────────────────────────
router.get(
  "/:wardId/councillors",
  requirePermission("wards", "read"),
  listCouncillors,
);
router.post(
  "/:wardId/councillors",
  requirePermission("wards", "create"),
  validate(createCouncillorSchema),
  createCouncillor,
);
router.put(
  "/:wardId/councillors/:councillorId",
  requirePermission("wards", "update"),
  validate(updateCouncillorSchema),
  updateCouncillor,
);

// ─── Ward Demographics ──────────────────────────────────
router.get(
  "/:wardId/demographics",
  requirePermission("demographics", "read"),
  getWardDemographics,
);
router.put(
  "/:wardId/demographics",
  requirePermission("demographics", "update"),
  validate(wardDemographicsSchema),
  upsertWardDemographics,
);

export default router;
