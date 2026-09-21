import { Request, Response } from "express";
import { prisma } from "../../../lib/prisma.js";
import { saveMenuSchema } from "../../../schemas/admin/website/index.js";

async function assertWebsiteOwnership(websiteId: string, tenantId: string) {
  const website = await prisma.website.findFirst({
    where: { id: websiteId, tenantId },
  });
  if (!website) {
    const error: any = new Error("Website not found or unauthorized");
    error.status = 404;
    throw error;
  }
  return website;
}

export async function listMenus(req: Request, res: Response) {
  try {
    const tenantId = (req as any).user?.tenantId as string;
    const websiteId = req.params.websiteId as string;
    await assertWebsiteOwnership(websiteId, tenantId);

    const menus = await prisma.websiteMenu.findMany({
      where: { websiteId },
      orderBy: { createdAt: "asc" },
    });

    return res.json({ success: true, data: menus });
  } catch (error: any) {
    console.error("listMenus error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to list menus" });
  }
}

export async function upsertMenu(req: Request, res: Response) {
  try {
    const tenantId = (req as any).user?.tenantId as string;
    const websiteId = req.params.websiteId as string;
    await assertWebsiteOwnership(websiteId, tenantId);

    const parsed = saveMenuSchema.parse(req.body);

    const menu = await prisma.websiteMenu.upsert({
      where: {
        websiteId_name: {
          websiteId,
          name: parsed.name,
        },
      },
      update: {
        items: parsed.items as any,
      },
      create: {
        websiteId,
        name: parsed.name,
        items: parsed.items as any,
      },
    });

    return res.json({ success: true, data: menu });
  } catch (error: any) {
    console.error("upsertMenu error:", error);
    return res.status(error.status || 400).json({ success: false, message: error.message || "Failed to save menu" });
  }
}

export async function deleteMenu(req: Request, res: Response) {
  try {
    const tenantId = (req as any).user?.tenantId as string;
    const websiteId = req.params.websiteId as string;
    const menuId = req.params.menuId as string;
    await assertWebsiteOwnership(websiteId, tenantId);

    const menu = await prisma.websiteMenu.findFirst({
      where: { id: menuId, websiteId },
    });

    if (!menu) {
      return res.status(404).json({ success: false, message: "Menu not found" });
    }

    await prisma.websiteMenu.delete({
      where: { id: menuId },
    });

    return res.json({ success: true, message: "Menu deleted successfully" });
  } catch (error: any) {
    console.error("deleteMenu error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to delete menu" });
  }
}
