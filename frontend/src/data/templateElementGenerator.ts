import { CanvasElement, CreativeTemplateDef } from "@/types/creative";

export function getTemplateElements(tpl: CreativeTemplateDef): CanvasElement[] {
  // If template already has custom elements defined, return them
  if (tpl.elements && tpl.elements.length > 0) {
    return tpl.elements;
  }

  const width = tpl.width || 1080;
  const height = tpl.height || (tpl.format === "PORTRAIT_POST" ? 1350 : tpl.format === "BANNER_WIDE" ? 630 : 1080);
  const primaryColor = tpl.primaryColor || "#ea580c";
  const secondaryColor = tpl.secondaryColor || "#c2410c";
  const category = tpl.category;
  const type = tpl.templateType;

  const heading = tpl.headingText || tpl.name;
  const subheading = tpl.subheadingText || "";
  const message = tpl.messageText || "";
  const slogan = tpl.sloganText || "सेवा • समर्पण • सुशासन";
  const footer = tpl.footerText || slogan;

  const dateStr = tpl.dateText || "15 अक्टूबर 2026";
  const timeStr = tpl.timeText || "प्रातः 10:30 बजे";
  const venueStr = tpl.venueText || "केंद्रीय कार्यालय / ब्लॉक सभागार";

  const isPortrait = height > 1200;
  const isBanner = height < 800;

  // ── COMMON HEADER & BRANDING ELEMENTS ──────────────────────────────────
  const partyLogoEl: CanvasElement = {
    id: "party-logo",
    name: "Party Logo",
    type: "logo",
    x: isBanner ? 30 : 40,
    y: isBanner ? 15 : 20,
    width: isBanner ? 65 : 80,
    height: isBanner ? 65 : 80,
    dynamicToken: "{{partyLogo}}",
    zIndex: 15,
    editable: true,
  };

  const topSloganEl: CanvasElement = {
    id: "top-slogan-badge",
    name: "Top Tagline / Slogan",
    type: "text",
    x: isBanner ? 110 : 140,
    y: isBanner ? 25 : 30,
    width: isBanner ? width - 140 : width - 180,
    height: isBanner ? 45 : 55,
    text: slogan,
    fontSize: isBanner ? 20 : 24,
    fontFamily: "Noto Sans Devanagari",
    fontWeight: "bold",
    color: primaryColor,
    align: "right",
    zIndex: 15,
    editable: true,
  };

  const footerBannerHeight = isBanner ? 65 : 90;
  const footerBannerEl: CanvasElement = {
    id: "footer-banner",
    name: "Bottom Slogan Bar",
    type: "footer",
    x: 0,
    y: height - footerBannerHeight,
    width: width,
    height: footerBannerHeight,
    backgroundColor: secondaryColor,
    color: "#ffffff",
    text: footer,
    fontSize: isBanner ? 20 : 26,
    fontFamily: "Noto Sans Devanagari",
    fontWeight: "bold",
    align: "center",
    zIndex: 20,
    editable: true,
  };

  // ── LEFT COLUMN: LEADER PHOTO & TITLE BADGE ───────────────────────────
  const leaderX = isBanner ? 30 : 40;
  const leaderWidth = isBanner ? 240 : 340;
  const leaderPhotoHeight = isBanner ? 360 : isPortrait ? 560 : 480;
  const leaderPhotoY = isBanner ? 95 : 125;

  const leaderPhotoEl: CanvasElement = {
    id: "leader-photo",
    name: "Leader Photo",
    type: "leader_photo",
    x: leaderX,
    y: leaderPhotoY,
    width: leaderWidth,
    height: leaderPhotoHeight,
    dynamicToken: "{{leaderPhoto}}",
    borderRadius: 20,
    borderWidth: 4,
    borderColor: "#ffffff",
    shadowColor: "rgba(0,0,0,0.15)",
    shadowBlur: 16,
    zIndex: 12,
    editable: true,
  };

  const leaderTitleY = leaderPhotoY + leaderPhotoHeight + (isBanner ? 10 : 15);
  const leaderTitleHeight = isBanner ? 80 : 95;

  const leaderTitleEl: CanvasElement = {
    id: "leader-title",
    name: "Leader Name & Designation",
    type: "text",
    x: leaderX,
    y: leaderTitleY,
    width: leaderWidth,
    height: leaderTitleHeight,
    text: "{{representativeName}}\n{{designation}}",
    fontSize: isBanner ? 16 : 19,
    fontFamily: "Noto Sans Devanagari",
    fontWeight: "bold",
    color: "#0f172a",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.08)",
    align: "center",
    lineHeight: 1.35,
    zIndex: 14,
    editable: true,
  };

  // ── RIGHT COLUMN METRICS ───────────────────────────────────────────────
  const rightX = isBanner ? 290 : 410;
  const rightWidth = width - rightX - (isBanner ? 30 : 40);

  // ── 1. BIRTHDAY TEMPLATE ───────────────────────────────────────────────
  if (category === "BIRTHDAY" || type === "birthday") {
    return [
      {
        id: "header-accent",
        name: "Festive Top Header Accent",
        type: "shape",
        shapeType: "rectangle",
        x: 0,
        y: 0,
        width: width,
        height: isBanner ? 85 : 110,
        backgroundColor: "rgba(251, 146, 60, 0.16)",
        zIndex: 1,
      },
      partyLogoEl,
      topSloganEl,
      leaderPhotoEl,
      leaderTitleEl,

      // Main Heading
      {
        id: "main-heading",
        name: "Greeting Heading",
        type: "text",
        x: rightX,
        y: isBanner ? 95 : 125,
        width: rightWidth,
        height: isBanner ? 70 : 100,
        text: heading,
        fontSize: isBanner ? 28 : 36,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: primaryColor,
        align: "left",
        lineHeight: 1.2,
        dynamicToken: "{{headingText}}",
        zIndex: 10,
        editable: true,
      },

      // Subheading
      {
        id: "subheading-text",
        name: "Wish Subheading",
        type: "text",
        x: rightX,
        y: isBanner ? 175 : 240,
        width: rightWidth,
        height: isBanner ? 40 : 50,
        text: subheading || "सुख, उत्तम स्वास्थ्य एवं दीर्घायु जीवन की मंगलकामनाएं",
        fontSize: isBanner ? 17 : 21,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: "#b45309",
        align: "left",
        zIndex: 10,
        editable: true,
      },

      // Message Card
      {
        id: "message-text",
        name: "Wish Message Card",
        type: "text",
        x: rightX,
        y: isBanner ? 225 : 305,
        width: rightWidth,
        height: isBanner ? 190 : isPortrait ? 380 : 270,
        text: message || "ईश्वर से आपके उत्तम स्वास्थ्य, दीर्घायु एवं यशस्वी जीवन की मंगलकामना करते हैं। आपके नेतृत्व में हमारा क्षेत्र निरंतर प्रगति के नए कीर्तिमान स्थापित करे।",
        fontSize: isBanner ? 17 : 21,
        fontFamily: "Noto Sans Devanagari",
        color: "#1e293b",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: 18,
        borderWidth: 2,
        borderColor: "#fde68a",
        lineHeight: 1.6,
        align: "left",
        dynamicToken: "{{messageText}}",
        zIndex: 10,
        editable: true,
      },

      // Blessing Card Pill
      {
        id: "blessing-pill",
        name: "Blessing Badge",
        type: "text",
        x: rightX,
        y: isBanner ? 430 : isPortrait ? 710 : 595,
        width: rightWidth,
        height: isBanner ? 55 : 65,
        text: "✨ उत्तम स्वास्थ्य एवं मंगलमय जीवन की अनंत शुभकामनाएं",
        fontSize: isBanner ? 16 : 19,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: "#ffffff",
        backgroundColor: primaryColor,
        borderRadius: 16,
        align: "center",
        zIndex: 10,
        editable: true,
      },

      footerBannerEl,
    ];
  }

  // ── 2. MEETING TEMPLATE ────────────────────────────────────────────────
  if (category === "MEETING" || type === "meeting") {
    return [
      {
        id: "meeting-header-accent",
        name: "Meeting Header Accent",
        type: "shape",
        shapeType: "rectangle",
        x: 0,
        y: 0,
        width: width,
        height: isBanner ? 85 : 110,
        backgroundColor: "rgba(4, 120, 87, 0.12)",
        zIndex: 1,
      },
      partyLogoEl,
      topSloganEl,
      leaderPhotoEl,
      leaderTitleEl,

      // Meeting Heading
      {
        id: "main-heading",
        name: "Meeting Title",
        type: "text",
        x: rightX,
        y: isBanner ? 95 : 125,
        width: rightWidth,
        height: isBanner ? 70 : 100,
        text: heading,
        fontSize: isBanner ? 28 : 34,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: primaryColor,
        align: "left",
        lineHeight: 1.2,
        dynamicToken: "{{headingText}}",
        zIndex: 10,
        editable: true,
      },

      // Meeting Subheading
      {
        id: "subheading-text",
        name: "Meeting Subject",
        type: "text",
        x: rightX,
        y: isBanner ? 175 : 235,
        width: rightWidth,
        height: isBanner ? 40 : 50,
        text: subheading || "क्षेत्रीय विकास कार्यों एवं जनकल्याणकारी योजनाओं की समीक्षा",
        fontSize: isBanner ? 17 : 20,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: "#065f46",
        align: "left",
        zIndex: 10,
        editable: true,
      },

      // Date Badge
      {
        id: "badge-date",
        name: "Date Badge",
        type: "text",
        x: rightX,
        y: isBanner ? 225 : 300,
        width: rightWidth,
        height: isBanner ? 48 : 56,
        text: `🗓️  दिनांक: ${dateStr}`,
        fontSize: isBanner ? 16 : 20,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: "#0f172a",
        backgroundColor: "#ffffff",
        borderRadius: 14,
        borderWidth: 2,
        borderColor: "#bbf7d0",
        align: "left",
        zIndex: 10,
        editable: true,
      },

      // Time Badge
      {
        id: "badge-time",
        name: "Time Badge",
        type: "text",
        x: rightX,
        y: isBanner ? 280 : 368,
        width: rightWidth,
        height: isBanner ? 48 : 56,
        text: `⏰  समय: ${timeStr}`,
        fontSize: isBanner ? 16 : 20,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: "#0f172a",
        backgroundColor: "#ffffff",
        borderRadius: 14,
        borderWidth: 2,
        borderColor: "#bbf7d0",
        align: "left",
        zIndex: 10,
        editable: true,
      },

      // Venue Badge
      {
        id: "badge-venue",
        name: "Venue Badge",
        type: "text",
        x: rightX,
        y: isBanner ? 335 : 436,
        width: rightWidth,
        height: isBanner ? 52 : 62,
        text: `📍  स्थान: ${venueStr}`,
        fontSize: isBanner ? 16 : 19,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: "#0f172a",
        backgroundColor: "#ffffff",
        borderRadius: 14,
        borderWidth: 2,
        borderColor: "#bbf7d0",
        align: "left",
        zIndex: 10,
        editable: true,
      },

      // Invitation Note Card
      {
        id: "invitation-note",
        name: "Invitation Note",
        type: "text",
        x: rightX,
        y: isBanner ? 395 : 512,
        width: rightWidth,
        height: isBanner ? 100 : isPortrait ? 220 : 155,
        text: message || "समस्त सम्मानित पदाधिकारी, कार्यकर्ता एवं क्षेत्रवासी बैठक में सादर आमंत्रित हैं। आपकी उपस्थिति और सुझाव अत्यंत महत्वपूर्ण हैं।",
        fontSize: isBanner ? 15 : 19,
        fontFamily: "Noto Sans Devanagari",
        color: "#064e3b",
        backgroundColor: "rgba(220, 252, 231, 0.8)",
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#86efac",
        lineHeight: 1.45,
        align: "left",
        zIndex: 10,
        editable: true,
      },

      footerBannerEl,
    ];
  }

  // ── 3. OTHER TEMPLATE (Celebrations & Achievements) ────────────────────
  if (category === "OTHER" || (type as string) === "other" || type === "festival" || type === "national_day" || type === "achievement") {
    const crimsonColor = "#b91c1c";
    return [
      {
        id: "festive-header-accent",
        name: "Festive Crimson Header Accent",
        type: "shape",
        shapeType: "rectangle",
        x: 0,
        y: 0,
        width: width,
        height: isBanner ? 85 : 110,
        backgroundColor: "rgba(244, 63, 94, 0.12)",
        zIndex: 1,
      },
      partyLogoEl,
      topSloganEl,
      leaderPhotoEl,
      leaderTitleEl,

      // Main Heading
      {
        id: "main-heading",
        name: "Greeting Heading",
        type: "text",
        x: rightX,
        y: isBanner ? 95 : 125,
        width: rightWidth,
        height: isBanner ? 70 : 100,
        text: heading || "हार्दिक बधाई एवं अनंत शुभकामनाएं",
        fontSize: isBanner ? 28 : 36,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: crimsonColor,
        align: "left",
        lineHeight: 1.2,
        dynamicToken: "{{headingText}}",
        zIndex: 10,
        editable: true,
      },

      // Subheading
      {
        id: "subheading-text",
        name: "Occasion / Subheading",
        type: "text",
        x: rightX,
        y: isBanner ? 175 : 240,
        width: rightWidth,
        height: isBanner ? 40 : 50,
        text: subheading || "विशिष्ट उपलब्धि एवं गौरवशाली अवसर पर मंगलकामनाएं",
        fontSize: isBanner ? 17 : 21,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: "#991b1b",
        align: "left",
        zIndex: 10,
        editable: true,
      },

      // Congratulatory Card
      {
        id: "message-card",
        name: "Congratulatory Card",
        type: "text",
        x: rightX,
        y: isBanner ? 225 : 305,
        width: rightWidth,
        height: isBanner ? 190 : isPortrait ? 380 : 270,
        text: message || "आपकी इस ऐतिहासिक सफलता और उत्कृष्ट योगदान पर हमें गर्व है। ईश्वर से आपके उज्ज्वल भविष्य और निरंतर प्रगति की प्रार्थना करते हैं।",
        fontSize: isBanner ? 17 : 21,
        fontFamily: "Noto Sans Devanagari",
        color: "#1e293b",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: 18,
        borderWidth: 2,
        borderColor: "#fecdd3",
        lineHeight: 1.6,
        align: "left",
        dynamicToken: "{{messageText}}",
        zIndex: 10,
        editable: true,
      },

      // Highlight Badge Pill
      {
        id: "highlight-pill",
        name: "Celebration Badge",
        type: "text",
        x: rightX,
        y: isBanner ? 430 : isPortrait ? 710 : 595,
        width: rightWidth,
        height: isBanner ? 55 : 65,
        text: "🏆 आपकी सफलता हमारा गौरव • उज्ज्वल भविष्य की कामना",
        fontSize: isBanner ? 16 : 19,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: "#ffffff",
        backgroundColor: crimsonColor,
        borderRadius: 16,
        align: "center",
        zIndex: 10,
        editable: true,
      },

      footerBannerEl,
    ];
  }

  // ── 4. GENERAL TEMPLATE (Notice / Vision) ──────────────────────────────
  const royalBlue = "#1d4ed8";
  return [
    {
      id: "general-header-accent",
      name: "Header Blue Accent",
      type: "shape",
      shapeType: "rectangle",
      x: 0,
      y: 0,
      width: width,
      height: isBanner ? 85 : 110,
      backgroundColor: "rgba(29, 78, 216, 0.12)",
      zIndex: 1,
    },
    partyLogoEl,
    topSloganEl,
    leaderPhotoEl,
    leaderTitleEl,

    // Main Heading
    {
      id: "main-heading",
      name: "Announcement Headline",
      type: "text",
      x: rightX,
      y: isBanner ? 95 : 125,
      width: rightWidth,
      height: isBanner ? 70 : 100,
      text: heading,
      fontSize: isBanner ? 28 : 36,
      fontFamily: "Noto Sans Devanagari",
      fontWeight: "bold",
      color: royalBlue,
      align: "left",
      lineHeight: 1.2,
      dynamicToken: "{{headingText}}",
      zIndex: 10,
      editable: true,
    },

    // Subheading
    {
      id: "subheading-text",
      name: "Vision Subheading",
      type: "text",
      x: rightX,
      y: isBanner ? 175 : 240,
      width: rightWidth,
      height: isBanner ? 40 : 50,
      text: subheading || "क्षेत्र के समग्र विकास एवं पारदर्शी प्रशासन की दिशा में निरंतर प्रयास",
      fontSize: isBanner ? 17 : 21,
      fontFamily: "Noto Sans Devanagari",
      fontWeight: "bold",
      color: "#1e40af",
      align: "left",
      zIndex: 10,
      editable: true,
    },

    // Main Notice Box
    {
      id: "message-card",
      name: "Notice Message Card",
      type: "text",
      x: rightX,
      y: isBanner ? 225 : 305,
      width: rightWidth,
      height: isBanner ? 190 : isPortrait ? 380 : 270,
      text: message || "हमारा संकल्प: क्षेत्र के प्रत्येक नागरिक तक विकास और कल्याणकारी योजनाओं का सीधा लाभ पहुंचाना और जनसमस्याओं का त्वरित समाधान करना।",
      fontSize: isBanner ? 17 : 21,
      fontFamily: "Noto Sans Devanagari",
      color: "#1e293b",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderRadius: 18,
      borderWidth: 2,
      borderColor: "#bfdbfe",
      lineHeight: 1.6,
      align: "left",
      dynamicToken: "{{messageText}}",
      zIndex: 10,
      editable: true,
    },

    // Bottom Pillars Pill
    {
      id: "pillars-pill",
      name: "Pillars Badge",
      type: "text",
      x: rightX,
      y: isBanner ? 430 : isPortrait ? 710 : 595,
      width: rightWidth,
      height: isBanner ? 55 : 65,
      text: "🏛️ सुशासन  •  ⚡ त्वरित समाधान  •  🤝 जन भागीदारी",
      fontSize: isBanner ? 16 : 19,
      fontFamily: "Noto Sans Devanagari",
      fontWeight: "bold",
      color: "#ffffff",
      backgroundColor: royalBlue,
      borderRadius: 16,
      align: "center",
      zIndex: 10,
      editable: true,
    },

    footerBannerEl,
  ];
}

