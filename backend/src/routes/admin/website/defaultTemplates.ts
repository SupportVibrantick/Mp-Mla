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

const SINGLE_PAGE_SECTIONS = [
  {
    id: "navbar-section",
    type: "navbar",
    props: {
      brandName: "Hon'ble Representative",
      brandSubtitle: "Official Leader Portal",
      logoText: "R",
      logoUrl: "",
      showHelpline: false,
      helplineText: "",
      primaryButtonText: "",
      primaryButtonLink: "",
      links: [
        { label: "Home", url: "#hero" },
        { label: "Biography", url: "#bio" },
        { label: "Vision & Pillars", url: "#vision" },
        { label: "Milestones", url: "#stats" },
        { label: "Photo Gallery", url: "#gallery" },
        { label: "Press & Speeches", url: "#press" },
        { label: "Contact Office", url: "#contact" },
      ],
    },
    styles: {
      backgroundColor: "#ffffff",
      textColor: "#0f172a",
      paddingTop: "0.75rem",
      paddingBottom: "0.75rem",
    },
  },
  {
    id: "hero-section",
    type: "hero",
    props: {
      tagline: "OFFICIAL LEADER PORTAL & PUBLIC SERVICE",
      title: "Serving with Vision, Unwavering Integrity & Dedication",
      subtitle: "Dedicated to transformative public service, parliamentary excellence, and the holistic development of our constituency.",
      primaryButtonText: "Read Biography",
      primaryButtonLink: "#bio",
      secondaryButtonText: "Connect with Secretariat",
      secondaryButtonLink: "#contact",
      leaderName: "Hon'ble Representative",
      leaderTitle: "Member of Parliament / Legislative Assembly",
      leaderBadge: "Official Representative Portal",
      leaderImage: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80",
    },
    styles: {
      paddingTop: "4.5rem",
      paddingBottom: "4.5rem",
    },
  },
  {
    id: "profile-section",
    type: "representative_profile",
    props: {
      tagline: "BIOGRAPHY & LEADERSHIP JOURNEY",
      title: "A Lifetime Devoted to Grassroots Service & National Progress",
      subtitle: "Leading with principles, empowering every citizen, and championing progressive governance at every level.",
      bio: "Representing our constituency with uncompromising integrity. Spearheading major developmental initiatives, advocating for constituent rights in parliament, and fostering inclusive growth across all communities.",
      leaderName: "Hon'ble Representative",
      leaderTitle: "Member of Parliament / Legislative Assembly",
      leaderImage: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80",
      experienceYears: "20+",
      constituencyName: "Constituency Region",
      visionPoints: [
        { title: "Principled Governance", desc: "Transparent, accountable, and citizen-centric public leadership." },
        { title: "Youth & Educational Empowerment", desc: "Digital smart classrooms, modern sports infrastructure, and skill development." },
        { title: "Farmer & Rural Prosperity", desc: "Direct agricultural support, micro-irrigation, and paved road connectivity." },
        { title: "Universal Healthcare & Welfare", desc: "Accessible health camps, subsidized care, and citizen empowerment programs." },
      ],
      primaryButtonText: "Media & Speeches",
      primaryButtonLink: "#press",
      secondaryButtonText: "Contact Secretariat",
      secondaryButtonLink: "#contact",
    },
    styles: {
      paddingTop: "5rem",
      paddingBottom: "5rem",
      backgroundColor: "#ffffff",
    },
  },
  {
    id: "stats-section",
    type: "stats",
    props: {
      title: "Key Milestones & Public Service Snapshot",
      subtitle: "Reflecting decades of active public service, legislative initiatives, and constituent engagement.",
      items: [
        { value: "25+ Yrs", label: "Public Service Tenure" },
        { value: "1,200+", label: "Parliamentary Speeches & Addresses" },
        { value: "500+", label: "Development Initiatives Facilitated" },
        { value: "100%", label: "Constituency Commitment" },
      ],
    },
    styles: {
      paddingTop: "4rem",
      paddingBottom: "4rem",
      backgroundColor: "#f8fafc",
    },
  },
  {
    id: "features-section",
    type: "features_grid",
    props: {
      badge: "CORE PHILOSOPHY & VISION",
      title: "Guiding Principles of Our Public Service",
      subtitle: "A progressive blueprint focused on grassroots empowerment, sustainable development, and accessible leadership.",
      items: [
        {
          icon: "shield",
          title: "Transparent Leadership",
          description: "Zero tolerance for opacity, promoting open governance and integrity in public office.",
        },
        {
          icon: "heart",
          title: "Accessible Healthcare",
          description: "Equipping local centers with modern diagnostics, ambulances, and subsidized treatment.",
        },
        {
          icon: "users",
          title: "Youth Skills & Employment",
          description: "Facilitating vocational training centers, digital learning labs, and career opportunities.",
        },
        {
          icon: "building",
          title: "Modern Infrastructure",
          description: "All-weather four-lane roads, underground utilities, and clean drinking water networks.",
        },
        {
          icon: "award",
          title: "Agricultural Prosperity",
          description: "Facilitating crop insurance desks, farmer subsidies, and modern irrigation infrastructure.",
        },
        {
          icon: "sparkles",
          title: "Clean & Green Environment",
          description: "Promoting solar lighting, waste management, and urban green plantation drives.",
        },
      ],
    },
    styles: {
      paddingTop: "4.5rem",
      paddingBottom: "4.5rem",
      backgroundColor: "#ffffff",
    },
  },
  {
    id: "gallery-section",
    type: "gallery",
    props: {
      badge: "PHOTO & VIDEO GALLERY",
      title: "Glimpses of Public Service & Events",
      subtitle: "Visual documentation from official addresses, parliamentary sessions, grassroots visits, and public inaugurations.",
      items: [
        {
          title: "Flyover & Transit Highway Inauguration",
          category: "Infrastructure",
          date: "May 2026",
          imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80",
        },
        {
          title: "Mega Healthcare & Free Medicine Distribution",
          category: "Healthcare",
          date: "April 2026",
          imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80",
        },
        {
          title: "Smart Digital Classroom Launch",
          category: "Education",
          date: "March 2026",
          imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80",
        },
        {
          title: "Public Interaction & Citizen Address",
          category: "Public Service",
          date: "March 2026",
          imageUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop&q=80",
        },
        {
          title: "Clean Drinking Water RO Station",
          category: "Water Supply",
          date: "February 2026",
          imageUrl: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80",
        },
        {
          title: "Youth Community Sports Complex",
          category: "Youth & Sports",
          date: "January 2026",
          imageUrl: "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=800&auto=format&fit=crop&q=80",
        },
      ],
    },
    styles: {
      paddingTop: "4.5rem",
      paddingBottom: "4.5rem",
      backgroundColor: "#f8fafc",
    },
  },
  {
    id: "press-section",
    type: "press_news",
    props: {
      badge: "MEDIA & SPEECHES ROOM",
      title: "Recent Addresses, Statements & Media Highlights",
      subtitle: "Official statements, press releases, parliamentary interventions, and media coverage.",
      items: [
        {
          publication: "State Bureau News",
          date: "May 2026",
          headline: "₹ 140 Crore Master Infrastructure Package Sanctioned for Constituency",
          summary: "Four-lane highway connectivity, underground drainage, and new health centers inaugurated under representative vision.",
          imageUrl: "",
          tag: "Infrastructure",
          link: "",
        },
        {
          publication: "Daily Citizen Post",
          date: "April 2026",
          headline: "Keynote Address on Grassroots Empowerment & Inclusive Governance",
          summary: "Representative outlines comprehensive blueprint for constituent welfare and youth empowerment.",
          imageUrl: "",
          tag: "Governance",
          link: "",
        },
        {
          publication: "National Tribune",
          date: "March 2026",
          headline: "Constituency Healthcare & Education Outreach Initiative Organized",
          summary: "Specialist consultations, medicine distribution, and digital classroom kits provided across wards.",
          imageUrl: "",
          tag: "Healthcare",
          link: "",
        },
      ],
    },
    styles: {
      paddingTop: "4.5rem",
      paddingBottom: "4.5rem",
      backgroundColor: "#ffffff",
    },
  },
  {
    id: "contact-section",
    type: "contact_office",
    props: {
      title: "Connect With The Secretariat & Office",
      subtitle: "Have an inquiry or wish to send a message to the representative team? Get in touch with our office.",
      officeAddress: "Central Constituency Secretariat & Representative Camp Office, Civil Lines",
      officePhone: "+91 98765 43210",
      officeEmail: "office@constituency.gov.in",
    },
    styles: {
      paddingTop: "4.5rem",
      paddingBottom: "4.5rem",
      backgroundColor: "#f8fafc",
    },
  },
  {
    id: "footer-section",
    type: "footer",
    props: {
      brandName: "Hon'ble Representative",
      brandSubtitle: "Official Leader Portal",
      description: "Official personal website of the representative. Dedicated to transparent leadership, constituent service, and progressive governance.",
      officeAddress: "Central Constituency Secretariat & Camp Office, Civil Lines",
      helpline: "",
      email: "office@constituency.gov.in",
      primaryButtonText: "",
      primaryButtonLink: "",
      copyrightText: "© 2026 Official Representative Portal. All Rights Reserved.",
    },
    styles: {
      backgroundColor: "#0f172a",
      textColor: "#f8fafc",
      paddingTop: "4rem",
      paddingBottom: "2.5rem",
    },
  },
];

export const DEFAULT_WEBSITE_TEMPLATES: TemplateDefinition[] = [
  {
    id: "official-leader-singlepage",
    name: "Official Representative Portal",
    category: "Professional & Governance",
    description: "Complete single-page portal inspired by top parliamentary leader websites (rajnathsingh.in & rekhagupta.in) with bio, vision, media, photo gallery, and Secretariat contact.",
    thumbnail: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=600&auto=format&fit=crop&q=80",
    globalStyles: {
      colors: {
        primary: "#13538A", // Brand Primary Navy Blue
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
      { label: "Home", url: "#hero" },
      { label: "Biography", url: "#bio" },
      { label: "Vision", url: "#vision" },
      { label: "Milestones", url: "#stats" },
      { label: "Photo Gallery", url: "#gallery" },
      { label: "Media & Speeches", url: "#press" },
      { label: "Contact Office", url: "#contact" },
    ],
    pages: [
      {
        title: "Home",
        slug: "home",
        isHomePage: true,
        seoTitle: "Official Portal - Member of Parliament / Legislative Assembly",
        seoDescription: "Welcome to the official personal website of the representative.",
        content: {
          version: 1,
          sections: SINGLE_PAGE_SECTIONS,
        },
      },
    ],
  },
  {
    id: "constituency-development-singlepage",
    name: "Constituency Leadership Portal",
    category: "Personal Leadership & Progress",
    description: "Personal profile website highlighting leadership biography, governance vision, media highlights, gallery, and contact office.",
    thumbnail: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80",
    globalStyles: {
      colors: {
        primary: "#13538A",
        secondary: "#0d9488",
        accent: "#eab308",
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
      { label: "Home", url: "#hero" },
      { label: "Biography", url: "#bio" },
      { label: "Milestones", url: "#stats" },
      { label: "Photo Gallery", url: "#gallery" },
      { label: "Media & Speeches", url: "#press" },
      { label: "Contact Office", url: "#contact" },
    ],
    pages: [
      {
        title: "Home",
        slug: "home",
        isHomePage: true,
        seoTitle: "Official Personal Portal - Leader Profile",
        seoDescription: "Official personal website and constituent connectivity portal.",
        content: {
          version: 1,
          sections: SINGLE_PAGE_SECTIONS,
        },
      },
    ],
  },
];
