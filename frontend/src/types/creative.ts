export type CreativeCategory =
  | "BIRTHDAY"
  | "MEETING"
  | "EVENTS"
  | "JANATA_DARBAR"
  | "GOVT_SCHEME"
  | "PUBLIC_ANNOUNCEMENT"
  | "AWARENESS"
  | "ACHIEVEMENT"
  | "FESTIVAL"
  | "NATIONAL_DAYS"
  | "DEVELOPMENT_WORK"
  | "GENERAL"
  | "CUSTOM";

export type TemplateStyle =
  | "minimal"
  | "official"
  | "modern"
  | "premium"
  | "traditional"
  | "festive"
  | "photo-heavy"
  | "information"
  | "government"
  | "patriotic"
  | "editorial";

export type CreativeFormat =
  | "SQUARE_POST"
  | "PORTRAIT_POST"
  | "STORY_STATUS"
  | "LANDSCAPE_POST"
  | "PRINT_A4"
  | "PRINT_A3"
  | "BANNER_WIDE"
  | "CUSTOM";

export type CreativeStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "APPROVED"
  | "READY_TO_PUBLISH"
  | "PUBLISHED"
  | "REJECTED"
  | "ARCHIVED";

export type CreativeAssetType =
  | "LEADER_PHOTO"
  | "PARTY_LOGO"
  | "TENANT_LOGO"
  | "ICON"
  | "STICKER"
  | "BACKGROUND"
  | "FRAME"
  | "DECORATION"
  | "BADGE"
  | "WATERMARK"
  | "OTHER";

export type CreativeElementType =
  | "text"
  | "image"
  | "shape"
  | "icon"
  | "logo"
  | "leader_photo"
  | "background"
  | "line"
  | "sticker"
  | "badge"
  | "tricolor"
  | "divider"
  | "qr"
  | "social"
  | "footer";

export interface CanvasElement {
  id: string;
  name: string;
  type: CreativeElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  locked?: boolean;
  visible?: boolean;
  zIndex?: number;

  // Binding slot key for template driven updates
  binding?: string;

  // Text specific
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  color?: string;
  highlightColor?: string;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  dynamicToken?: string; // e.g. {{representativeName}}, {{leaderPhoto}}, {{partyLogo}}

  // Image / Asset specific
  url?: string;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  borderRadius?: number;
  isCircular?: boolean;
  borderWidth?: number;
  borderColor?: string;
  shadowColor?: string;
  shadowBlur?: number;

  // Shape specific
  shapeType?: "rectangle" | "circle" | "badge" | "banner" | "tricolor_strip" | "divider";
  backgroundColor?: string;

  // Dynamic template protections
  dynamic?: boolean;
  editable?: boolean;
}

export interface QuickEditField {
  key: string;
  label: string;
  type: "text" | "textarea" | "image" | "date" | "time" | "stat_number" | "select";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: string;
}

export interface SemanticSlot {
  slot: string;
  label: string;
  type: "text" | "textarea" | "image" | "date" | "time" | "bullet_list" | "number_stat" | "qr";
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  description?: string;
}

export interface CreativeTemplateDef {
  id: string;
  num: number;
  slug: string;
  name: string;
  category: CreativeCategory;
  styleFamily?: TemplateStyle;
  description: string;
  format: CreativeFormat;
  supportedFormats?: CreativeFormat[];
  width: number;
  height: number;
  tag: string;
  primaryColor: string;
  secondaryColor?: string;
  bgGradient: string;
  templateType:
    | "birthday"
    | "meeting"
    | "event"
    | "scheme"
    | "awareness"
    | "festival"
    | "national_day"
    | "achievement"
    | "darbar"
    | "announcement"
    | "general"
    | "development";
  headingText: string;
  subheadingText: string;
  messageText: string;
  sloganText: string;
  dateText?: string;
  timeText?: string;
  venueText?: string;
  bullet1?: string;
  bullet2?: string;
  bullet3?: string;
  footerText: string;
  badgeText?: string;
  semanticSlots?: SemanticSlot[];
  quickEditSchema?: QuickEditField[];
  thumbnailUrl?: string;
  previewUrl?: string;
  elements?: CanvasElement[];
  layoutConfig?: any;
}

export interface DesignState {
  id?: string;
  title: string;
  category: CreativeCategory;
  format: CreativeFormat;
  width: number;
  height: number;
  background: {
    type: "solid" | "gradient" | "image" | "pattern";
    value: string;
    opacity?: number;
  };
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
  };
  slotValues: Record<string, string>;
  branding: {
    useOfficial: boolean;
    representativeName: string;
    designation: string;
    leaderPhotoUrl: string;
    partyLogoUrl: string;
    footerText: string;
  };
  elements: CanvasElement[];
}

export interface SavedCreativeItem {
  id: string;
  title: string;
  category: CreativeCategory;
  format: CreativeFormat;
  designJson: any;
  previewUrl?: string;
  exportUrl?: string;
  status: CreativeStatus;
  version: number;
  shareToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DesignHealthIssue {
  id: string;
  type: "overflow" | "image_missing" | "margin_unsafe" | "contrast" | "overlap";
  message: string;
  severity: "error" | "warning";
  elementId?: string;
  autoFixable: boolean;
}
