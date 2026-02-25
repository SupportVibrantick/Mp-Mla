import { Router } from "express";
import { login } from "./login.js";
import { refresh } from "./refresh.js";
import { logout } from "./logout.js";
import { changePassword } from "./changePassword.js";
import { getMe, getMyPermissions } from "./me.js";
import { authenticate } from "../../../middleware/auth.js";
import { validate } from "../../../middleware/validate.js";
import {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
} from "@/schemas/admin/auth/index.js";

const router = Router();

// ─── Public routes (no auth needed) ─────────────────────
router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshSchema), refresh);

// ─── Protected routes ───────────────────────────────────
router.post("/logout", authenticate, logout);
router.post(
  "/change-password",
  authenticate,
  validate(changePasswordSchema),
  changePassword,
);
router.get("/me", authenticate, getMe);
router.get("/me/permissions", authenticate, getMyPermissions);

export default router;
