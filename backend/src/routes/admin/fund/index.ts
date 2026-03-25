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
import { getFunds, overviewDashboard, getSingleFunds } from "./read.js";
import { exportFunds } from "./export.js";

const router = Router();

router.get("/export", requirePermission("funds", "read"), exportFunds);
router.get("/", requirePermission("funds", "read"), getFunds);

router.get(
  "/overview",
  requirePermission("funds", "read"),

  overviewDashboard,
);
router.get(
  "/:id",
  requirePermission("funds", "read"),

  getSingleFunds,
);

// create Funds
router.post(
  "/",
  requirePermission("funds", "create"),
  validate(createFundSchema),
  createFund,
);
router.post(
  "/:id/transactions",
  requirePermission("funds", "update"),
  validate(transactionSchema),
  createTransactionFund,
);

// update funds

router.put(
  "/:id",
  requirePermission("funds", "update"),
  validate(updateFundSchema),
  updateFunds,
);

// delete funds
router.delete("/:id", requirePermission("funds", "delete"), deleteFunds);
router.delete(
  "/:id/transactions/:txnId",
  requirePermission("funds", "delete"),
  deleteFundTransaction,
);

export default router;
