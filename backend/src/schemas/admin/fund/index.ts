import { z } from "zod";
const FUND_TYPES = [
  "MPLAD",
  "MLALAD",
  "STATE_FUND",
  "CENTRAL_FUND",
  "CSR",
  "OTHER",
] as const;

const TXN_TYPES = ["ALLOCATION", "RELEASE", "UTILIZATION"] as const;

export const createFundSchema = z.object({
  fundType: z.enum(FUND_TYPES),
  financialYear: z.string().regex(/^\d{4}-\d{2}$/, "Format: 2024-25"),
  totalAllocated: z.number().min(0).default(0),
  totalReleased: z.number().min(0).default(0),
  totalUtilized: z.number().min(0).default(0),
});
export const updateFundSchema = z.object({
  totalAllocated: z.number().min(0).optional(),
  totalReleased: z.number().min(0).optional(),
  totalUtilized: z.number().min(0).optional(),
});
export const transactionSchema = z.object({
  amount: z.number().positive("Amount must be > 0"),
  type: z.enum(TXN_TYPES),
  description: z.string().min(1, "Description required"),
  projectId: z.string().optional().nullable(),
  date: z.string().datetime().optional(),
});

export type createFundInput = z.infer<typeof createFundSchema>;
export type updateFundInput = z.infer<typeof updateFundSchema>;
export type transactionInput = z.infer<typeof transactionSchema>;
