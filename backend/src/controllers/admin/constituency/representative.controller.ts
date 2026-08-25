import { Request, Response } from "express";
import * as constituencyService from "../../../services/constituency.service.js";
import catchAsync from "../../../utils/catchAsync.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { requireTenantId } from "../../../utils/tenant.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";

export const getRepresentativeProfile = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const constituencyId = req.params.constituencyId as string;

    const result = await constituencyService.getRepresentativeProfile(
      tenantId,
      constituencyId,
    );

    res.json(
      ApiResponse.success(
        result,
        "Representative profile fetched successfully.",
      ),
    );
  },
);

export const upsertRepresentativeProfile = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const constituencyId = req.params.constituencyId as string;

    const original = await constituencyService
      .getRepresentativeProfile(tenantId, constituencyId)
      .catch(() => null);

    const result = await constituencyService.upsertRepresentativeProfile(
      tenantId,
      constituencyId,
      req.body,
    );

    await createAuditLog({
      userId: req.user!.id,
      tenantId,
      action: original ? "UPDATE" : "CREATE",
      module: "representative",
      recordId: result.id,
      description: `${
        original ? "Updated" : "Created"
      } representative profile for constituency "${constituencyId}"`,
      oldData: original,
      newData: result,
      ...getRequestMeta(req),
    });

    res.json(
      ApiResponse.success(result, "Representative profile saved successfully."),
    );
  },
);

export const uploadRepresentativePhoto = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const constituencyId = req.params.constituencyId as string;

    if (!req.file) {
      throw new Error("Representative photo is required");
    }

    const result = await constituencyService.uploadRepresentativePhoto(
      tenantId,
      constituencyId,
      req.file,
      req.user!.id,
    );

    await createAuditLog({
      userId: req.user!.id,
      tenantId,
      action: "UPDATE",
      module: "representative",
      recordId: result.id,
      description: `Uploaded representative photo for constituency "${constituencyId}"`,
      newData: result,
      ...getRequestMeta(req),
    });

    res
      .status(201)
      .json(
        ApiResponse.success(
          result,
          "Representative photo uploaded successfully.",
        ),
      );
  },
);

export const deleteRepresentativePhoto = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const constituencyId = req.params.constituencyId as string;

    const result = await constituencyService.deleteRepresentativePhoto(
      tenantId,
      constituencyId,
    );

    await createAuditLog({
      userId: req.user!.id,
      tenantId,
      action: "UPDATE",
      module: "representative",
      recordId: result.id,
      description: `Removed representative photo for constituency "${constituencyId}"`,
      newData: result,
      ...getRequestMeta(req),
    });

    res.json(
      ApiResponse.success(result, "Representative photo removed successfully."),
    );
  },
);
