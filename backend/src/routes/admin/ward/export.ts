import { Request, Response, NextFunction } from "express";
import prisma from "../../../lib/prisma.js";
import { sendAdminNotification, buildActivityEmailHtml } from "../../../lib/email.js";

/**
 * GET /api/admin/wards/export
 * Exports wards and all related data to a flat array suitable for CSV conversion.
 * Pass ?id=XXX to export a single ward, otherwise exports all.
 */
export async function exportWards(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const { id } = req.query;

        const whereClause: any = { isDeleted: false };
        if (id && typeof id === "string") {
            whereClause.id = id;
        }

        const wards = await prisma.ward.findMany({
            where: whereClause,
            include: {
                areas: {
                    include: { demographics: true }
                },
                councillors: { where: { isCurrent: true } },
                demographics: { where: { wardAreaId: null } },
            },
            orderBy: { wardNumber: "asc" },
        });

        const flatRows: any[] = [];

        // Keys that match the Bulk Import Template closely
        for (const ward of wards) {
            const wardBase = {
                wardNumber: ward.wardNumber,
                wardName: ward.name,
                wardZone: ward.zone || "",
                wardStatus: ward.status,
                wardAreaType: ward.areaType,
                wardPincode: ward.pincode || "",
                wardDescription: ward.description || "",
                establishedDate: ward.establishedDate ? ward.establishedDate.toISOString() : "",
            };

            const c = ward.councillors?.[0];
            const councillorData = c ? {
                councillorName: c.name,
                councillorPhone: c.phone || "",
                councillorEmail: c.email || "",
                councillorParty: c.partyName || "",
                councillorDesignation: c.designation || "",
                councillorSinceDate: c.sinceDate ? c.sinceDate.toISOString() : ""
            } : {};

            const wd = ward.demographics?.[0];
            const wardDemo = wd ? {
                wd_totalPopulation: wd.totalPopulation || "",
                wd_maleCount: wd.maleCount || "",
                wd_femaleCount: wd.femaleCount || "",
                wd_transgenderCount: wd.transgenderCount || "",
                wd_age0to6: wd.age0to6 || "",
                wd_age7to18: wd.age7to18 || "",
                wd_age19to35: wd.age19to35 || "",
                wd_age36to60: wd.age36to60 || "",
                wd_age60plus: wd.age60plus || "",
                wd_totalHouseholds: wd.totalHouseholds || "",
                wd_bplHouseholds: wd.bplHouseholds || "",
                wd_aplHouseholds: wd.aplHouseholds || "",
                wd_generalCount: wd.generalCount || "",
                wd_obcCount: wd.obcCount || "",
                wd_scCount: wd.scCount || "",
                wd_stCount: wd.stCount || "",
                wd_minorityCount: wd.minorityCount || "",
                wd_otherCount: wd.otherCount || "",
                wd_hinduCount: wd.hinduCount || "",
                wd_muslimCount: wd.muslimCount || "",
                wd_sikhCount: wd.sikhCount || "",
                wd_christianCount: wd.christianCount || "",
                wd_buddhistCount: wd.buddhistCount || "",
                wd_jainCount: wd.jainCount || "",
                wd_otherReligionCount: wd.otherReligionCount || "",
                wd_literacyRate: wd.literacyRate || "",
                wd_maleLiteracyRate: wd.maleLiteracyRate || "",
                wd_femaleLiteracyRate: wd.femaleLiteracyRate || "",
                wd_totalVoters: wd.totalVoters || "",
                wd_maleVoters: wd.maleVoters || "",
                wd_femaleVoters: wd.femaleVoters || "",
            } : {};

            if (ward.areas.length === 0) {
                // Push row even without areas
                flatRows.push({ ...wardBase, ...councillorData, ...wardDemo });
            } else {
                // Create a row for each area (the standard flat schema layout)
                ward.areas.forEach((area, index) => {
                    const areaData = {
                        areaName: area.name,
                        areaType: area.areaType,
                        areaPopulation: area.population || "",
                        areaHouseholds: area.households || "",
                        areaMaleCount: area.maleCount || "",
                        areaFemaleCount: area.femaleCount || "",
                        areaPincode: area.pincode || "",
                        areaLandmark: area.landmark || "",
                        areaDescription: area.description || "",
                    };

                    const ad = area.demographics?.[0];
                    const areaDemo = ad ? {
                        ad_totalPopulation: ad.totalPopulation || "",
                        ad_maleCount: ad.maleCount || "",
                        ad_femaleCount: ad.femaleCount || "",
                        ad_transgenderCount: ad.transgenderCount || "",
                        ad_age0to6: ad.age0to6 || "",
                        ad_age7to18: ad.age7to18 || "",
                        ad_age19to35: ad.age19to35 || "",
                        ad_age36to60: ad.age36to60 || "",
                        ad_age60plus: ad.age60plus || "",
                        ad_totalHouseholds: ad.totalHouseholds || "",
                        ad_bplHouseholds: ad.bplHouseholds || "",
                        ad_aplHouseholds: ad.aplHouseholds || "",
                        ad_generalCount: ad.generalCount || "",
                        ad_obcCount: ad.obcCount || "",
                        ad_scCount: ad.scCount || "",
                        ad_stCount: ad.stCount || "",
                        ad_minorityCount: ad.minorityCount || "",
                        ad_otherCount: ad.otherCount || "",
                        ad_hinduCount: ad.hinduCount || "",
                        ad_muslimCount: ad.muslimCount || "",
                        ad_sikhCount: ad.sikhCount || "",
                        ad_christianCount: ad.christianCount || "",
                        ad_buddhistCount: ad.buddhistCount || "",
                        ad_jainCount: ad.jainCount || "",
                        ad_otherReligionCount: ad.otherReligionCount || "",
                        ad_literacyRate: ad.literacyRate || "",
                        ad_maleLiteracyRate: ad.maleLiteracyRate || "",
                        ad_femaleLiteracyRate: ad.femaleLiteracyRate || "",
                        ad_totalVoters: ad.totalVoters || "",
                        ad_maleVoters: ad.maleVoters || "",
                        ad_femaleVoters: ad.femaleVoters || "",
                    } : {};

                    // Only attach Ward-level Data to the first row to keep it clean (though schema allows repeating it)
                    if (index === 0) {
                        flatRows.push({ ...wardBase, ...councillorData, ...areaData, ...wardDemo, ...areaDemo });
                    } else {
                        flatRows.push({
                            wardNumber: ward.wardNumber,
                            wardName: ward.name,
                            ...areaData,
                            ...areaDemo
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
                tenantId: req.tenantId!,
                userId: req.user!.id,
                userName: req.user!.name || "Unknown",
                action: "EXPORT",
                module: "wards",
                recordCount: flatRows.length,
                details: `Exported ${flatRows.length} ward rows`,
            },
        }).catch(() => {});

        // Send admin notification (fire-and-forget)
        sendAdminNotification(
            req.tenantId!,
            `Data Export: wards by ${req.user!.name || "Unknown"}`,
            buildActivityEmailHtml({
                action: "EXPORT",
                module: "wards",
                userName: req.user!.name || "Unknown",
                recordCount: flatRows.length,
                timestamp: new Date(),
            }),
        );

    } catch (error) {
        next(error);
    }
}
