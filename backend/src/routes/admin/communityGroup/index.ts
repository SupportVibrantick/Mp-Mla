import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import {
  getCommunityGroup,
  getCommunityGroupStats,
  getOneCommunityGroup,
} from "./read.js";
import { deleteCommunity } from "./delete.js";
import {
  createSchema,
  updateSchema,
} from "@/schemas/admin/communityGroup/index.js";
import { createCommunityGroup } from "./create.js";
import { toggleCommmunity, updateCommunityGroup } from "./update.js";

const router = Router();

router.get(
  "/",
  requirePermission("community_groups", "read"),
  getCommunityGroup,
);
router.get(
  "/stats",
  requirePermission("community_groups", "read"),
  getCommunityGroupStats,
);
router.get(
  "/:id",
  requirePermission("community_groups", "read"),
  getOneCommunityGroup,
);

// create Community Group
router.post(
  "/",
  requirePermission("community_groups", "create"),
  validate(createSchema),
  createCommunityGroup,
);

// update Community Group

router.put(
  "/:id",
  requirePermission("community_groups", "update"),
  validate(updateSchema),
  updateCommunityGroup,
);
router.patch(
  "/:id/toggle-active",
  requirePermission("community_groups", "update"),
  toggleCommmunity,
);

// delete community group

router.delete(
  "/:id",
  requirePermission("community_groups", "delete"),
  deleteCommunity,
);
export default router;
