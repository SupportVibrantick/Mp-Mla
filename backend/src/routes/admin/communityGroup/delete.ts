import prisma from "../../../lib/prisma.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";
import { ApiError } from "../../../utils/ApiError.js";

import catchAsync from "@/utils/catchAsync.js";

// ─── Delete ─────────────────────────────────────────────

export const deleteCommunity = catchAsync(async (req, res) => {
  const group = await prisma.communityGroup.findUnique({
    where: { id: req.params.id as string },
  });
  if (!group) throw ApiError.notFound("Community group not found");

  await prisma.communityGroup.delete({
    where: { id: req.params.id as string },
  });

  await createAuditLog({
    userId: req.user!.id,
    action: "DELETE",
    module: "community_groups",
    recordId: group.id,
    description: `Deleted community group "${group.name}"`,
    ...getRequestMeta(req),
  });

  res.json({ success: true, message: `"${group.name}" deleted` });
});
