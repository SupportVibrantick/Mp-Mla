import { Router } from "express";
import { requirePermission } from "../../../middleware/permission.js";
import { validate } from "../../../middleware/validate.js";
import { createFund, createTransactionFund } from "./create.js";
import {
  createFundSchema,
  updateFundSchema,
  transactionSchema,
} from "../../../schemas/admin/fund/index.js";
import { updateFunds } from "./update.js";
import { deleteFunds, deleteFundTransaction } from "./delete.js";
import { getFunds, overviewDashboard, getSingleFunds, getFundTransactions } from "./read.js";
import { exportFunds } from "./export.js";

const router = Router();

// Funds Global Stats
router.get("/stats", requirePermission("funds", "read"), overviewDashboard);

router.get("/export", requirePermission("funds", "read"), exportFunds);

// Funds Dashboard overview
router.get("/overview", requirePermission("funds", "read"), overviewDashboard);

// Funds CRUD
router.get("/", requirePermission("funds", "read"), getFunds);
router.post(
  "/",
  requirePermission("funds", "create"),
  validate(createFundSchema),
  createFund
);
router.get(
  "/:id",
  requirePermission("funds", "read"),
  getSingleFunds
);
router.put(
  "/:id",
  requirePermission("funds", "update"),
  validate(updateFundSchema),
  updateFunds
);
router.delete("/:id", requirePermission("funds", "delete"), deleteFunds);

// Fund Transactions
router.get(
  "/:id/transactions",
  requirePermission("funds", "read"),
  getFundTransactions
);
router.post(
  "/:id/transactions",
  requirePermission("funds", "update"),
  validate(transactionSchema),
  createTransactionFund
);
router.delete(
  "/:id/transactions/:txnId",
  requirePermission("funds", "delete"),
  deleteFundTransaction
);

export default router;
