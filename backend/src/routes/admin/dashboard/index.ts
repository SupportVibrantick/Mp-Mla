import { Router } from "express";
import { Request, Response } from "express";
import prisma from "../../../lib/prisma.js";
import { authenticate } from "../../../middleware/auth.js";

const router = Router();
router.use(authenticate);

// GET /api/admin/dashboard/overview — Main KPIs
router.get("/overview", async (_req: Request, res: Response): Promise<void> => {
    try {
        const [
            totalWards, totalProjects, totalGrievances, totalInstitutions,
            pendingGrievances, resolvedGrievances, runningProjects, completedProjects,
            totalUsers, totalSchemes,
        ] = await Promise.all([
            prisma.ward.count(),
            prisma.project.count(),
            prisma.grievance.count(),
            prisma.institution.count(),
            prisma.grievance.count({ where: { status: "OPEN" } }),
            prisma.grievance.count({ where: { status: "RESOLVED" } }),
            prisma.project.count({ where: { status: "RUNNING" } }),
            prisma.project.count({ where: { status: "COMPLETED" } }),
            prisma.user.count({ where: { isActive: true } }),
            prisma.scheme.count({ where: { status: "ACTIVE" } }),
        ]);

        res.json({
            success: true,
            data: {
                totalWards, totalProjects, totalGrievances, totalInstitutions,
                pendingGrievances, resolvedGrievances, runningProjects, completedProjects,
                totalUsers, totalSchemes,
                grievanceResolutionRate: totalGrievances > 0
                    ? ((resolvedGrievances / totalGrievances) * 100).toFixed(1) : "0",
                projectCompletionRate: totalProjects > 0
                    ? ((completedProjects / totalProjects) * 100).toFixed(1) : "0",
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/admin/dashboard/grievance-stats
router.get("/grievance-stats", async (_req: Request, res: Response): Promise<void> => {
    try {
        const statusCounts = await prisma.grievance.groupBy({
            by: ["status"],
            _count: { status: true },
        });

        const priorityCounts = await prisma.grievance.groupBy({
            by: ["priority"],
            _count: { priority: true },
        });

        const categoryCounts = await prisma.grievance.groupBy({
            by: ["category"],
            _count: { category: true },
            orderBy: { _count: { category: "desc" } },
            take: 10,
        });

        // Average resolution time (resolved grievances only)
        const resolvedGrievances = await prisma.grievance.findMany({
            where: { status: "RESOLVED", resolvedAt: { not: null } },
            select: { createdAt: true, resolvedAt: true },
        });

        let avgResolutionDays = 0;
        if (resolvedGrievances.length > 0) {
            const totalDays = resolvedGrievances.reduce((sum, g) => {
                const days = (new Date(g.resolvedAt!).getTime() - new Date(g.createdAt).getTime()) / (1000 * 60 * 60 * 24);
                return sum + days;
            }, 0);
            avgResolutionDays = Math.round((totalDays / resolvedGrievances.length) * 10) / 10;
        }

        res.json({
            success: true,
            data: {
                byStatus: statusCounts.map((s) => ({ status: s.status, count: s._count.status })),
                byPriority: priorityCounts.map((p) => ({ priority: p.priority, count: p._count.priority })),
                byCategory: categoryCounts.map((c) => ({ category: c.category, count: c._count.category })),
                avgResolutionDays,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/admin/dashboard/project-stats
router.get("/project-stats", async (_req: Request, res: Response): Promise<void> => {
    try {
        const statusCounts = await prisma.project.groupBy({
            by: ["status"],
            _count: { status: true },
        });

        const budgetStats = await prisma.project.aggregate({
            _sum: { budgetReleased: true, budgetSanctioned: true, budgetUsed: true },
        });

        const departmentCounts = await prisma.project.groupBy({
            by: ["department"],
            _count: { department: true },
            _sum: { budgetSanctioned: true, budgetUsed: true },
            orderBy: { _count: { department: "desc" } },
            take: 10,
        });

        res.json({
            success: true,
            data: {
                byStatus: statusCounts.map((s) => ({ status: s.status, count: s._count.status })),
                budget: {
                    totalReleased: budgetStats._sum.budgetReleased || 0,
                    totalSanctioned: budgetStats._sum.budgetSanctioned || 0,
                    totalUsed: budgetStats._sum.budgetUsed || 0,
                    utilization: budgetStats._sum.budgetSanctioned
                        ? (((budgetStats._sum.budgetUsed || 0) / budgetStats._sum.budgetSanctioned) * 100).toFixed(1)
                        : "0",
                },
                byDepartment: departmentCounts.map((d) => ({
                    department: d.department,
                    count: d._count.department,
                    budgetSanctioned: d._sum.budgetSanctioned || 0,
                    budgetUsed: d._sum.budgetUsed || 0,
                })),
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/admin/dashboard/ward-comparison
router.get("/ward-comparison", async (_req: Request, res: Response): Promise<void> => {
    try {
        const wards = await prisma.ward.findMany({
            include: {
                _count: { select: { projects: true, grievances: true, institutions: true } },
            },
            orderBy: { name: "asc" },
        });

        res.json({
            success: true,
            data: wards.map((w) => ({
                id: w.id,
                name: w.name,
                population: w.population,
                projects: w._count.projects,
                grievances: w._count.grievances,
                institutions: w._count.institutions,
            })),
        });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/admin/dashboard/recent-activity
router.get("/recent-activity", async (_req: Request, res: Response): Promise<void> => {
    try {
        const recentLogs = await prisma.auditLog.findMany({
            take: 20,
            orderBy: { createdAt: "desc" },
            include: { user: { select: { id: true, name: true, role: true } } },
        });

        res.json({ success: true, data: recentLogs });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
