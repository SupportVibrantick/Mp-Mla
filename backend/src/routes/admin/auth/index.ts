// import { Router } from "express";
// import { login } from "./login.js";
// import { register } from "./register.js";
// import { authenticate, authorize } from "../../../middleware/auth.js";
// import { validate } from "../../../middleware/validate.js";
// import { loginSchema, registerSchema, changePasswordSchema } from "../../../schemas/admin/auth/index.js";
// import { Request, Response } from "express";
// import bcrypt from "bcryptjs";
// import prisma from "../../../lib/prisma.js";
// import { createAuditEntry } from "../../../middleware/auditLog.js";

// const router = Router();

// // POST /api/admin/auth/login
// router.post("/login", validate(loginSchema), login);

// // POST /api/admin/auth/register (Admin only)
// router.post("/register", authenticate, authorize("SYSTEM_ADMIN"), validate(registerSchema), register);

// // GET /api/admin/auth/me
// router.get("/me", authenticate, async (req: Request, res: Response): Promise<void> => {
//     try {
//         const user = await prisma.user.findUnique({
//             where: { id: req.user!.id },
//             select: {
//                 id: true, name: true, email: true, role: true,
//                 phone: true, avatar: true, isActive: true,
//                 lastLoginAt: true, createdAt: true,
//             },
//         });

//         if (!user) {
//             res.status(404).json({ success: false, message: "User not found." });
//             return;
//         }

//         res.json({ success: true, data: user });
//     } catch (error: any) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// });

// // PATCH /api/admin/auth/change-password
// router.patch("/change-password", authenticate, validate(changePasswordSchema), async (req: Request, res: Response): Promise<void> => {
//     try {
//         const { currentPassword, newPassword } = req.body;
//         const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

//         if (!user) {
//             res.status(404).json({ success: false, message: "User not found." });
//             return;
//         }

//         const isMatch = await bcrypt.compare(currentPassword, user.password);
//         if (!isMatch) {
//             res.status(400).json({ success: false, message: "Current password is incorrect." });
//             return;
//         }

//         const hashedPassword = await bcrypt.hash(newPassword, 12);
//         await prisma.user.update({
//             where: { id: user.id },
//             data: { password: hashedPassword },
//         });

//         await createAuditEntry({
//             userId: user.id,
//             action: "UPDATE",
//             entity: "user",
//             entityId: user.id,
//             newData: { action: "password_changed" },
//         });

//         res.json({ success: true, message: "Password changed successfully." });
//     } catch (error: any) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// });

// // POST /api/admin/auth/logout
// router.post("/logout", authenticate, async (req: Request, res: Response): Promise<void> => {
//     await createAuditEntry({
//         userId: req.user!.id,
//         action: "LOGOUT",
//         entity: "user",
//         entityId: req.user!.id,
//     });

//     res.json({ success: true, message: "Logged out successfully." });
// });

// export default router;

import { Router } from "express";
import { login } from "./login.js";
import { refresh } from "./refresh.js";
import { logout } from "./logout.js";
import { changePassword } from "./changePassword.js";
import { getMe, getMyPermissions } from "./me.js";
import { authenticate } from "../../../middleware/auth.js";
import { validate } from "../../../middleware/validate.js";
import { z } from "zod";

const router = Router();

// ─── Validation Schemas ─────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z
    .string()
    .min(8, "Min 8 characters")
    .regex(/[A-Z]/, "Must contain uppercase letter")
    .regex(/[0-9]/, "Must contain a number")
    .regex(/[^A-Za-z0-9]/, "Must contain special character"),
});

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
