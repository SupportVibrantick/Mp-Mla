import { Request, Response } from "express";
import * as constituencyService from "../../../services/constituency.service.js";
import catchAsync from "../../../utils/catchAsync.js";
import ApiResponse from "../../../utils/ApiResponse.js";
import { requireTenantId } from "../../../utils/tenant.js";
import {
  createAuditLog,
  getRequestMeta,
} from "../../../middleware/auditLog.js";

export const createConstituency = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const data = req.body;

    const result = await constituencyService.createConstituency(tenantId, data);

    await createAuditLog({
      userId: req.user!.id,
      tenantId,
      action: "CREATE",
      module: "constituency",
      recordId: result.id,
      description: `Created constituency "${result.name}"`,
      newData: result,
      ...getRequestMeta(req),
    });

    res
      .status(201)
      .json(ApiResponse.created(result, "Constituency created successfully."));
  },
);

export const getConstituency = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;

    const result = await constituencyService.getConstituency(tenantId, id);
    res.json(ApiResponse.success(result, "Constituency fetched successfully."));
  },
);

export const listConstituencies = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const { search, status, page, limit, districtId } = req.query;

    const result = await constituencyService.listConstituency(tenantId, {
      search: search ? String(search) : undefined,
      status: status ? String(status) : undefined,
      page: page ? parseInt(String(page), 10) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
      districtId: districtId ? String(districtId) : undefined,
    });

    res.json(
      ApiResponse.success(result, "Constituencies fetched successfully."),
    );
  },
);

export const updateConstituency = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const data = req.body;

    const original = await constituencyService.getConstituency(tenantId, id);
    const result = await constituencyService.updateConstituency(
      tenantId,
      id,
      data,
    );

    await createAuditLog({
      userId: req.user!.id,
      tenantId,
      action: "UPDATE",
      module: "constituency",
      recordId: id,
      description: `Updated constituency "${result.name}"`,
      oldData: original,
      newData: result,
      ...getRequestMeta(req),
    });

    res.json(ApiResponse.success(result, "Constituency updated successfully."));
  },
);

export const deleteConstituency = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;

    const original = await constituencyService.getConstituency(tenantId, id);
    const result = await constituencyService.deleteConstituency(tenantId, id);

    await createAuditLog({
      userId: req.user!.id,
      tenantId,
      action: "DELETE",
      module: "constituency",
      recordId: id,
      description: `Soft deleted constituency "${original.name}"`,
      oldData: original,
      newData: result,
      ...getRequestMeta(req),
    });

    res.json(ApiResponse.success(result, "Constituency deleted successfully."));
  },
);

export const restoreConstituency = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;

    const result = await constituencyService.restoreConstituency(tenantId, id);

    await createAuditLog({
      userId: req.user!.id,
      tenantId,
      action: "RESTORE",
      module: "constituency",
      recordId: id,
      description: `Restored constituency "${result.name}"`,
      newData: result,
      ...getRequestMeta(req),
    });

    res.json(
      ApiResponse.success(result, "Constituency restored successfully."),
    );
  },
);

export const toggleConstituency = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;

    const original = await constituencyService.getConstituency(tenantId, id);
    const result = await constituencyService.updateConstituency(tenantId, id, {
      isActive: !original.isActive,
    });

    await createAuditLog({
      userId: req.user!.id,
      tenantId,
      action: "STATUS_CHANGE",
      module: "constituency",
      recordId: id,
      description: `Toggled active status of constituency "${result.name}" to ${result.isActive}`,
      oldData: original,
      newData: result,
      ...getRequestMeta(req),
    });

    res.json(
      ApiResponse.success(result, "Constituency status toggled successfully."),
    );
  },
);

// ─── CONSTITUENCIES MAPPINGS CONTROLLERS ───

export const getConstituencyWards = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const result = await constituencyService.getConstituencyWards(tenantId, id);
    res.json(
      ApiResponse.success(result, "Constituency wards fetched successfully."),
    );
  },
);

export const linkWard = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const id = req.params.id as string;
  const { wardId } = req.body;
  const result = await constituencyService.linkWardToConstituency(
    tenantId,
    id,
    wardId,
  );
  res.json(
    ApiResponse.success(result, "Ward linked to constituency successfully."),
  );
});

export const unlinkWard = catchAsync(async (req: Request, res: Response) => {
  const tenantId = requireTenantId(req);
  const id = req.params.id as string;
  const { wardId } = req.body;
  const result = await constituencyService.unlinkWardFromConstituency(
    tenantId,
    id,
    wardId,
  );
  res.json(
    ApiResponse.success(
      result,
      "Ward unlinked from constituency successfully.",
    ),
  );
});

export const getConstituencyTownVillages = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const result = await constituencyService.getConstituencyTownVillages(
      tenantId,
      id,
    );
    res.json(
      ApiResponse.success(
        result,
        "Constituency towns/villages fetched successfully.",
      ),
    );
  },
);

export const linkTownVillage = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const { townVillageId } = req.body;
    const result = await constituencyService.linkTownVillageToConstituency(
      tenantId,
      id,
      townVillageId,
    );
    res.json(
      ApiResponse.success(
        result,
        "Town/village linked to constituency successfully.",
      ),
    );
  },
);

export const unlinkTownVillage = catchAsync(
  async (req: Request, res: Response) => {
    const tenantId = requireTenantId(req);
    const id = req.params.id as string;
    const { townVillageId } = req.body;
    const result = await constituencyService.unlinkTownVillageFromConstituency(
      tenantId,
      id,
      townVillageId,
    );
    res.json(
      ApiResponse.success(
        result,
        "Town/village unlinked from constituency successfully.",
      ),
    );
  },
);
