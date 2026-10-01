import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import {
  Monitor,
  Tablet,
  Smartphone,
  Save,
  Rocket,
  Eye,
  Undo2,
  Redo2,
  Plus,
  Layers,
  Settings,
  ArrowLeft,
  ChevronDown,
  Sparkles,
  Layout,
  Globe,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  GripVertical,
  Edit3,
} from "lucide-react";
import { websiteApi, websitePagesApi, websiteDeploymentsApi } from "../../../lib/api";
import { SectionBlock, WebsiteData, WebsitePageData } from "../types";
import { SectionRenderer } from "./sectionRenderers";
import { SectionInspector } from "./SectionInspector";

type ViewportMode = "desktop" | "tablet" | "mobile";

const AVAILABLE_BLOCKS: Array<{
  type: SectionBlock["type"];
  label: string;
  description: string;
  defaultProps: Record<string, any>;
  defaultStyles: SectionBlock["styles"];
}> = [
  {
    type: "navbar",
    label: "Header & Navigation Bar",
    description: "Top navigation bar with logo, representative title, page links, helpline & action button.",
    defaultProps: {
      brandName: "Constituency Portal",
      brandSubtitle: "Official Representative Portal",
      logoText: "M",
      logoUrl: "",
      showHelpline: true,
      helplineText: "1800-889-2024",
      primaryButtonText: "Contact Us",
      primaryButtonLink: "#contact",
      links: [
        { label: "Home", url: "#hero" },
        { label: "Gallery", url: "#gallery" },
        { label: "Schemes", url: "#schemes" },
        { label: "Janata Darbar", url: "#events" },
        { label: "Contact", url: "#contact" },
      ],
    },
    defaultStyles: {
      backgroundColor: "#ffffff",
      textColor: "#0f172a",
      paddingTop: "0.75rem",
      paddingBottom: "0.75rem",
      containerWidth: "default",
    },
  },
  {
    type: "hero",
    label: "Representative Hero",
    description: "Header with leader portrait, tagline, and quick citizen CTA buttons.",
    defaultProps: {
      tagline: "Dedicated to Constituency Progress",
      title: "Serving the People with Transparency & Dedication",
      subtitle: "Working round the clock to build world-class infrastructure and empower every family in our constituency.",
      primaryButtonText: "Explore Initiatives",
      primaryButtonLink: "#projects",
      secondaryButtonText: "Contact Secretariat",
      secondaryButtonLink: "#contact",
      leaderName: "Hon'ble Representative",
      leaderTitle: "MLA / MP",
      leaderBadge: "Constituency 24/7 Helpline Active",
    },
    defaultStyles: {
      paddingTop: "5rem",
      paddingBottom: "5rem",
      containerWidth: "default",
    },
  },
  {
    type: "representative_profile",
    label: "Leader Biography & Vision",
    description: "Leader portrait, personal journey, track record, and core governance vision pillars.",
    defaultProps: {
      tagline: "About the Representative",
      title: "Serving with Integrity, Passion & Vision",
      subtitle: "Dedicated public servant committed to grassroots empowerment, educational excellence, healthcare access, and farmer prosperity.",
      bio: "Working tirelessly across all municipal wards and villages to bring modern infrastructure, quality healthcare, and transparent citizen governance to every doorstep.",
      leaderName: "Hon'ble Representative",
      leaderTitle: "Member of Legislative Assembly / Parliament",
      leaderImage: "",
      experienceYears: "15+",
      constituencyName: "Constituency Region",
      visionPoints: [
        { title: "Transparent Governance", desc: "Zero-tolerance for delays with tracked public grievance resolution." },
        { title: "Youth & Education", desc: "Modern schools, digital skill labs, and community sports complexes." },
        { title: "Farmer & Rural Support", desc: "Direct crop insurance facilitation, micro-irrigation, and paved farm roads." },
        { title: "Universal Healthcare", desc: "Subsidized health camps, emergency ambulances, and 24/7 medicine centers." },
      ],
      primaryButtonText: "Meet at Janata Darbar",
      primaryButtonLink: "#events",
      secondaryButtonText: "Contact Secretariat",
      secondaryButtonLink: "#contact",
    },
    defaultStyles: {
      paddingTop: "5rem",
      paddingBottom: "5rem",
      backgroundColor: "#ffffff",
    },
  },
  {
    type: "stats",
    label: "Impact & KPI Numbers",
    description: "Key development metrics: projects completed, funds utilized, grievances resolved.",
    defaultProps: {
      title: "Constituency Progress Snapshot",
      subtitle: "Real-time key performance metrics across all municipal wards.",
      items: [
        { value: "520+", label: "Projects Completed" },
        { value: "₹ 145 Cr", label: "Development Sanctioned" },
        { value: "18,400+", label: "Grievances Resolved" },
        { value: "99.1%", label: "Citizen Satisfaction" },
      ],
    },
    defaultStyles: {
      paddingTop: "4rem",
      paddingBottom: "4rem",
      backgroundColor: "#f8fafc",
    },
  },
  {
    type: "projects",
    label: "Development Works Showcase",
    description: "Interactive cards of roads, hospitals, schools, and water infrastructure.",
    defaultProps: {
      title: "Ongoing & Completed Public Infrastructure",
    },
    defaultStyles: {
      paddingTop: "4.5rem",
      paddingBottom: "4.5rem",
    },
  },
  {
    type: "grievance_cta",
    label: "Citizen Grievance Banner",
    description: "High-visibility banner for 24/7 public complaint registration and helpline.",
    defaultProps: {
      title: "Facing an Issue in Your Neighborhood? We Are Here to Help.",
      subtitle: "Lodge your grievance directly with our constituency taskforce. Every complaint receives a tracking reference number.",
      buttonText: "Submit Grievance Now",
      buttonLink: "#grievance",
      helpline: "1800-889-2024",
    },
    defaultStyles: {
      paddingTop: "3rem",
      paddingBottom: "3rem",
    },
  },
  {
    type: "schemes",
    label: "Government Schemes Directory",
    description: "Central & State welfare scheme cards with eligibility details.",
    defaultProps: {
      title: "Welfare Schemes & Direct Benefits",
    },
    defaultStyles: {
      paddingTop: "4.5rem",
      paddingBottom: "4.5rem",
      backgroundColor: "#fafaf9",
    },
  },
  {
    type: "events",
    label: "Janata Darbar & Events Schedule",
    description: "Weekly public hearings, citizen meetings, and community inaugurations.",
    defaultProps: {
      title: "Janata Darbar & Public Schedule",
    },
    defaultStyles: {
      paddingTop: "4rem",
      paddingBottom: "4rem",
    },
  },
  {
    type: "contact_office",
    label: "Constituency Office & Message",
    description: "Head office address, map location, phone, and direct citizen inquiry form.",
    defaultProps: {
      title: "Head Office & Citizen Secretariat",
      subtitle: "Reach out to our team directly or visit our camp office during open citizen hours.",
      officeAddress: "Main Civil Lines Road, Near District Collectorate, Central Office",
      officePhone: "+91 98765 43210",
      officeEmail: "office@constituency.in",
    },
    defaultStyles: {
      paddingTop: "4.5rem",
      paddingBottom: "4.5rem",
    },
  },
  {
    type: "testimonials",
    label: "Citizen Testimonials & Feedback",
    description: "Citizen reviews, quotes, ward locations, star ratings, and community feedback cards.",
    defaultProps: {
      badge: "Voice of Constituents",
      title: "What Citizens Say About Our Work",
      subtitle: "Honest feedback from residents, community elders, and youth across all wards.",
      items: [
        {
          name: "Rajesh Sharma",
          role: "Ward 12 Resident & Trader",
          quote: "The road widening and new LED street lighting project was executed in record time. Our shop market area is now safe and vibrant at night.",
          rating: 5,
          avatarUrl: "",
        },
        {
          name: "Pooja Verma",
          role: "Parent & Teacher, Sector 4",
          quote: "The government school modernization project provided smart digital classrooms and clean drinking water facilities for all our children.",
          rating: 5,
          avatarUrl: "",
        },
        {
          name: "Mohammad Arif",
          role: "Youth Sports Club Leader",
          quote: "The new community sports complex and open gym in our park has given hundreds of local youths a healthy and positive environment.",
          rating: 5,
          avatarUrl: "",
        },
      ],
    },
    defaultStyles: {
      paddingTop: "4.5rem",
      paddingBottom: "4.5rem",
      backgroundColor: "#ffffff",
    },
  },
  {
    type: "press_news",
    label: "Press & Media Coverage",
    description: "Media headlines, newspaper clippings, press releases, and development news articles.",
    defaultProps: {
      badge: "Media & Press Room",
      title: "Constituency In The News",
      subtitle: "Official coverage and national & state media reports regarding ongoing constituency projects.",
      items: [
        {
          publication: "State Times Bureau",
          date: "May 2026",
          headline: "₹ 140 Crore Model Infrastructure Package Approved for Constituency",
          summary: "New underground drainage, four-lane connectivity, and community healthcare centers sanctioned under flagship masterplan.",
          imageUrl: "",
          tag: "Infrastructure",
          link: "",
        },
        {
          publication: "Daily Citizen Post",
          date: "April 2026",
          headline: "Over 18,000 Citizen Grievances Resolved with 99% Satisfaction Rate",
          summary: "Constituency digital grievance portal recognized as a state-wide benchmark for rapid public service delivery.",
          imageUrl: "",
          tag: "Governance",
          link: "",
        },
        {
          publication: "National Tribune",
          date: "March 2026",
          headline: "Free Mega Healthcare Camp Benefits Over 5,000 Local Families",
          summary: "Specialist doctors, free medicines, and diagnostic checkups organized across all rural and urban wards.",
          imageUrl: "",
          tag: "Healthcare",
          link: "",
        },
      ],
    },
    defaultStyles: {
      paddingTop: "4.5rem",
      paddingBottom: "4.5rem",
      backgroundColor: "#f8fafc",
    },
  },
  {
    type: "gallery",
    label: "Photo & Video Gallery",
    description: "Visual showcase of inauguration ceremonies, public meetings, and grassroots works.",
    defaultProps: {
      badge: "Constituency Gallery",
      title: "Glimpses of Grassroots Progress",
      subtitle: "High-resolution photos from recent community gatherings, developmental milestones, and Jan Sunwai sessions.",
      items: [
        {
          title: "Flyover & Highway Inauguration",
          category: "Infrastructure",
          date: "2026",
          imageUrl: "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80",
        },
        {
          title: "Mega Health Checkup & Medicine Distribution",
          category: "Healthcare",
          date: "2026",
          imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80",
        },
        {
          title: "Modern Smart Classroom Launch",
          category: "Education",
          date: "2026",
          imageUrl: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80",
        },
        {
          title: "Janata Darbar Open Citizen Hearing",
          category: "Public Service",
          date: "2026",
          imageUrl: "https://images.unsplash.com/photo-1577495508048-b635879837f1?w=800&auto=format&fit=crop&q=80",
        },
      ],
    },
    defaultStyles: {
      paddingTop: "4.5rem",
      paddingBottom: "4.5rem",
      backgroundColor: "#ffffff",
    },
  },
  {
    type: "features_grid",
    label: "Vision & Pillars Grid",
    description: "Multi-column feature grid showcasing strategic governance pillars and core commitments.",
    defaultProps: {
      badge: "Strategic Vision",
      title: "Our Core Governance Commitments",
      subtitle: "A modern blueprint focused on citizen empowerment, sustainable progress, and accessible public service.",
      items: [
        {
          icon: "shield",
          title: "Transparent & Accountable Governance",
          description: "Every public tender and fund utilization is audited and accessible to citizens online.",
        },
        {
          icon: "heart",
          title: "Accessible & Subsidized Healthcare",
          description: "Primary health centers equipped with 24/7 doctors, ambulances, and essential diagnostic tests.",
        },
        {
          icon: "users",
          title: "Youth Skills & Job Opportunities",
          description: "Free vocational training centers, digital learning labs, and annual constituency mega job fairs.",
        },
        {
          icon: "building",
          title: "World-Class Urban & Rural Infrastructure",
          description: "Paved all-weather roads, storm drainage systems, and 24x7 clean piped drinking water.",
        },
        {
          icon: "award",
          title: "Direct Farmer & Welfare Assistance",
          description: "Crop insurance desks, farmer subsidies, and zero-fee processing for government schemes.",
        },
        {
          icon: "sparkles",
          title: "Safe, Green & Clean Environment",
          description: "Solar street lighting, waste management initiatives, and urban tree plantation drives.",
        },
      ],
    },
    defaultStyles: {
      paddingTop: "4.5rem",
      paddingBottom: "4.5rem",
      backgroundColor: "#f8fafc",
    },
  },
  {
    type: "newsletter",
    label: "Citizen Alert & WhatsApp Updates",
    description: "High-converting WhatsApp and email notification signup banner for announcements.",
    defaultProps: {
      badge: "Direct Citizen Connect",
      title: "Stay Updated on Constituency News & Welfare Alerts",
      subtitle: "Subscribe for instant notifications on upcoming Janata Darbar dates, scheme enrollments, and municipal notices.",
      placeholder: "Enter 10-digit WhatsApp number",
      buttonText: "Join WhatsApp Broadcast",
      benefits: [
        "Instant Janata Darbar schedule updates",
        "Direct welfare scheme notifications",
        "Zero spam, only official verified alerts",
      ],
    },
    defaultStyles: {
      paddingTop: "3.5rem",
      paddingBottom: "3.5rem",
      backgroundColor: "#0f172a",
      textColor: "#ffffff",
    },
  },
  {
    type: "footer",
    label: "Constituency Footer & Branding",
    description: "Official footer with logo, constituency vision, quick links, office address, and helpline.",
    defaultProps: {
      brandName: "Constituency Secretariat",
      brandSubtitle: "Official Representative Portal",
      description: "Dedicated to transparent governance, rapid grievance resolution, and progressive infrastructure across all municipal wards.",
      officeAddress: "Central Constituency Secretariat & Camp Office, Civil Lines",
      helpline: "1800-889-2024",
      email: "office@constituency.gov.in",
      primaryButtonText: "Lodge a Grievance",
      primaryButtonLink: "#grievance",
      copyrightText: "© 2026 Constituency Portal. All Rights Reserved.",
    },
    defaultStyles: {
      backgroundColor: "#0f172a",
      textColor: "#f8fafc",
      paddingTop: "4rem",
      paddingBottom: "2.5rem",
      containerWidth: "default",
    },
  },
];

const getDefaultSinglePageSections = (brandName: string = "Hon'ble Representative"): SectionBlock[] => [
  {
    id: `sec_navbar_${Date.now()}_1`,
    type: "navbar",
    props: {
      brandName: brandName || "Hon'ble Representative",
      brandSubtitle: "Official Leader Portal",
      logoText: (brandName || "R").charAt(0).toUpperCase(),
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
    styles: { backgroundColor: "#ffffff", textColor: "#0f172a", paddingTop: "0.75rem", paddingBottom: "0.75rem" },
  },
  {
    id: `sec_hero_${Date.now()}_2`,
    type: "hero",
    props: {
      tagline: "OFFICIAL LEADER PORTAL & PUBLIC SERVICE",
      title: "Serving with Vision, Unwavering Integrity & Dedication",
      subtitle: "Dedicated to transformative public service, parliamentary excellence, and the holistic development of our constituency.",
      primaryButtonText: "Read Biography",
      primaryButtonLink: "#bio",
      secondaryButtonText: "Connect with Secretariat",
      secondaryButtonLink: "#contact",
      leaderName: brandName || "Hon'ble Representative",
      leaderTitle: "Member of Parliament / Legislative Assembly",
      leaderBadge: "Official Representative Portal",
      leaderImage: "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80",
    },
    styles: { paddingTop: "4.5rem", paddingBottom: "4.5rem" },
  },
  {
    id: `sec_bio_${Date.now()}_3`,
    type: "representative_profile",
    props: {
      tagline: "BIOGRAPHY & LEADERSHIP JOURNEY",
      title: "A Lifetime Devoted to Grassroots Service & National Progress",
      subtitle: "Leading with principles, empowering every citizen, and championing progressive governance at every level.",
      bio: "Representing our constituency with uncompromising integrity. Spearheading major developmental initiatives, advocating for constituent rights in parliament, and fostering inclusive growth across all communities.",
      leaderName: brandName || "Hon'ble Representative",
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
    styles: { paddingTop: "5rem", paddingBottom: "5rem", backgroundColor: "#ffffff" },
  },
  {
    id: `sec_stats_${Date.now()}_4`,
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
    styles: { paddingTop: "4rem", paddingBottom: "4rem", backgroundColor: "#f8fafc" },
  },
  {
    id: `sec_features_${Date.now()}_5`,
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
    styles: { paddingTop: "4.5rem", paddingBottom: "4.5rem", backgroundColor: "#ffffff" },
  },
  {
    id: `sec_gallery_${Date.now()}_6`,
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
    styles: { paddingTop: "4.5rem", paddingBottom: "4.5rem", backgroundColor: "#f8fafc" },
  },
  {
    id: `sec_press_${Date.now()}_7`,
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
          link: "#",
        },
        {
          publication: "Daily Citizen Post",
          date: "April 2026",
          headline: "Keynote Address on Grassroots Empowerment & Inclusive Governance",
          summary: "Representative outlines comprehensive blueprint for constituent welfare and youth empowerment.",
          imageUrl: "",
          tag: "Governance",
          link: "#",
        },
        {
          publication: "National Tribune",
          date: "March 2026",
          headline: "Constituency Healthcare & Education Outreach Initiative Organized",
          summary: "Specialist consultations, medicine distribution, and digital classroom kits provided across wards.",
          imageUrl: "",
          tag: "Healthcare",
          link: "#",
        },
      ],
    },
    styles: { paddingTop: "4.5rem", paddingBottom: "4.5rem", backgroundColor: "#ffffff" },
  },
  {
    id: `sec_contact_${Date.now()}_8`,
    type: "contact_office",
    props: {
      title: "Connect With The Secretariat & Office",
      subtitle: "Have an inquiry or wish to send a message to the representative team? Get in touch with our office.",
      officeAddress: "Central Constituency Secretariat & Representative Camp Office, Civil Lines",
      officePhone: "+91 98765 43210",
      officeEmail: "office@constituency.gov.in",
    },
    styles: { paddingTop: "4.5rem", paddingBottom: "4.5rem", backgroundColor: "#f8fafc" },
  },
  {
    id: `sec_footer_${Date.now()}_9`,
    type: "footer",
    props: {
      brandName: brandName || "Hon'ble Representative",
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
      containerWidth: "default",
    },
  },
];

export const WebsiteBuilderPage: React.FC = () => {
  const { websiteId } = useParams<{ websiteId: string }>();
  const [, setLocation] = useLocation();

  const [website, setWebsite] = useState<WebsiteData | null>(null);
  const [pages, setPages] = useState<WebsitePageData[]>([]);
  const [activePageId, setActivePageId] = useState<string>("");
  const [sections, setSections] = useState<SectionBlock[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [history, setHistory] = useState<SectionBlock[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [leftTab, setLeftTab] = useState<"blocks" | "layers" | "styles">("blocks");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const isProgrammaticScroll = useRef(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{ index: number; position: "top" | "bottom" } | null>(null);

  const parseSections = (content: any): SectionBlock[] => {
    if (!content) return [];
    if (typeof content === "string") {
      try {
        const parsed = JSON.parse(content);
        return Array.isArray(parsed?.sections) ? parsed.sections : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(content?.sections) ? content.sections : [];
  };

  // Load website & pages
  const loadData = useCallback(async () => {
    if (!websiteId) return;
    try {
      const [siteRes, pagesRes] = await Promise.all([
        websiteApi.get(websiteId),
        websitePagesApi.list(websiteId),
      ]);

      const siteName = siteRes.data?.data?.name || "Constituency Portal";

      if (siteRes.data?.success) {
        setWebsite(siteRes.data.data);
      }

      if (pagesRes.data?.success) {
        let pagesList = pagesRes.data.data || [];

        // If list is empty, fallback to siteRes.data.data.pages
        if (pagesList.length === 0 && siteRes.data?.data?.pages?.length > 0) {
          pagesList = siteRes.data.data.pages;
        }

        // If still empty but website has a published snapshot with pages, recover them
        const deploymentSnapshotPages = siteRes.data?.data?.deployments?.[0]?.snapshot?.pages;
        if (pagesList.length === 0 && Array.isArray(deploymentSnapshotPages) && deploymentSnapshotPages.length > 0) {
          pagesList = deploymentSnapshotPages;
        }

        const defaultSinglePageSections = getDefaultSinglePageSections(siteName);

        // If still empty (brand new website with no pages), auto-create Home page with default single-page sections
        if (pagesList.length === 0) {
          try {
            const createRes = await websitePagesApi.create(websiteId, {
              title: "Home",
              slug: "home",
              isHomePage: true,
              content: {
                version: 1,
                sections: defaultSinglePageSections,
              },
            });
            if (createRes.data?.success && createRes.data.data) {
              pagesList = [createRes.data.data];
            }
          } catch (createErr) {
            console.error("Failed to auto-create starter page:", createErr);
          }
        }

        setPages(pagesList);
        const home = pagesList.find((p: any) => p.isHomePage) || pagesList[0];
        if (home) {
          setActivePageId(home.id);
          let pageSections = parseSections(home.content);
          if (pageSections.length === 0) {
            pageSections = defaultSinglePageSections;
          }
          setSections(pageSections);
          setHistory([pageSections]);
          setHistoryIndex(0);
        }
      }
    } catch (err) {
      console.error("Failed to load website data:", err);
    }
  }, [websiteId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Page Switcher
  const handleSwitchPage = (pageId: string) => {
    // 1. Persist current sections to in-memory pages list before switching
    const updatedPages = pages.map((p) =>
      p.id === activePageId ? { ...p, content: { version: 1, sections } } : p
    );
    setPages(updatedPages);

    // 2. Load target page
    const page = updatedPages.find((p) => p.id === pageId);
    if (!page) return;
    setActivePageId(pageId);
    const pageSections = parseSections(page.content);
    setSections(pageSections);
    setSelectedSectionId(null);
    setHistory([pageSections]);
    setHistoryIndex(0);
  };

  // State Update with Undo/Redo support
  const updateSections = (newSections: SectionBlock[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newSections);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setSections(newSections);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setSections(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setSections(next);
    }
  };

  const scrollToSection = (sectionId: string) => {
    setTimeout(() => {
      const el = document.getElementById(`section-${sectionId}`);
      if (el && canvasRef.current) {
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const relativeTop = elRect.top - canvasRect.top + canvasRef.current.scrollTop - 20;
        canvasRef.current.scrollTo({
          top: Math.max(0, relativeTop),
          behavior: "smooth",
        });
      }
    }, 40);
  };

  // Canvas & Layers Drag & Drop Handlers
  const handleSectionDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${index}`);
  };

  const handleSectionDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (draggedIndex === null) return;

    const targetElement = e.currentTarget as HTMLElement;
    const rect = targetElement.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? "top" : "bottom";

    setDragOverInfo({ index, position });
  };

  const handleSectionDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverInfo(null);
    }
  };

  const handleSectionDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex === null) {
      setDragOverInfo(null);
      return;
    }

    let targetIndex = dropIndex;
    if (dragOverInfo && dragOverInfo.position === "bottom") {
      targetIndex = dropIndex + 1;
    }

    if (draggedIndex === targetIndex || (draggedIndex === targetIndex - 1 && dragOverInfo?.position === "bottom")) {
      setDraggedIndex(null);
      setDragOverInfo(null);
      return;
    }

    const clone = [...sections];
    const [draggedItem] = clone.splice(draggedIndex, 1);
    const adjustedTargetIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
    clone.splice(adjustedTargetIndex, 0, draggedItem);

    updateSections(clone);
    setSelectedSectionId(draggedItem.id);
    scrollToSection(draggedItem.id);
    setDraggedIndex(null);
    setDragOverInfo(null);
  };

  // Auto-scroll canvas while dragging near top/bottom edges
  useEffect(() => {
    let animId: number | null = null;
    let scrollVelocity = 0;

    const onDragOverWindow = (e: DragEvent) => {
      if (draggedIndex === null || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const edgeThreshold = 100;

      if (e.clientY < rect.top + edgeThreshold && e.clientY > rect.top - 50) {
        const intensity = Math.max(0, 1 - (e.clientY - rect.top) / edgeThreshold);
        scrollVelocity = -Math.max(6, intensity * 24);
      } else if (e.clientY > rect.bottom - edgeThreshold && e.clientY < rect.bottom + 50) {
        const intensity = Math.max(0, 1 - (rect.bottom - e.clientY) / edgeThreshold);
        scrollVelocity = Math.max(6, intensity * 24);
      } else {
        scrollVelocity = 0;
      }

      if (scrollVelocity !== 0 && animId === null) {
        const loop = () => {
          if (canvasRef.current && scrollVelocity !== 0) {
            canvasRef.current.scrollTop += scrollVelocity;
            animId = requestAnimationFrame(loop);
          } else {
            animId = null;
          }
        };
        animId = requestAnimationFrame(loop);
      }
    };

    const stopAutoScroll = () => {
      scrollVelocity = 0;
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    };

    window.addEventListener("dragover", onDragOverWindow);
    window.addEventListener("dragend", stopAutoScroll);
    window.addEventListener("drop", stopAutoScroll);

    return () => {
      window.removeEventListener("dragover", onDragOverWindow);
      window.removeEventListener("dragend", stopAutoScroll);
      window.removeEventListener("drop", stopAutoScroll);
      if (animId !== null) cancelAnimationFrame(animId);
    };
  }, [draggedIndex]);

  // Add block
  const handleAddBlock = (template: typeof AVAILABLE_BLOCKS[0]) => {
    const newBlock: SectionBlock = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type: template.type,
      props: { ...template.defaultProps },
      styles: { ...template.defaultStyles },
    };

    let updated: SectionBlock[];
    if (selectedSectionIndex >= 0) {
      updated = [...sections];
      updated.splice(selectedSectionIndex + 1, 0, newBlock);
    } else {
      updated = [...sections, newBlock];
    }

    updateSections(updated);
    setSelectedSectionId(newBlock.id);
    scrollToSection(newBlock.id);
  };

  // Promote default footer to editable section
  const handlePromoteDefaultFooter = () => {
    const existingFooter = sections.find((s) => s.type === "footer");
    if (existingFooter) {
      setSelectedSectionId(existingFooter.id);
      scrollToSection(existingFooter.id);
      return;
    }

    const defaultFooterBlock: SectionBlock = {
      id: `sec_footer_${Date.now()}`,
      type: "footer",
      props: {
        brandName: website?.name || "Constituency Secretariat",
        brandSubtitle: "Official Representative Portal",
        description:
          "Dedicated to transparent governance, rapid grievance resolution, and progressive infrastructure across all municipal wards.",
        officeAddress: "Central Constituency Secretariat & Camp Office, Civil Lines",
        helpline: "1800-889-2024",
        email: "office@constituency.gov.in",
        primaryButtonText: "",
        primaryButtonLink: "",
        copyrightText: `© ${new Date().getFullYear()} ${website?.name || "Constituency Portal"}. All Rights Reserved.`,
      },
      styles: {
        backgroundColor: "#0f172a",
        textColor: "#f8fafc",
        paddingTop: "4rem",
        paddingBottom: "2.5rem",
      },
    };

    const newSections = [...sections, defaultFooterBlock];
    updateSections(newSections);
    setSelectedSectionId(defaultFooterBlock.id);
    scrollToSection(defaultFooterBlock.id);
  };

  // Promote default navbar to editable section
  const handlePromoteDefaultNavbar = () => {
    const existingNavbar = sections.find((s) => s.type === "navbar");
    if (existingNavbar) {
      setSelectedSectionId(existingNavbar.id);
      scrollToSection(existingNavbar.id);
      return;
    }

    // Find navbar from home or any page to keep props consistent
    const home = pages.find((p) => p.isHomePage) || pages[0];
    const homeNav = home?.content?.sections?.find((s: any) => s.type === "navbar");

    const defaultNavBlock: SectionBlock = {
      id: `sec_navbar_${Date.now()}`,
      type: "navbar",
      props: {
        brandName: website?.name || "Constituency Portal",
        brandSubtitle: "Official Representative Portal",
        logoText: website?.name?.charAt(0) || "M",
        logoUrl: website?.logoUrl || "",
        showHelpline: true,
        helplineText: "1800-889-2024",
        primaryButtonText: "Contact Us",
        primaryButtonLink: "#contact",
        ...(homeNav?.props || {}),
      },
      styles: {
        backgroundColor: "#ffffff",
      },
    };

    const newSections = [defaultNavBlock, ...sections];
    updateSections(newSections);
    setSelectedSectionId(defaultNavBlock.id);
    scrollToSection(defaultNavBlock.id);
  };

  // Update selected section
  const handleUpdateSection = (updated: SectionBlock) => {
    const updatedSections = sections.map((s) => (s.id === updated.id ? updated : s));
    updateSections(updatedSections);
  };

  // Delete section
  const handleDeleteSection = (id: string) => {
    const updatedSections = sections.filter((s) => s.id !== id);
    updateSections(updatedSections);
    if (selectedSectionId === id) setSelectedSectionId(null);
  };

  // Move section
  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const targetSection = sections[index];
    const clone = [...sections];
    const [moved] = clone.splice(index, 1);
    clone.splice(newIndex, 0, moved);
    updateSections(clone);
    setSelectedSectionId(targetSection.id);
    scrollToSection(targetSection.id);
  };

  // Save draft
  const handleSaveDraft = async () => {
    if (!websiteId || !activePageId) return;
    try {
      setSaving(true);
      await websitePagesApi.update(websiteId, activePageId, {
        content: { version: 1, sections },
      });
      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId ? { ...p, content: { version: 1, sections } } : p
        )
      );
      setLastSavedTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Failed to save draft:", err);
    } finally {
      setSaving(false);
    }
  };

  // Publish
  const handlePublish = async () => {
    if (!websiteId || !activePageId) return;
    try {
      setPublishing(true);
      // Save current page first
      await websitePagesApi.update(websiteId, activePageId, {
        content: { version: 1, sections },
      });
      setPages((prev) =>
        prev.map((p) =>
          p.id === activePageId ? { ...p, content: { version: 1, sections } } : p
        )
      );
      // Trigger instant snapshot deployment
      await websiteDeploymentsApi.publish(websiteId, {
        notes: `Published from visual builder at ${new Date().toLocaleString()}`,
      });
      setLastSavedTime(new Date().toLocaleTimeString());
      alert("🎉 Website published successfully! Your changes are now live.");
    } catch (err: any) {
      console.error("Publish failed:", err);
      alert(err.response?.data?.message || "Publish failed");
    } finally {
      setPublishing(false);
    }
  };

  const selectedSection = sections.find((s) => s.id === selectedSectionId) || null;
  const selectedSectionIndex = selectedSection ? sections.findIndex((s) => s.id === selectedSection.id) : -1;

  // Shared navbar props derived from home page or website branding
  const homePage = pages.find((p) => p.isHomePage) || pages[0];
  const homeNavbar = homePage?.content?.sections?.find((s: any) => s.type === "navbar");
  const defaultNavbarProps = {
    brandName: website?.name || "Constituency Portal",
    brandSubtitle: "Official Representative Portal",
    logoText: website?.name?.charAt(0) || "M",
    logoUrl: website?.logoUrl || "",
    showHelpline: true,
    helplineText: "1800-889-2024",
    primaryButtonText: "Contact Us",
    primaryButtonLink: "#contact",
    ...(homeNavbar?.props || {}),
  };

  const getViewportWidth = () => {
    if (viewport === "mobile") return "max-w-[390px] w-full mx-auto my-4 shadow-2xl ring-8 ring-slate-800 rounded-[40px]";
    if (viewport === "tablet") return "max-w-[768px] w-full mx-auto my-4 shadow-2xl ring-8 ring-slate-800 rounded-[28px]";
    return "w-full max-w-[1240px] mx-auto shadow-2xl rounded-2xl";
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* ─── Top Bar ────────────────────────────────────────────── */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between z-30 shrink-0">
        {/* Left: Back & Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLocation("/websites")}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Back to Websites Hub"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 dark:text-white">
                {website?.name || "Constituency Website"}
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-sky-400">
                Visual Builder
              </span>
            </div>
          </div>

          {/* Page Selector */}
          <div className="relative ml-4">
            <select
              value={activePageId}
              onChange={(e) => handleSwitchPage(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  📄 {p.title} {p.isHomePage ? "(Home)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Center: Viewport & Undo/Redo */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                viewport === "desktop"
                  ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Desktop View"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport("tablet")}
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                viewport === "tablet"
                  ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Tablet View"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                viewport === "mobile"
                  ? "bg-white dark:bg-slate-900 text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Mobile View"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={historyIndex <= 0}
              onClick={handleUndo}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={historyIndex >= history.length - 1}
              onClick={handleRedo}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {lastSavedTime && (
            <span className="text-[11px] text-slate-400 hidden md:inline">
              Saved at {lastSavedTime}
            </span>
          )}

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSaveDraft}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            disabled={publishing}
            onClick={handlePublish}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg bg-primary text-white shadow-md shadow-primary/20 hover:bg-primary/90 hover:scale-[1.02] transition-all"
          >
            <Rocket className="w-3.5 h-3.5" />
            {publishing ? "Publishing..." : "Publish Live"}
          </button>
        </div>
      </header>

      {/* ─── Main Workspace ──────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel (Catalog & Layers) */}
        <aside className="w-80 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
          {/* Tab switches */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 p-2 gap-1 bg-slate-50 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={() => setLeftTab("blocks")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                leftTab === "blocks"
                  ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Blocks
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("layers")}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md flex items-center justify-center gap-1.5 transition-all ${
                leftTab === "layers"
                  ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Layers ({sections.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {leftTab === "blocks" && (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                  Click to Add to Page
                </p>
                <div className="space-y-2">
                  {AVAILABLE_BLOCKS.map((block) => (
                    <button
                      key={block.type}
                      type="button"
                      onClick={() => handleAddBlock(block)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5 group transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-primary transition-colors">
                          {block.label}
                        </span>
                        <Plus className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                        {block.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {leftTab === "layers" && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-400 font-medium px-1">
                  Drag handle to reorder • Click to scroll & edit
                </p>
                {sections.map((section, idx) => (
                  <div
                    key={section.id}
                    draggable={true}
                    onDragStart={(e) => handleSectionDragStart(e, idx)}
                    onDragOver={(e) => handleSectionDragOver(e, idx)}
                    onDragLeave={handleSectionDragLeave}
                    onDrop={(e) => handleSectionDrop(e, idx)}
                    onClick={() => {
                      setSelectedSectionId(section.id);
                      scrollToSection(section.id);
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between cursor-pointer transition-all ${
                      selectedSectionId === section.id
                        ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    } ${draggedIndex === idx ? "opacity-50 border-dashed border-primary" : ""}`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <GripVertical className="w-3.5 h-3.5 text-slate-400 cursor-grab shrink-0" />
                      <span className="capitalize font-bold truncate">
                        {idx + 1}. {section.type.replace("_", " ")}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                      {section.props.title ? section.props.title.slice(0, 14) + "..." : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Center Canvas */}
        <main
          ref={canvasRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-slate-100/80 dark:bg-slate-950/80"
        >
          <div
            className={`mx-auto w-full bg-white dark:bg-slate-900 shadow-2xl rounded-2xl overflow-hidden min-h-[800px] border border-slate-200 dark:border-slate-800 transition-[max-width] duration-200 ${getViewportWidth()}`}
          >
            {/* ─── Clean Website Navigation Bar (Identical across all pages) ─── */}
            {!sections.some((s) => s.type === "navbar") && (
              <div
                onClick={handlePromoteDefaultNavbar}
                className="sticky top-0 z-30 cursor-pointer relative group/default-nav border-b-2 border-transparent hover:border-primary transition-all shadow-sm bg-white dark:bg-slate-900"
                title="Click to customize Header & Navigation across pages"
              >
                <div className="absolute top-2.5 right-6 z-40 opacity-0 group-hover/default-nav:opacity-100 transition-opacity bg-primary text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 pointer-events-none">
                  <Edit3 className="w-3.5 h-3.5" />
                  Click to Customize Header
                </div>
                <SectionRenderer
                  section={{
                    id: "default-canvas-navbar",
                    type: "navbar",
                    props: defaultNavbarProps,
                    styles: {
                      backgroundColor: "#ffffff",
                    },
                  }}
                  isEditing={false}
                  pages={pages}
                  activePageId={activePageId}
                  onSwitchPage={handleSwitchPage}
                  viewport={viewport}
                />
              </div>
            )}

            {sections.length === 0 ? (
              <div className="p-16 text-center">
                <Layout className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
                  This page has no sections yet
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Click on any block from the left panel to add Header, Hero, Projects, Grievances, Schemes, or Contact blocks.
                </p>
              </div>
            ) : (
              sections.map((section, idx) => (
                <SectionRenderer
                  key={section.id}
                  section={section}
                  isEditing={true}
                  isSelected={selectedSectionId === section.id}
                  onSelect={() => setSelectedSectionId(section.id)}
                  onMoveUp={() => handleMoveSection(idx, "up")}
                  onMoveDown={() => handleMoveSection(idx, "down")}
                  onDelete={() => handleDeleteSection(section.id)}
                  canMoveUp={idx > 0}
                  canMoveDown={idx < sections.length - 1}
                  isDragging={draggedIndex === idx}
                  isDropTarget={dragOverInfo?.index === idx}
                  dropPosition={dragOverInfo?.index === idx ? dragOverInfo.position : null}
                  onDragStart={(e) => handleSectionDragStart(e, idx)}
                  onDragOver={(e) => handleSectionDragOver(e, idx)}
                  onDragLeave={handleSectionDragLeave}
                  onDrop={(e) => handleSectionDrop(e, idx)}
                  pages={pages}
                  activePageId={activePageId}
                  onSwitchPage={handleSwitchPage}
                  viewport={viewport}
                />
              ))
            )}

            {/* ─── Clean Website Footer (Shown if no custom footer block added) ─── */}
            {!sections.some((s) => s.type === "footer") && (
              <div
                onClick={handlePromoteDefaultFooter}
                className="cursor-pointer relative group/default-footer border-2 border-dashed border-transparent hover:border-primary/60 dark:hover:border-primary/40 transition-all"
                title="Click to edit and customize footer branding & details"
              >
                <div className="absolute top-3 right-6 z-20 opacity-0 group-hover/default-footer:opacity-100 transition-opacity bg-primary text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 pointer-events-none">
                  <Edit3 className="w-3.5 h-3.5" />
                  Click to Customize Footer
                </div>
                <SectionRenderer
                  section={{
                    id: "default-canvas-footer",
                    type: "footer",
                    props: {
                      brandName: website?.name || "Constituency Secretariat",
                      brandSubtitle: "Official Representative Portal",
                      description: "Dedicated to transparent governance, rapid grievance resolution, and progressive infrastructure across all municipal wards.",
                      officeAddress: "Central Constituency Secretariat & Camp Office, Civil Lines",
                      helpline: "1800-889-2024",
                      email: "office@constituency.gov.in",
                      primaryButtonText: "",
                      primaryButtonLink: "",
                      copyrightText: `© ${new Date().getFullYear()} ${website?.name || "Constituency Portal"}. All Rights Reserved.`,
                    },
                    styles: {
                      backgroundColor: "#0f172a",
                      textColor: "#f8fafc",
                      paddingTop: "4rem",
                      paddingBottom: "2rem",
                    },
                  }}
                  isEditing={false}
                  pages={pages}
                  activePageId={activePageId}
                  onSwitchPage={handleSwitchPage}
                  viewport={viewport}
                />
              </div>
            )}
          </div>
        </main>

        {/* Right Inspector */}
        <aside className="w-80 shrink-0">
          <SectionInspector
            section={selectedSection}
            onUpdate={handleUpdateSection}
            onDelete={() => selectedSection && handleDeleteSection(selectedSection.id)}
            onMoveUp={() => handleMoveSection(selectedSectionIndex, "up")}
            onMoveDown={() => handleMoveSection(selectedSectionIndex, "down")}
            canMoveUp={selectedSectionIndex > 0}
            canMoveDown={selectedSectionIndex < sections.length - 1}
            websiteId={websiteId}
          />
        </aside>
      </div>

      {/* ─── Live Preview Modal ──────────────────────────────────── */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
          <div className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="font-bold text-sm">Live Preview Mode</span>
            </div>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold"
            >
              Close Preview
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-900">
            {/* Navbar in Preview */}
            {!sections.some((s) => s.type === "navbar") && (
              <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                <SectionRenderer
                  section={{
                    id: "preview-canvas-navbar",
                    type: "navbar",
                    props: defaultNavbarProps,
                    styles: {
                      backgroundColor: "#ffffff",
                    },
                  }}
                  isEditing={false}
                  pages={pages}
                  activePageId={activePageId}
                  onSwitchPage={handleSwitchPage}
                />
              </div>
            )}

            {/* Sections */}
            {sections.map((section) => (
              <SectionRenderer
                key={section.id}
                section={section}
                isEditing={false}
                pages={pages}
                activePageId={activePageId}
                onSwitchPage={handleSwitchPage}
              />
            ))}

            {/* Footer in Preview */}
            {!sections.some((s) => s.type === "footer") && (
              <SectionRenderer
                section={{
                  id: "default-preview-footer",
                  type: "footer",
                  props: {
                    brandName: website?.name || "Constituency Secretariat",
                    brandSubtitle: "Official Representative Portal",
                    description: "Dedicated to transparent governance, rapid grievance resolution, and progressive infrastructure across all municipal wards.",
                    officeAddress: "Central Constituency Secretariat & Camp Office, Civil Lines",
                    helpline: "1800-889-2024",
                    email: "office@constituency.gov.in",
                    primaryButtonText: "Lodge a Grievance",
                    primaryButtonLink: "#grievance",
                    copyrightText: `© ${new Date().getFullYear()} ${website?.name || "Constituency Portal"}. All Rights Reserved.`,
                  },
                  styles: {
                    backgroundColor: "#0f172a",
                    textColor: "#f8fafc",
                    paddingTop: "4rem",
                    paddingBottom: "2rem",
                  },
                }}
                isEditing={false}
                pages={pages}
                activePageId={activePageId}
                onSwitchPage={handleSwitchPage}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
