export function normalizeWardStatus(value?: string) {
    if (!value) return undefined;
    const v = value.trim().toUpperCase();
    const map: Record<string, "ACTIVE" | "INACTIVE" | "PROPOSED" | "DEPRECATED"> = {
        ACTIVE: "ACTIVE",
        INACTIVE: "INACTIVE",
        PROPOSED: "PROPOSED",
        DEPRECATED: "DEPRECATED",
        // Common variations
        "IN ACTIVE": "INACTIVE",
        "IN-ACTIVE": "INACTIVE"
    };
    return map[v];
}

export function normalizeAreaType(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL" | "MIXED_USE" | "SLUM" | "INSTITUTIONAL" | "AGRICULTURAL" | "OTHER"> = {
        RESIDENTIAL: "RESIDENTIAL",
        COMMERCIAL: "COMMERCIAL",
        INDUSTRIAL: "INDUSTRIAL",
        MIXED_USE: "MIXED_USE",
        MIXED: "MIXED_USE",
        SLUM: "SLUM",
        INSTITUTIONAL: "INSTITUTIONAL",
        AGRICULTURAL: "AGRICULTURAL",
        AGRI: "AGRICULTURAL",
        OTHER: "OTHER",
    };
    return map[v];
}

export function normalizeBoolean(value?: any): boolean | undefined {
    if (value === undefined || value === null || value === "") return undefined;
    if (typeof value === "boolean") return value;
    const v = String(value).trim().toUpperCase();
    if (["TRUE", "YES", "1", "ACTIVE", "Y"].includes(v)) return true;
    if (["FALSE", "NO", "0", "INACTIVE", "N"].includes(v)) return false;
    return undefined;
}

export function normalizeProjectStatus(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, "PENDING" | "RUNNING" | "COMPLETED" | "ON_HOLD" | "CANCELLED"> = {
        PENDING: "PENDING",
        RUNNING: "RUNNING",
        ACTIVE: "RUNNING",
        ONGOING: "RUNNING",
        COMPLETED: "COMPLETED",
        DONE: "COMPLETED",
        FINISHED: "COMPLETED",
        ON_HOLD: "ON_HOLD",
        PAUSED: "ON_HOLD",
        CANCELLED: "CANCELLED",
        CANCELED: "CANCELLED",
        STOPPED: "CANCELLED",
    };
    return map[v];
}

export function normalizeFundType(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, "MPLAD" | "MLALAD" | "STATE_FUND" | "CENTRAL_FUND" | "CSR" | "OTHER"> = {
        MPLAD: "MPLAD",
        MLALAD: "MLALAD",
        STATE_FUND: "STATE_FUND",
        STATE: "STATE_FUND",
        CENTRAL_FUND: "CENTRAL_FUND",
        CENTRAL: "CENTRAL_FUND",
        CSR: "CSR",
        OTHER: "OTHER",
    };
    return map[v];
}

export function normalizeCommunityType(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, any> = {
        MARKET: "MARKET",
        SLUM: "SLUM",
        SPORTS_TEAM: "SPORTS_TEAM",
        SPORTS: "SPORTS_TEAM",
        CLUB: "CLUB",
        RWA: "RWA",
        SENIOR_CITIZEN: "SENIOR_CITIZEN",
        SENIOR: "SENIOR_CITIZEN",
        BUDDHIJEEVI: "BUDDHIJEEVI",
        WOMEN_GROUP: "WOMEN_GROUP",
        WOMEN: "WOMEN_GROUP",
        YOUTH_GROUP: "YOUTH_GROUP",
        YOUTH: "YOUTH_GROUP",
        CULTURAL_ORG: "CULTURAL_ORG",
        CULTURAL: "CULTURAL_ORG",
        NGO: "NGO",
        FESTIVAL_COMMITTEE: "FESTIVAL_COMMITTEE",
        FESTIVAL: "FESTIVAL_COMMITTEE",
        TRADE_UNION: "TRADE_UNION",
        TRADE: "TRADE_UNION",
        OTHER: "OTHER",
    };
    return map[v];
}

export function normalizeLeaderCategory(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, any> = {
        PARTY_LEADER: "PARTY_LEADER",
        PARTY: "PARTY_LEADER",
        OPPOSITION_LEADER: "OPPOSITION_LEADER",
        OPPOSITION: "OPPOSITION_LEADER",
        BUREAUCRAT: "BUREAUCRAT",
        COMMUNITY_LEADER: "COMMUNITY_LEADER",
        COMMUNITY: "COMMUNITY_LEADER",
        HEADS: "COMMUNITY_LEADER",
        HEAD: "COMMUNITY_LEADER",
        RELIGIOUS_LEADER: "RELIGIOUS_LEADER",
        RELIGIOUS: "RELIGIOUS_LEADER",
        RELIGIOUS_HEADS: "RELIGIOUS_LEADER",
        RELIGIOUS_HEAD: "RELIGIOUS_LEADER",
        BUSINESS_LEADER: "BUSINESS_LEADER",
        BUSINESS: "BUSINESS_LEADER",
        MEDIA_PERSON: "MEDIA_PERSON",
        MEDIA: "MEDIA_PERSON",
        YOUTH_LEADER: "YOUTH_LEADER",
        YOUTH: "YOUTH_LEADER",
        WOMEN_LEADER: "WOMEN_LEADER",
        WOMEN: "WOMEN_LEADER",
        SENIOR_CITIZEN: "SENIOR_CITIZEN",
        SENIOR: "SENIOR_CITIZEN",
        ACADEMIC: "ACADEMIC",
        LEGAL: "LEGAL",
        MEDICAL: "MEDICAL",
        NGO_HEAD: "NGO_HEAD",
        NGO: "NGO_HEAD",
        TRADE_UNION: "TRADE_UNION",
        TRADE: "TRADE_UNION",
        OTHER: "OTHER",
    };
    return map[v];
}

export function normalizeSchemeStatus(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, "ACTIVE" | "INACTIVE" | "UPCOMING" | "EXPIRED"> = {
        ACTIVE: "ACTIVE",
        INACTIVE: "INACTIVE",
        UPCOMING: "UPCOMING",
        EXPIRED: "EXPIRED",
        PASSED: "EXPIRED",
        CLOSED: "EXPIRED",
        DISABLED: "INACTIVE",
    };
    return map[v];
}

export function normalizeSchemeLevel(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, "CENTRAL" | "STATE" | "LOCAL"> = {
        CENTRAL: "CENTRAL",
        NATIONAL: "CENTRAL",
        UNION: "CENTRAL",
        STATE: "STATE",
        PROVINCIAL: "STATE",
        LOCAL: "LOCAL",
        DISTRICT: "LOCAL",
        MUNICIPAL: "LOCAL",
        WARD: "LOCAL",
    };
    return map[v];
}

export function normalizeMeetingStatus(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, "SCHEDULED" | "COMPLETED" | "CANCELLED"> = {
        SCHEDULED: "SCHEDULED",
        PENDING: "SCHEDULED",
        UPCOMING: "SCHEDULED",
        PLANNED: "SCHEDULED",
        COMPLETED: "COMPLETED",
        DONE: "COMPLETED",
        FINISHED: "COMPLETED",
        CANCELLED: "CANCELLED",
        CANCELED: "CANCELLED",
    };
    return map[v];
}

export function normalizeMeetingType(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, "ONLINE" | "OFFLINE"> = {
        ONLINE: "ONLINE",
        VIRTUAL: "ONLINE",
        ZOOM: "ONLINE",
        MEET: "ONLINE",
        OFFLINE: "OFFLINE",
        PHYSICAL: "OFFLINE",
        IN_PERSON: "OFFLINE",
        PERSON: "OFFLINE",
    };
    return map[v];
}

export function normalizeEventType(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, any> = {
        PUBLIC_MEETING: "PUBLIC_MEETING",
        PUBLIC: "PUBLIC_MEETING",
        JANATA_DARBAR: "JANATA_DARBAR",
        DARBAR: "JANATA_DARBAR",
        CONSTITUENCY_VISIT: "CONSTITUENCY_VISIT",
        VISIT: "CONSTITUENCY_VISIT",
        VILLAGE_VISIT: "VILLAGE_VISIT",
        DEVELOPMENT_INAUGURATION: "DEVELOPMENT_INAUGURATION",
        INAUGURATION: "DEVELOPMENT_INAUGURATION",
        PUBLIC_HEARING: "PUBLIC_HEARING",
        HEARING: "PUBLIC_HEARING",
        OFFICIAL_MEETING: "OFFICIAL_MEETING",
        OFFICIAL: "OFFICIAL_MEETING",
        COMMUNITY_EVENT: "COMMUNITY_EVENT",
        COMMUNITY: "COMMUNITY_EVENT",
        PRESS_CONFERENCE: "PRESS_CONFERENCE",
        PRESS: "PRESS_CONFERENCE",
    };
    return map[v];
}

export function normalizeEventStatus(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, any> = {
        DRAFT: "DRAFT",
        SCHEDULED: "SCHEDULED",
        UPCOMING: "SCHEDULED",
        PLANNED: "SCHEDULED",
        ONGOING: "ONGOING",
        RUNNING: "ONGOING",
        IN_PROGRESS: "ONGOING",
        COMPLETED: "COMPLETED",
        DONE: "COMPLETED",
        CANCELLED: "CANCELLED",
        CANCELED: "CANCELLED",
        POSTPONED: "POSTPONED",
    };
    return map[v];
}

export function normalizeEventMode(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, "OFFLINE" | "ONLINE" | "HYBRID"> = {
        OFFLINE: "OFFLINE",
        PHYSICAL: "OFFLINE",
        IN_PERSON: "OFFLINE",
        ONLINE: "ONLINE",
        VIRTUAL: "ONLINE",
        HYBRID: "HYBRID",
        MIXED: "HYBRID",
    };
    return map[v];
}

export function normalizeJanataSessionType(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, "JANATA_DARBAR" | "PUBLIC_HEARING"> = {
        JANATA_DARBAR: "JANATA_DARBAR",
        DARBAR: "JANATA_DARBAR",
        JANATA: "JANATA_DARBAR",
        PUBLIC_HEARING: "PUBLIC_HEARING",
        HEARING: "PUBLIC_HEARING",
    };
    return map[v];
}

export function normalizeJanataSessionStatus(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED"> = {
        SCHEDULED: "SCHEDULED",
        PLANNED: "SCHEDULED",
        UPCOMING: "SCHEDULED",
        ONGOING: "ONGOING",
        RUNNING: "ONGOING",
        COMPLETED: "COMPLETED",
        DONE: "COMPLETED",
        CANCELLED: "CANCELLED",
        CANCELED: "CANCELLED",
    };
    return map[v];
}

export function normalizeJanataTokenStatus(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, "WAITING" | "CALLED" | "IN_PROGRESS" | "RESOLVED" | "REFERRED" | "ABSENT"> = {
        WAITING: "WAITING",
        PENDING: "WAITING",
        CALLED: "CALLED",
        IN_PROGRESS: "IN_PROGRESS",
        PROCESSING: "IN_PROGRESS",
        RESOLVED: "RESOLVED",
        CLOSED: "RESOLVED",
        REFERRED: "REFERRED",
        ABSENT: "ABSENT",
        MISSED: "ABSENT",
    };
    return map[v];
}

export function normalizeAppointmentType(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, any> = {
        MLA_MP_MEETING: "MLA_MP_MEETING",
        MP_MLA_MEETING: "MLA_MP_MEETING",
        MLA_MEETING: "MLA_MP_MEETING",
        MP_MEETING: "MLA_MP_MEETING",
        PUBLIC_GRIEVANCE: "PUBLIC_GRIEVANCE",
        GRIEVANCE: "PUBLIC_GRIEVANCE",
        OFFICE_APPOINTMENT: "OFFICE_APPOINTMENT",
        OFFICE: "OFFICE_APPOINTMENT",
        DEVELOPMENT_DISCUSSION: "DEVELOPMENT_DISCUSSION",
        DEVELOPMENT: "DEVELOPMENT_DISCUSSION",
        OFFICIAL_MEETING: "OFFICIAL_MEETING",
        OFFICIAL: "OFFICIAL_MEETING",
    };
    return map[v];
}

export function normalizeAppointmentStatus(value?: string) {
    if (!value) return undefined;
    const v = value.trim().replace(/\s+/g, '_').toUpperCase();
    const map: Record<string, any> = {
        PENDING: "PENDING",
        REQUESTED: "PENDING",
        APPROVED: "APPROVED",
        CONFIRMED: "APPROVED",
        ACCEPTED: "APPROVED",
        REJECTED: "REJECTED",
        DECLINED: "REJECTED",
        RESCHEDULED: "RESCHEDULED",
        COMPLETED: "COMPLETED",
        DONE: "COMPLETED",
        CANCELLED: "CANCELLED",
        CANCELED: "CANCELLED",
    };
    return map[v];
}


