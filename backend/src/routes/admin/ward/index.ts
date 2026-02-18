import { Router } from "express";
import { create } from "./create.js";
import { readAll, readOne } from "./read.js";
import { update } from "./update.js";
import { remove } from "./delete.js";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { validate } from "../../../middleware/validate.js";
import { auditLog } from "../../../middleware/auditLog.js";
import { createWardSchema, updateWardSchema } from "../../../schemas/admin/ward/index.js";

const router = Router();

router.use(authenticate);

router.get("/", readAll);
router.get("/:id", readOne);
router.post("/", authorize("SYSTEM_ADMIN", "STAFF"), validate(createWardSchema), auditLog("ward", "CREATE"), create);
router.patch("/:id", authorize("SYSTEM_ADMIN", "STAFF"), validate(updateWardSchema), auditLog("ward", "UPDATE"), update);
router.delete("/:id", authorize("SYSTEM_ADMIN"), auditLog("ward", "DELETE"), remove);

export default router;
