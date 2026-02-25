import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import { demographicsZodSchema } from "../ward/helpers.js";

import { z } from "zod";
import { updateDemographics } from "./update.js";
import { summaryDemographics, getWardDemographics } from "./read.js";

const upsertSchema = z.object({
  wardAreaId: z.string().optional().nullable(),
  ...demographicsZodSchema.unwrap().shape,
});

const router = Router();

router.get(
  "/summary",
  requirePermission("demographics", "read"),
  summaryDemographics,
);
router.get(
  "/ward/:wardId",
  requirePermission("demographics", "read"),
  getWardDemographics,
);

// update funds

router.put(
  "/ward/:wardId",
  requirePermission("demographics", "update"),
  validate(upsertSchema),
  updateDemographics,
);

export default router;
