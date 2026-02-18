import { Router } from "express";
import { create } from "./create.js";
import { readAll, readOne } from "./read.js";
import { update } from "./update.js";
import { remove } from "./delete.js";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { validate } from "../../../middleware/validate.js";
import { auditLog } from "../../../middleware/auditLog.js";
import { createUserSchema, updateUserSchema } from "../../../schemas/admin/user/index.js";

const router = Router();

// All user routes require SYSTEM_ADMIN role
router.use(authenticate, authorize("SYSTEM_ADMIN"));

router.get("/", readAll);
router.get("/:id", readOne);
router.post("/", validate(createUserSchema), auditLog("user", "CREATE"), create);
router.patch("/:id", validate(updateUserSchema), auditLog("user", "UPDATE"), update);
router.delete("/:id", auditLog("user", "DELETE"), remove);

export default router;
