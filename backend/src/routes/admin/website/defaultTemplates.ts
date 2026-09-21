export interface TemplateDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  thumbnail: string;
  globalStyles: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      surface: string;
      text: string;
      muted: string;
    };
    typography: {
      headingFont: string;
      bodyFont: string;
    };
    radius: string;
    containerWidth: string;
  };
  pages: {
    title: string;
    slug: string;
    isHomePage: boolean;
    seoTitle?: string;
    seoDescription?: string;
    content: {
      version: number;
      sections: any[];
    };
  }[];
  menuItems: {
    label: string;
    url: string;
    target?: string;
  }[];
}

export const DEFAULT_WEBSITE_TEMPLATES: TemplateDefinition[] = [
  {
    id: "modern-representative",
    name: "Modern Representative",
    category: "Professional & Governance",
    description: "Sleek, modern portal focused on parliamentary work, public grievance lodging, and constituent engagement.",
    thumbnail: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&auto=format&fit=crop&q=80",
    globalStyles: {
      colors: {
        primary: "#1e3a8a", // Navy Blue
        secondary: "#0284c7",
        accent: "#f59e0b",
        background: "#ffffff",
        surface: "#f8fafc",
        text: "#0f172a",
        muted: "#64748b",
      },
      typography: {
        headingFont: "Outfit, Inter, sans-serif",
        bodyFont: "Inter, sans-serif",
      },
      radius: "16px",
      containerWidth: "1240px",
    },
    menuItems: [
      { label: "Home", url: "/" },
      { label: "About Representative", url: "/about" },
      { label: "Development Works", url: "/projects" },
      { label: "Public Grievances", url: "/grievance" },
      { label: "Welfare Schemes", url: "/schemes" },
      { label: "Events & Janata Darbar", url: "/events" },
      { label: "Contact Office", url: "/contact" },
    ],
    pages: [
      {
        title: "Home",
        slug: "home",
        isHomePage: true,
        seoTitle: "Official Portal - Member of Legislative Assembly / Parliament",
        seoDescription: "Welcome to the official constituent development and citizen service portal.",
        content: {
          version: 1,
          sections: [
            {
              id: "hero-section",
              type: "representative-hero",
              props: {
                badge: "Official Constituency Portal",
                headline: "Dedicated to the Progress & Prosperity of Our People",
                subheadline: "Transparency, rapid grievance resolution, and modern infrastructure development in our constituency.",
                primaryButtonText: "Submit Citizen Grievance",
                primaryButtonLink: "/grievance",
                secondaryButtonText: "View Development Projects",
                secondaryButtonLink: "/projects",
                emergencyHelpline: "1800-123-4567",
              },
            },
            {
              id: "stats-section",
              type: "constituency-stats",
              props: {
                title: "Constituency at a Glance",
                subtitle: "Key demographic and development metrics across our region",
                autoFetchMetrics: true,
              },
            },
            {
              id: "projects-preview",
              type: "development-projects",
              props: {
                title: "Major Development Works & Infrastructure",
                subtitle: "Transforming healthcare, roads, education, and water supply across wards",
                limit: 4,
                layout: "grid",
                ctaText: "View All Projects",
                ctaLink: "/projects",
              },
            },
            {
              id: "grievance-cta",
              type: "grievance-cta",
              props: {
                title: "Have a Civic Problem or Infrastructure Issue?",
                description: "Our constituency cell reviews, escalates, and monitors every citizen complaint with direct department follow-ups.",
                buttonText: "Lodge Your Grievance Online",
                buttonLink: "/grievance",
                helplineNumber: "+91 98765 43210",
              },
            },
            {
              id: "schemes-preview",
              type: "government-schemes",
              props: {
                title: "Welfare Schemes & Citizen Benefits",
                subtitle: "Explore government welfare subsidies, pensions, and educational aid",
                limit: 3,
                layout: "cards",
              },
            },
            {
              id: "events-preview",
              type: "upcoming-events",
              props: {
                title: "Janata Darbar & Public Engagements",
                subtitle: "Meet your representative, join community inspections and village sammelans",
                limit: 3,
              },
            },
          ],
        },
      },
      {
        title: "About",
        slug: "about",
        isHomePage: false,
        seoTitle: "About the Representative - Leadership & Vision",
        seoDescription: "Learn about our representative's journey, legislative track record, and vision.",
        content: {
          version: 1,
          sections: [
            {
              id: "about-bio",
              type: "representative-profile",
              props: {
                title: "Serving with Integrity, Passion & Vision",
                bio: "Dedicated public servant committed to grassroots empowerment, educational excellence, healthcare access, and farmer prosperity.",
                showKeyMilestones: true,
                showVisionPoints: true,
              },
            },
          ],
        },
      },
      {
        title: "Development Works",
        slug: "projects",
        isHomePage: false,
        seoTitle: "Constituency Development Projects & Public Works",
        seoDescription: "Track all running, completed, and upcoming developmental works funded through MPLADS/MLALADS.",
        content: {
          version: 1,
          sections: [
            {
              id: "all-projects",
              type: "development-projects",
              props: {
                title: "Constituency Development Projects",
                subtitle: "Live tracking of all civil, healthcare, education, and road projects",
                limit: 12,
                layout: "grid",
              },
            },
          ],
        },
      },
      {
        title: "Public Grievances",
        slug: "grievance",
        isHomePage: false,
        seoTitle: "Submit Public Grievance - Constituency Cell",
        seoDescription: "Directly lodge your complaints regarding electricity, water, roads, or municipal services.",
        content: {
          version: 1,
          sections: [
            {
              id: "grievance-form-section",
              type: "grievance-form-block",
              props: {
                title: "Constituent Grievance Redressal Portal",
                subtitle: "Submit your problem with location and category. You will receive an SMS tracking ID.",
                showTrackingBox: true,
              },
            },
          ],
        },
      },
      {
        title: "Contact Office",
        slug: "contact",
        isHomePage: false,
        seoTitle: "Contact Camp Office & Public Information Center",
        seoDescription: "Reach our legislative camp office, constituency nodal officers, and social media handles.",
        content: {
          version: 1,
          sections: [
            {
              id: "office-locations",
              type: "office-directory",
              props: {
                title: "Constituency Camp Offices & Helpdesks",
                subtitle: "Visit our nearest office during public consultation hours",
                showMap: true,
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: "vikas-development",
    name: "Vikas & Infrastructure Focus",
    category: "Development & Civil Works",
    description: "High-impact layout showcasing major roads, flyovers, water pipelines, smart schools, and sanctioned funds.",
    thumbnail: "https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?w=600&auto=format&fit=crop&q=80",
    globalStyles: {
      colors: {
        primary: "#065f46", // Deep Emerald
        secondary: "#0d9488",
        accent: "#d97706",
        background: "#ffffff",
        surface: "#f0fdf4",
        text: "#064e3b",
        muted: "#475569",
      },
      typography: {
        headingFont: "Inter, sans-serif",
        bodyFont: "Inter, sans-serif",
      },
      radius: "12px",
      containerWidth: "1200px",
    },
    menuItems: [
      { label: "Home", url: "/" },
      { label: "Development Map", url: "/projects" },
      { label: "Sanctioned Funds", url: "/funds" },
      { label: "Citizen Grievances", url: "/grievance" },
      { label: "Contact", url: "/contact" },
    ],
    pages: [
      {
        title: "Home",
        slug: "home",
        isHomePage: true,
        content: {
          version: 1,
          sections: [
            {
              id: "dev-hero",
              type: "representative-hero",
              props: {
                badge: "Mission Vikas & Modern Infrastructure",
                headline: "Building Modern Infrastructure for a Smarter Constituency",
                subheadline: "100+ projects completed with 100% transparency in fund utilization.",
                primaryButtonText: "Explore Projects",
                primaryButtonLink: "/projects",
                secondaryButtonText: "Lodge Complaint",
                secondaryButtonLink: "/grievance",
              },
            },
            {
              id: "dev-projects",
              type: "development-projects",
              props: {
                title: "Active Civil & Public Works",
                limit: 6,
                layout: "grid",
              },
            },
            {
              id: "dev-stats",
              type: "constituency-stats",
              props: {
                title: "Constituency Milestones",
              },
            },
          ],
        },
      },
    ],
  },
  {
    id: "janata-darbar",
    name: "Janata Darbar & Citizen Centric",
    category: "Public Service & Welfare",
    description: "Designed for open citizen hearings, token bookings, direct appointments, and swift grievance tracking.",
    thumbnail: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=600&auto=format&fit=crop&q=80",
    globalStyles: {
      colors: {
        primary: "#7c2d12", // Warm Rust / Maroon
        secondary: "#c2410c",
        accent: "#ea580c",
        background: "#ffffff",
        surface: "#fff7ed",
        text: "#431407",
        muted: "#78716c",
      },
      typography: {
        headingFont: "Outfit, sans-serif",
        bodyFont: "Inter, sans-serif",
      },
      radius: "14px",
      containerWidth: "1200px",
    },
    menuItems: [
      { label: "Home", url: "/" },
      { label: "Janata Darbar Schedule", url: "/events" },
      { label: "Submit Grievance", url: "/grievance" },
      { label: "Book Appointment", url: "/appointments" },
      { label: "Camp Office", url: "/contact" },
    ],
    pages: [
      {
        title: "Home",
        slug: "home",
        isHomePage: true,
        content: {
          version: 1,
          sections: [
            {
              id: "janata-hero",
              type: "representative-hero",
              props: {
                badge: "Direct Citizen Interaction",
                headline: "Your Voice, Our Priority — Janata Darbar & Grievance Cell",
                subheadline: "Direct citizen hearings every week. Fast resolution with real-time token tracking.",
                primaryButtonText: "Book Hearing Slot",
                primaryButtonLink: "/events",
                secondaryButtonText: "Track Your Grievance",
                secondaryButtonLink: "/grievance",
              },
            },
            {
              id: "janata-events",
              type: "upcoming-events",
              props: {
                title: "Upcoming Janata Darbar Sessions & Public Hearings",
                limit: 4,
              },
            },
            {
              id: "janata-grievance",
              type: "grievance-cta",
              props: {
                title: "Need Administrative Assistance?",
                buttonText: "Submit Issue Now",
                buttonLink: "/grievance",
              },
            },
          ],
        },
      },
    ],
  },
];
