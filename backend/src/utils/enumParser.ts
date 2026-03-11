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
        RELIGIOUS_LEADER: "RELIGIOUS_LEADER",
        RELIGIOUS: "RELIGIOUS_LEADER",
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

