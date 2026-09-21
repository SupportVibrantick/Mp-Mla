import { Request, Response } from "express";
import { prisma } from "../../../lib/prisma.js";
import { saveFormSchema } from "../../../schemas/admin/website/index.js";

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

export async function listForms(req: Request, res: Response) {
  try {
    const tenantId = (req as any).user?.tenantId as string;
    const websiteId = req.params.websiteId as string;
    await assertWebsiteOwnership(websiteId, tenantId);

    const forms = await prisma.websiteForm.findMany({
      where: { websiteId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: forms });
  } catch (error: any) {
    console.error("listForms error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to list forms" });
  }
}

export async function createForm(req: Request, res: Response) {
  try {
    const tenantId = (req as any).user?.tenantId as string;
    const websiteId = req.params.websiteId as string;
    await assertWebsiteOwnership(websiteId, tenantId);

    const parsed = saveFormSchema.parse(req.body);

    const form = await prisma.websiteForm.create({
      data: {
        websiteId,
        title: parsed.title,
        formType: parsed.formType,
        fields: parsed.fields as any,
      },
    });

    return res.status(201).json({ success: true, data: form });
  } catch (error: any) {
    console.error("createForm error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to create form" });
  }
}

export async function deleteForm(req: Request, res: Response) {
  try {
    const tenantId = (req as any).user?.tenantId as string;
    const websiteId = req.params.websiteId as string;
    const formId = req.params.formId as string;
    await assertWebsiteOwnership(websiteId, tenantId);

    const form = await prisma.websiteForm.findFirst({
      where: { id: formId, websiteId },
    });

    if (!form) {
      return res.status(404).json({ success: false, message: "Form not found" });
    }

    await prisma.websiteForm.delete({
      where: { id: formId },
    });

    return res.json({ success: true, message: "Form deleted successfully" });
  } catch (error: any) {
    console.error("deleteForm error:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to delete form" });
  }
}
