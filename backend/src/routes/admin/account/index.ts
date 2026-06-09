import { Router } from "express";
import {
  getSubscription,
  getInvoices,
  getUsage,
} from "../../../controllers/admin/account.controller.js";

const router = Router();

router.get("/subscription", getSubscription);
router.get("/invoices", getInvoices);
router.get("/usage", getUsage);

export default router;
