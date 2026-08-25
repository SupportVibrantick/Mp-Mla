import { z } from "zod";

// Base coordinates boundary check (GeoJSON structure validation helper)
const geoJsonSchema = z
  .object({
    type: z.enum(["Polygon", "MultiPolygon"]),
    coordinates: z.array(z.any()),
  })
  .optional()
  .nullable();

const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .optional()
  .nullable();

export const createConstituencySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  code: z.string().max(50).optional().nullable(),
  type: z.enum(["ASSEMBLY", "PARLIAMENTARY"]).default("ASSEMBLY"),
  districtId: z.string().cuid().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  boundary: geoJsonSchema,
});

export const updateConstituencySchema = createConstituencySchema.partial();

export const updateRepresentativeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  title: z.string().min(2).max(100),
  photoUrl: z.string().url("Must be a valid URL").optional().nullable(),
  partyName: z.string().max(100).optional().nullable(),
  partyLogoUrl: z.string().url("Must be a valid URL").optional().nullable(),
  termStartDate: dateOnlySchema,
  termEndDate: dateOnlySchema,
  officePhone: z.string().max(20).optional().nullable(),
  officeEmail: z
    .string()
    .email("Must be a valid email")
    .optional()
    .nullable()
    .or(z.literal("")),
  officeAddress: z.string().max(500).optional().nullable(),
});

export const createDistrictSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().max(50).optional().nullable(),
  state: z.string().min(2).max(100),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  boundary: geoJsonSchema,
});

export const updateDistrictSchema = createDistrictSchema.partial();

export const createBlockSchema = z.object({
  districtId: z.string().cuid("Invalid district ID"),
  name: z.string().min(2).max(100),
  code: z.string().max(50).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  boundary: geoJsonSchema,
});

export const updateBlockSchema = createBlockSchema.partial();

export const createTownVillageSchema = z.object({
  districtId: z.string().cuid("Invalid district ID"),
  blockId: z.string().cuid("Invalid block ID").optional().nullable(),
  constituencyId: z
    .string()
    .cuid("Invalid constituency ID")
    .optional()
    .nullable(),
  name: z.string().min(2).max(100),
  code: z.string().max(50).optional().nullable(),
  type: z.enum(["TOWN", "VILLAGE"]).default("VILLAGE"),
  nature: z.enum(["URBAN", "RURAL"]).default("RURAL"),
  description: z.string().optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  boundary: geoJsonSchema,
});

export const updateTownVillageSchema = createTownVillageSchema.partial();

// Modified ward creation/update schemas for Phase 3 boundary geometry inclusion
export const createWardGeomSchema = z.object({
  wardNumber: z.number().int().positive(),
  name: z.string().min(2).max(100),
  code: z.string().max(50).optional().nullable(),
  zone: z.string().optional().nullable(),
  areaType: z.string().default("Urban"),
  pincode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  boundaryGeoJson: geoJsonSchema,
  constituencyId: z.string().cuid().optional().nullable(),
  townVillageId: z.string().cuid().optional().nullable(),
});

export const updateWardGeomSchema = createWardGeomSchema.partial();

export const createPollingLocationSchema = z.object({
  name: z.string().min(2).max(100),
  address: z.string().max(500).optional().nullable(),
  pincode: z.string().max(10).optional().nullable(),
  buildingName: z.string().max(150).optional().nullable(),
  landmark: z.string().max(150).optional().nullable(),
  isAccessible: z.boolean().default(true),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

export const updatePollingLocationSchema =
  createPollingLocationSchema.partial();

export const createBoothSchema = z.object({
  constituencyId: z.string().cuid("Invalid constituency ID"),
  wardId: z.string().cuid("Invalid ward ID").optional().nullable(),
  townVillageId: z
    .string()
    .cuid("Invalid town/village ID")
    .optional()
    .nullable(),
  pollingLocationId: z
    .string()
    .cuid("Invalid polling location ID")
    .optional()
    .nullable(),
  boothNumber: z
    .number()
    .int()
    .positive("Booth number must be a positive integer"),
  boothName: z.string().min(2).max(100),
  code: z.string().max(50).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  boundary: geoJsonSchema,
});

export const updateBoothSchema = createBoothSchema.partial();

export const geographyImportSchema = z.object({
  type: z.enum([
    "constituency",
    "district",
    "block",
    "town-village",
    "ward",
    "polling-location",
    "booth",
  ]),
  rows: z.array(z.record(z.any())).min(1, "No data rows provided"),
  fileName: z.string().optional().default("import_data"),
});
