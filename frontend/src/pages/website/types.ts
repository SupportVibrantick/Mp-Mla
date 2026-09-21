export type WebsiteStatus = "DRAFT" | "PUBLISHED" | "MAINTENANCE" | "ARCHIVED";
export type PageStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type DomainType = "SUBDOMAIN" | "CUSTOM";
export type SSLStatus = "PENDING" | "ACTIVE" | "FAILED";

export type SectionType =
  | "navbar"
  | "footer"
  | "hero"
  | "representative-hero"
  | "representative_hero"
  | "dev-hero"
  | "stats"
  | "constituency-stats"
  | "constituency_stats"
  | "projects"
  | "development-projects"
  | "development_projects"
  | "all-projects"
  | "dev-projects"
  | "grievance_cta"
  | "grievance-cta"
  | "grievance_form"
  | "grievance-form-block"
  | "grievance_form_block"
  | "schemes"
  | "government-schemes"
  | "government_schemes"
  | "schemes-preview"
  | "events"
  | "upcoming-events"
  | "upcoming_events"
  | "events-preview"
  | "leader_profile"
  | "representative_profile"
  | "representative-profile"
  | "about-bio"
  | "about_bio"
  | "about"
  | "about_representative"
  | "about-representative"
  | "custom_box"
  | "custom-box"
  | "testimonials"
  | "citizen-testimonials"
  | "citizen_feedback"
  | "press_news"
  | "latest-news"
  | "media_coverage"
  | "gallery"
  | "contact_office"
  | "contact-office"
  | "office-directory"
  | "office-locations"
  | "contact"
  | "rich_text"
  | "video_embed"
  | "features_grid"
  | "faq_accordion"
  | "newsletter"
  | (string & {});

export interface SectionBlock {
  id: string;
  type: SectionType;
  title?: string;
  subtitle?: string;
  props: Record<string, any>;
  styles?: {
    backgroundColor?: string;
    textColor?: string;
    paddingTop?: string;
    paddingBottom?: string;
    textAlign?: "left" | "center" | "right";
    containerWidth?: "narrow" | "default" | "full";
    backgroundImage?: string;
  };
}

export interface WebsitePageData {
  id: string;
  websiteId: string;
  title: string;
  slug: string;
  isHomePage?: boolean;
  isHome?: boolean;
  isPublished?: boolean;
  status: PageStatus;
  order?: number;
  sortOrder?: number;
  content?: {
    version?: number;
    sections: SectionBlock[];
  };
  sections?: SectionBlock[];
  seoTitle?: string;
  seoDescription?: string;
  seoImageUrl?: string;
  metaTitle?: string;
  metaDesc?: string;
  keywords?: string[];
  ogImage?: string;
  customCss?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteDomainData {
  id: string;
  websiteId: string;
  domain: string;
  type: DomainType;
  isPrimary: boolean;
  isVerified: boolean;
  sslStatus: SSLStatus;
  verifiedAt?: string;
  createdAt: string;
}

export interface WebsiteDeploymentData {
  id: string;
  websiteId: string;
  version: number;
  status: "PENDING" | "BUILDING" | "PUBLISHED" | "FAILED" | "ROLLED_BACK";
  snapshot: any;
  notes?: string;
  publishedAt?: string;
  createdAt: string;
}

export interface WebsiteData {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  logoUrl?: string;
  status: WebsiteStatus;
  primaryDomain?: string;
  themeConfig: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    fontFamily: string;
    headerStyle?: "sticky" | "fixed" | "standard";
    footerStyle?: "dark" | "light" | "colored";
    partyBadge?: string;
  };
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    whatsapp?: string;
    telegram?: string;
  };
  seoMeta: {
    title?: string;
    description?: string;
    ogImage?: string;
    favicon?: string;
  };
  customCss?: string;
  customJs?: string;
  pages?: WebsitePageData[];
  domains?: WebsiteDomainData[];
  deployments?: WebsiteDeploymentData[];
  _count?: {
    pages?: number;
    domains?: number;
    deployments?: number;
    forms?: number;
    assets?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
  themeConfig: Record<string, any>;
  pages: Array<{
    title: string;
    slug: string;
    isHome: boolean;
    sections: SectionBlock[];
  }>;
}
