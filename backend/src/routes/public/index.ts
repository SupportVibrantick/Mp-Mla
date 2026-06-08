import { Router, Request, Response } from "express";
import prisma from "../../lib/prisma.js";
import { createUploader, getUploadPath } from "../../lib/upload.js";
import { sendEmail, buildInstitutionRequestEmailHtml } from "../../lib/email.js";
import { getSetting } from "../../lib/settings.js";


const router = Router();

// Upload middleware for institution request documents
const docUpload = createUploader("institution-requests");

async function resolvePublicTenantId(req: Request): Promise<string | null> {
  const tenantId =
    (req.headers["x-tenant-id"] as string | undefined) ||
    (req.query.tenantId as string | undefined) ||
    (req.body?.tenantId as string | undefined);

  if (tenantId) {
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, status: "ACTIVE" },
      select: { id: true },
    });
    return tenant?.id || null;
  }

  const tenants = await prisma.tenant.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
    take: 2,
  });
  return tenants.length === 1 ? tenants[0].id : null;
}

// ─── Public: List wards (for registration form dropdown) ─────
router.get("/wards", async (req: Request, res: Response) => {
  try {
    const tenantId = await resolvePublicTenantId(req);
    if (!tenantId) {
      res.status(400).json({ success: false, message: "Tenant ID is required" });
      return;
    }

    const wards = await prisma.ward.findMany({
      where: { tenantId, status: "ACTIVE", isDeleted: false },
      select: { id: true, name: true, wardNumber: true },
      orderBy: { wardNumber: "asc" },
    });
    res.json({ success: true, data: wards });
  } catch {
    res.status(500).json({ success: false, message: "Failed to fetch wards" });
  }
});

// ─── Public: Submit institution registration request ─────────
router.post(
  "/institution-requests",
  docUpload.fields([
    { name: "institutionProof", maxCount: 1 },
    { name: "identityProof", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const tenantId = await resolvePublicTenantId(req);
      if (!tenantId) {
        res.status(400).json({ success: false, message: "Tenant ID is required" });
        return;
      }

      // Validate required fields
      const requiredFields = [
        "name",
        "category",
        "address",
        "wardId",
        "submitterName",
        "submitterPhone",
        "headName",
        "headDesignation",
        "headContact",
      ];
      const missing = requiredFields.filter((f) => !data[f]);
      if (missing.length > 0) {
        res.status(400).json({
          success: false,
          message: `Missing required fields: ${missing.join(", ")}`,
        });
        return;
      }

      // Verify ward exists
      const ward = await prisma.ward.findFirst({
        where: { id: data.wardId, tenantId },
      });
      if (!ward) {
        res.status(400).json({ success: false, message: "Ward not found" });
        return;
      }

      // Check if Aadhaar number is already registered for an incharge or in another pending request
      if (data.headAdharNumber) {
        const [existingIncharge, existingRequest] = await Promise.all([
          prisma.incharge.findUnique({
            where: { adharNumber: data.headAdharNumber },
          }),
          prisma.institutionRequest.findFirst({
            where: {
              headAdharNumber: data.headAdharNumber,
              tenantId,
              status: "PENDING",
            },
          }),
        ]);

        if (existingIncharge) {
          res.status(400).json({
            success: false,
            message: "An incharge with this Aadhaar number is already registered.",
          });
          return;
        }

        if (existingRequest) {
          res.status(400).json({
            success: false,
            message: "A pending registration request with this Aadhaar number already exists.",
          });
          return;
        }
      }

      // Process uploaded files
      const files = req.files as {
        [fieldname: string]: Express.Multer.File[];
      };
      const documents: Array<{
        name: string;
        url: string;
        type: string;
        originalName: string;
      }> = [];

      if (files?.institutionProof?.[0]) {
        const f = files.institutionProof[0];
        documents.push({
          name: "Institution Proof",
          url: getUploadPath(f.filename, "institution-requests"),
          type: f.mimetype,
          originalName: f.originalname,
        });
      }
      if (files?.identityProof?.[0]) {
        const f = files.identityProof[0];
        documents.push({
          name: "Identity Proof",
          url: getUploadPath(f.filename, "institution-requests"),
          type: f.mimetype,
          originalName: f.originalname,
        });
      }
      if (files?.addressProof?.[0]) {
        const f = files.addressProof[0];
        documents.push({
          name: "Address Proof",
          url: getUploadPath(f.filename, "institution-requests"),
          type: f.mimetype,
          originalName: f.originalname,
        });
      }

      const request = await prisma.institutionRequest.create({
        data: {
          tenantId,
          name: data.name,
          category: data.category,
          subcategory: data.subcategory || null,
          address: data.address,
          wardId: data.wardId,
          contactNo: data.contactNo || null,
          email: data.email || null,
          website: data.website || null,
          description: data.description || null,
          capacity: data.capacity ? parseInt(data.capacity, 10) : null,
          establishedDate: data.establishedDate
            ? new Date(data.establishedDate)
            : null,

          submitterName: data.submitterName,
          submitterPhone: data.submitterPhone,
          submitterEmail: data.submitterEmail || null,

          headName: data.headName,
          headDesignation: data.headDesignation,
          headContact: data.headContact,
          headEmail: data.headEmail || null,
          headDateOfBirth: data.headDateOfBirth
            ? new Date(data.headDateOfBirth)
            : null,
          headAdharNumber: data.headAdharNumber || null,
          headAppointedDate: data.headAppointedDate
            ? new Date(data.headAppointedDate)
            : null,

          documents: documents,
        },
        include: {
          ward: { select: { name: true, wardNumber: true } },
        },
      });

      // ─── Notify Admin (Fire-and-forget) ──────────────────
      (async () => {
        try {
          const orgEmail = await getSetting("org_email");
          const orgName = await getSetting("org_name");
          if (orgEmail) {
            const subject = `New Institution Registration Request: ${request.name}`;
            const html = buildInstitutionRequestEmailHtml({ request, orgName });
            await sendEmail(orgEmail, subject, html);
          }
        } catch (err) {
          console.error("Admin notification failed:", err);
        }
      })();

      res.status(201).json({

        success: true,
        message:
          "Your institution registration request has been submitted successfully. It will be reviewed by the administration.",
        data: { id: request.id, status: request.status },
      });
    } catch (error) {
      console.error("Institution request submission error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to submit request" });
    }
  },
);

export default router;

