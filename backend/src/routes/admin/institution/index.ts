import { Router } from "express";
import { create } from "./create.js";
import { readAll, readOne } from "./read.js";
import { update } from "./update.js";
import { remove } from "./delete.js";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { validate } from "../../../middleware/validate.js";
import { auditLog } from "../../../middleware/auditLog.js";
import { createInstitutionSchema, updateInstitutionSchema } from "../../../schemas/admin/institution/index.js";

const router = Router();

router.use(authenticate);

router.get("/", readAll);
router.get("/:id", readOne);
router.post("/", authorize("SYSTEM_ADMIN", "STAFF"), validate(createInstitutionSchema), auditLog("institution", "CREATE"), create);
router.patch("/:id", authorize("SYSTEM_ADMIN", "STAFF"), validate(updateInstitutionSchema), auditLog("institution", "UPDATE"), update);
router.delete("/:id", authorize("SYSTEM_ADMIN"), auditLog("institution", "DELETE"), remove);

export default router;
