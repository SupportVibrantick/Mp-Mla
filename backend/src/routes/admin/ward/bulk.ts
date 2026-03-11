import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import {
    createAuditLog,
    getRequestMeta,
} from "../../../middleware/auditLog.js";
import { normalizeWardStatus, normalizeAreaType } from "../../../utils/enumParser.js";

/**
 * POST /api/admin/wards/bulk
 * Bulk imports wards with flattened flat structure using upsert logic.
 */
export async function bulkCreateWards(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const rawRows = req.body;

        if (!Array.isArray(rawRows) || rawRows.length === 0) {
            res.status(400).json({ success: false, message: "Request body must be a non-empty array." });
            return;
        }

        // Group rows by wardNumber
        const groupedWards: Record<number, any[]> = {};
        for (const row of rawRows) {
            const wnum = parseInt(row.wardNumber, 10);
            if (isNaN(wnum)) continue;
            if (!groupedWards[wnum]) groupedWards[wnum] = [];
            groupedWards[wnum].push(row);
        }

        const upsertedWards = [];
        const errors = [];

        // Helper to extract first truthy value for a field across rows
        const setIfPresent = (obj: any, key: string, rowKey: string, rows: any[], type: 'string' | 'number' | 'date' = 'string') => {
            for (const r of rows) {
                if (r[rowKey] !== undefined && r[rowKey] !== null && r[rowKey] !== "") {
                    if (type === 'number') obj[key] = Number(r[rowKey]);
                    else if (type === 'date') obj[key] = new Date(r[rowKey]);
                    else obj[key] = String(r[rowKey]);
                    break;
                }
            }
        };

        for (const [wardNumberStr, rows] of Object.entries(groupedWards)) {
            const wardNumber = parseInt(wardNumberStr, 10);
            try {
                // Find if ward exists by wardNumber OR Name
                const wardNameMatch = rows.find(r => r.wardName)?.wardName;
                const existingWard = await prisma.ward.findFirst({
                    where: {
                        OR: [
                            { wardNumber },
                            { name: wardNameMatch ? String(wardNameMatch) : undefined }
                        ].filter(Boolean) as any
                    },
                    include: {
                        areas: true,
                        councillors: { where: { isCurrent: true } },
                        demographics: { where: { wardAreaId: null } }
                    }
                });

                const wardUpdateData: any = {};
                setIfPresent(wardUpdateData, 'name', 'wardName', rows);
                setIfPresent(wardUpdateData, 'zone', 'wardZone', rows);
                const wardStatus = normalizeWardStatus(rows[0]?.wardStatus);
                if (wardStatus) wardUpdateData.status = wardStatus;
                const wardAreaType = rows[0]?.wardAreaType; // this is a string in Ward model, not enum
                setIfPresent(wardUpdateData, 'areaType', 'wardAreaType', rows);
                setIfPresent(wardUpdateData, 'pincode', 'wardPincode', rows);
                setIfPresent(wardUpdateData, 'description', 'wardDescription', rows);
                setIfPresent(wardUpdateData, 'establishedDate', 'establishedDate', rows, 'date');

                const wardDemographicsUpdate: any = {};
                for (const r of rows) {
                    for (const k of Object.keys(r)) {
                        if (k.startsWith('wd_') && r[k] !== undefined && r[k] !== "") {
                            const demoKey = k.replace('wd_', '');
                            if (!isNaN(Number(r[k]))) {
                                wardDemographicsUpdate[demoKey] = Number(r[k]);
                            } else {
                                wardDemographicsUpdate[demoKey] = r[k];
                            }
                        }
                    }
                }

                const ward = await prisma.$transaction(async (tx) => {
                    let currentWardId;
                    let currentWard;

                    if (existingWard) {
                        if (Object.keys(wardUpdateData).length > 0) {
                            currentWard = await tx.ward.update({
                                where: { id: existingWard.id },
                                data: wardUpdateData
                            });
                        } else {
                            currentWard = existingWard;
                        }
                        currentWardId = existingWard.id;
                    } else {
                        if (!wardUpdateData.name) throw new Error("wardName is required for new wards.");
                        currentWard = await tx.ward.create({
                            data: {
                                wardNumber,
                                name: wardUpdateData.name,
                                zone: wardUpdateData.zone,
                                status: wardUpdateData.status || "ACTIVE",
                                areaType: wardUpdateData.areaType || "Urban",
                                pincode: wardUpdateData.pincode,
                                description: wardUpdateData.description,
                                establishedDate: wardUpdateData.establishedDate,
                            }
                        });
                        currentWardId = currentWard.id;
                    }

                    // Handle Councillor
                    const councillorUpdate: any = {};
                    setIfPresent(councillorUpdate, 'name', 'councillorName', rows);
                    setIfPresent(councillorUpdate, 'phone', 'councillorPhone', rows);
                    setIfPresent(councillorUpdate, 'email', 'councillorEmail', rows);
                    setIfPresent(councillorUpdate, 'partyName', 'councillorParty', rows);
                    setIfPresent(councillorUpdate, 'designation', 'councillorDesignation', rows);

                    if (councillorUpdate.name) {
                        if (existingWard && existingWard.councillors && existingWard.councillors.length > 0) {
                            await tx.wardCouncillor.update({
                                where: { id: existingWard.councillors[0].id },
                                data: councillorUpdate
                            });
                        } else {
                            await tx.wardCouncillor.create({
                                data: {
                                    wardId: currentWardId,
                                    isCurrent: true,
                                    ...councillorUpdate,
                                    designation: councillorUpdate.designation || "Ward Councillor"
                                }
                            });
                        }
                    }

                    // Handle Areas
                    const processedAreas = new Set<string>();
                    for (const r of rows) {
                        const aName = r.areaName;
                        if (!aName || processedAreas.has(String(aName))) continue;
                        processedAreas.add(String(aName));

                        const existingArea = existingWard?.areas.find(a => a.name === String(aName));
                        const aUpdate: any = {};
                        const aStatus = normalizeAreaType(r.areaType);
                        if (aStatus) aUpdate.areaType = aStatus;
                        if (r.areaPopulation !== undefined) aUpdate.population = Number(r.areaPopulation);
                        if (r.areaHouseholds !== undefined) aUpdate.households = Number(r.areaHouseholds);
                        if (r.areaMaleCount !== undefined) aUpdate.maleCount = Number(r.areaMaleCount);
                        if (r.areaFemaleCount !== undefined) aUpdate.femaleCount = Number(r.areaFemaleCount);
                        if (r.areaPincode) aUpdate.pincode = String(r.areaPincode);
                        if (r.areaLandmark) aUpdate.landmark = String(r.areaLandmark);
                        if (r.areaDescription) aUpdate.description = String(r.areaDescription);

                        let currentAreaId;
                        if (existingArea) {
                            await tx.wardArea.update({
                                where: { id: existingArea.id },
                                data: aUpdate
                            });
                            currentAreaId = existingArea.id;
                        } else {
                            const createdArea = await tx.wardArea.create({
                                data: {
                                    wardId: currentWardId,
                                    name: String(aName),
                                    ...aUpdate,
                                    areaType: aUpdate.areaType || "RESIDENTIAL"
                                }
                            });
                            currentAreaId = createdArea.id;
                        }

                        // Handle Area Demographics
                        const adUpdate: any = {};
                        for (const k of Object.keys(r)) {
                            if (k.startsWith('ad_') && r[k] !== undefined && r[k] !== "") {
                                const demoKey = k.replace('ad_', '');
                                if (!isNaN(Number(r[k]))) adUpdate[demoKey] = Number(r[k]);
                                else adUpdate[demoKey] = r[k];
                            }
                        }
                        if (Object.keys(adUpdate).length > 0) {
                            const existingAd = await tx.demographics.findFirst({
                                where: { wardId: currentWardId, wardAreaId: currentAreaId }
                            });
                            if (existingAd) {
                                await tx.demographics.update({
                                    where: { id: existingAd.id },
                                    data: adUpdate
                                });
                            } else {
                                await tx.demographics.create({
                                    data: {
                                        wardId: currentWardId,
                                        wardAreaId: currentAreaId,
                                        ...adUpdate
                                    }
                                });
                            }
                        }
                    }

                    // Handle Ward Demographics update
                    if (Object.keys(wardDemographicsUpdate).length > 0) {
                        const existingWd = existingWard?.demographics?.[0];
                        if (existingWd) {
                            await tx.demographics.update({
                                where: { id: existingWd.id },
                                data: wardDemographicsUpdate
                            });
                        } else {
                            await tx.demographics.create({
                                data: {
                                    wardId: currentWardId,
                                    wardAreaId: null,
                                    ...wardDemographicsUpdate
                                }
                            });
                        }
                    }

                    // Recompute dynamic aggregates summing area properties
                    const allAreas = await tx.wardArea.findMany({ where: { wardId: currentWardId, isActive: true } });
                    if (allAreas.length > 0) {
                        await tx.ward.update({
                            where: { id: currentWardId },
                            data: {
                                totalPopulation: allAreas.reduce((s, a) => s + (a.population || 0), 0),
                                totalHouseholds: allAreas.reduce((s, a) => s + (a.households || 0), 0),
                                totalMale: allAreas.reduce((s, a) => s + (a.maleCount || 0), 0),
                                totalFemale: allAreas.reduce((s, a) => s + (a.femaleCount || 0), 0),
                                totalAreas: allAreas.length,
                            }
                        });
                    }

                    return currentWard;
                });

                await createAuditLog({
                    userId: req.user!.id,
                    action: existingWard ? "UPDATE" : "CREATE",
                    module: "wards",
                    recordId: ward.id,
                    description: `Bulk ${existingWard ? 'updated' : 'created'} ward #${ward.wardNumber} "${ward.name}"`,
                    newData: {
                        name: ward.name,
                        wardNumber: ward.wardNumber,
                        upsertType: existingWard ? "UPDATE" : "CREATE"
                    },
                    ...getRequestMeta(req),
                });

                upsertedWards.push(ward);
            } catch (err: any) {
                errors.push({
                    wardNumber,
                    error: err.message || "Failed to upsert ward"
                });
            }
        }

        res.status(200).json({
            success: true,
            message: `Bulk import completed. Upserted ${upsertedWards.length} wards. ${errors.length > 0 ? `Failed ${errors.length} wards.` : ''}`,
            data: {
                upsertedCount: upsertedWards.length,
                failedCount: errors.length,
                errors,
            },
        });

    } catch (err) {
        next(err);
    }
}
