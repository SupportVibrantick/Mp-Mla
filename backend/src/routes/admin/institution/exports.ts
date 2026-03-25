import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { sendAdminNotification, buildActivityEmailHtml } from "../../../lib/email.js";

/**
 * GET /api/admin/institutions/export
 * Exports institutions + incharges as flat JSON array.
 * Each incharge becomes a separate row (round-trip compatible with bulk import).
 */
export async function exportInstitutions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { wardId, category, status } = req.query;

    const where: any = { isDeleted: false };
    if (wardId) where.wardId = String(wardId);
    if (category && category !== "all") where.category = String(category);
    if (status && status !== "all") where.status = String(status);

    const institutions = await prisma.institution.findMany({
      where,
      include: {
        ward: { select: { wardNumber: true, name: true } },
        incharges: { orderBy: { createdAt: "asc" } },
      },
      orderBy: [{ ward: { wardNumber: "asc" } }, { name: "asc" }],
    });

    const flatRows: any[] = [];

    for (const inst of institutions) {
      const instBase = {
        name: inst.name,
        category: inst.category,
        subcategory: inst.subcategory ?? "",
        address: inst.address,
        wardNumber: inst.ward?.wardNumber ?? "",
        wardName: inst.ward?.name ?? "",
        contactNo: inst.contactNo ?? "",
        email: inst.email ?? "",
        website: inst.website ?? "",
        status: inst.status,
        description: inst.description ?? "",
        capacity: inst.capacity ?? "",
        establishedDate: inst.establishedDate
          ? inst.establishedDate.toISOString().split("T")[0]
          : "",
      };

      if (inst.incharges.length === 0) {
        flatRows.push({
          ...instBase,
          inchargeName: "",
          inchargeDesignation: "",
          inchargeContactNo: "",
          inchargeEmail: "",
          inchargeDateOfBirth: "",
          inchargeAppointedDate: "",
          inchargeIsActive: "",
        });
      } else {
        inst.incharges.forEach((ic, index) => {
          const inchargeData = {
            inchargeName: ic.name,
            inchargeDesignation: ic.designation,
            inchargeContactNo: ic.contactNo,
            inchargeEmail: ic.email ?? "",
            inchargeDateOfBirth: ic.dateOfBirth
              ? ic.dateOfBirth.toISOString().split("T")[0]
              : "",
            inchargeAppointedDate: ic.appointedDate
              ? ic.appointedDate.toISOString().split("T")[0]
              : "",
            inchargeIsActive: ic.isActive ? "TRUE" : "FALSE",
          };

          if (index === 0) {
            flatRows.push({ ...instBase, ...inchargeData });
          } else {
            flatRows.push({
              name: inst.name,
              category: "",
              subcategory: "",
              address: "",
              wardNumber: inst.ward?.wardNumber ?? "",
              wardName: "",
              contactNo: "",
              email: "",
              website: "",
              status: "",
              description: "",
              capacity: "",
              establishedDate: "",
              ...inchargeData,
            });
          }
        });
      }
    }

    res.status(200).json({
      success: true,
      data: flatRows,
    });

    // Log data activity (fire-and-forget)
    prisma.dataActivity.create({
      data: {
        userId: req.user!.id,
        userName: req.user!.name || "Unknown",
        action: "EXPORT",
        module: "institutions",
        recordCount: institutions.length,
        details: `Exported ${institutions.length} institutions (${flatRows.length} rows)`,
      },
    }).catch(() => {});

    // Send admin notification (fire-and-forget)
    sendAdminNotification(
      `Data Export: institutions by ${req.user!.name || "Unknown"}`,
      buildActivityEmailHtml({
        action: "EXPORT",
        module: "institutions",
        userName: req.user!.name || "Unknown",
        recordCount: institutions.length,
        timestamp: new Date(),
      }),
    );

  } catch (error) {
    next(error);
  }
}
