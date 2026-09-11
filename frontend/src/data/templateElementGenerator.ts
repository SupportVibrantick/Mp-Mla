import { CanvasElement, CreativeTemplateDef } from "@/types/creative";

export function getTemplateElements(tpl: CreativeTemplateDef): CanvasElement[] {
  // If template already has custom elements defined, return them
  if (tpl.elements && tpl.elements.length > 0) {
    return tpl.elements;
  }

  const width = tpl.width || 1080;
  const height = tpl.height || (tpl.format === "PORTRAIT_POST" ? 1350 : 1080);
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

  // Common Header & Branding Elements with non-overlapping geometry
  const partyLogoEl: CanvasElement = {
    id: "party-logo",
    name: "Party Logo",
    type: "logo",
    x: 40,
    y: 30,
    width: 90,
    height: 90,
    dynamicToken: "{{partyLogo}}",
    zIndex: 15,
    editable: true,
  };

  // Top Slogan Header Ribbon
  const topSloganEl: CanvasElement = {
    id: "top-slogan-badge",
    name: "Top Tagline / Slogan",
    type: "text",
    x: 150,
    y: 38,
    width: width - 190,
    height: 46,
    text: slogan,
    fontSize: 22,
    fontFamily: "Noto Sans Devanagari",
    fontWeight: "bold",
    color: primaryColor,
    align: "right",
    zIndex: 15,
    editable: true,
  };

  // Leader Photo (Left Column Stack: y from 140 to 630)
  const leaderPhotoEl: CanvasElement = {
    id: "leader-photo",
    name: "Leader Photo",
    type: "leader_photo",
    x: 40,
    y: 140,
    width: 330,
    height: 490,
    dynamicToken: "{{leaderPhoto}}",
    borderRadius: 20,
    borderWidth: 4,
    borderColor: "#ffffff",
    shadowColor: "rgba(0,0,0,0.15)",
    shadowBlur: 16,
    zIndex: 12,
    editable: true,
  };

  // Leader Name & Designation Badge (Left Column Stack: y from 645 to 735 - safely BELOW photo)
  const leaderTitleEl: CanvasElement = {
    id: "leader-title",
    name: "Leader Name & Designation",
    type: "text",
    x: 40,
    y: 645,
    width: 330,
    height: 90,
    text: "{{representativeName}}\n{{designation}}",
    fontSize: 18,
    fontFamily: "Noto Sans Devanagari",
    fontWeight: "bold",
    color: "#0f172a",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.06)",
    align: "center",
    lineHeight: 1.4,
    zIndex: 14,
    editable: true,
  };

  // Footer Banner (Full Width: y from 990 to 1080)
  const footerBannerEl: CanvasElement = {
    id: "footer-banner",
    name: "Bottom Slogan Bar",
    type: "footer",
    x: 0,
    y: height - 90,
    width: width,
    height: 90,
    backgroundColor: secondaryColor,
    color: "#ffffff",
    text: footer,
    fontSize: 26,
    fontFamily: "Noto Sans Devanagari",
    align: "center",
    zIndex: 20,
    editable: true,
  };

  // ── 1. BIRTHDAY TEMPLATE (Hero Festive & Golden Aesthetics) ───────────────
  if (category === "BIRTHDAY" || type === "birthday") {
    return [
      {
        id: "garland-artwork",
        name: "Festive Top Header Accent",
        type: "shape",
        shapeType: "rectangle",
        x: 0,
        y: 0,
        width: width,
        height: 120,
        backgroundColor: "rgba(251, 146, 60, 0.18)",
        zIndex: 1,
      },
      partyLogoEl,
      topSloganEl,
      leaderPhotoEl,
      leaderTitleEl,

      // Main Heading (Right Column Stack: y from 135 to 235)
      {
        id: "main-heading",
        name: "Greeting Heading",
        type: "text",
        x: 395,
        y: 135,
        width: width - 435,
        height: 100,
        text: heading,
        fontSize: 34,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: primaryColor,
        align: "left",
        lineHeight: 1.2,
        dynamicToken: "{{headingText}}",
        zIndex: 10,
        editable: true,
      },

      // Subheading (Right Column Stack: y from 250 to 300)
      {
        id: "subheading-text",
        name: "Wish Subheading",
        type: "text",
        x: 395,
        y: 250,
        width: width - 435,
        height: 50,
        text: subheading || "सुख, उत्तम स्वास्थ्य एवं दीर्घायु जीवन की मंगलकामनाएं",
        fontSize: 20,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: "#b45309",
        align: "left",
        zIndex: 10,
        editable: true,
      },

      // Message Card (Right Column Stack: y from 315 to 575)
      {
        id: "message-text",
        name: "Wish Message Card",
        type: "text",
        x: 395,
        y: 315,
        width: width - 435,
        height: 260,
        text: message || "ईश्वर से आपके उत्तम स्वास्थ्य, दीर्घायु एवं यशस्वी जीवन की मंगलकामना करते हैं। आपके नेतृत्व में हमारा क्षेत्र निरंतर प्रगति के नए कीर्तिमान स्थापित करे।",
        fontSize: 20,
        fontFamily: "Noto Sans Devanagari",
        color: "#334155",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#fde68a",
        lineHeight: 1.6,
        align: "left",
        dynamicToken: "{{messageText}}",
        zIndex: 10,
        editable: true,
      },

      // Blessing Card Pill (Right Column Stack: y from 590 to 655)
      {
        id: "blessing-pill",
        name: "Blessing Badge",
        type: "text",
        x: 395,
        y: 590,
        width: width - 435,
        height: 65,
        text: "✨ उत्तम स्वास्थ्य एवं मंगलमय जीवन की अनंत शुभकामनाएं",
        fontSize: 19,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: "#ffffff",
        backgroundColor: primaryColor,
        borderRadius: 14,
        align: "center",
        zIndex: 10,
      },

      footerBannerEl,
    ];
  }

  // ── 2. MEETING TEMPLATE (Professional Green & Emerald Agenda Layout) ──────
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
        height: 120,
        backgroundColor: "rgba(4, 120, 87, 0.12)",
        zIndex: 1,
      },
      partyLogoEl,
      topSloganEl,
      leaderPhotoEl,
      leaderTitleEl,

      // Meeting Heading (Right Column Stack: y from 135 to 235)
      {
        id: "main-heading",
        name: "Meeting Title",
        type: "text",
        x: 395,
        y: 135,
        width: width - 435,
        height: 100,
        text: heading,
        fontSize: 34,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: primaryColor,
        align: "left",
        lineHeight: 1.2,
        dynamicToken: "{{headingText}}",
        zIndex: 10,
        editable: true,
      },

      // Meeting Subheading (Right Column Stack: y from 250 to 300)
      {
        id: "subheading-text",
        name: "Meeting Subject",
        type: "text",
        x: 395,
        y: 250,
        width: width - 435,
        height: 50,
        text: subheading || "क्षेत्रीय विकास कार्यों एवं जनकल्याणकारी योजनाओं की समीक्षा",
        fontSize: 20,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: "#065f46",
        align: "left",
        zIndex: 10,
        editable: true,
      },

      // Date Badge (y: 315 to 371)
      {
        id: "badge-date",
        name: "Date Badge",
        type: "text",
        x: 395,
        y: 315,
        width: width - 435,
        height: 56,
        text: `🗓️  दिनांक: ${dateStr}`,
        fontSize: 20,
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

      // Time Badge (y: 385 to 441)
      {
        id: "badge-time",
        name: "Time Badge",
        type: "text",
        x: 395,
        y: 385,
        width: width - 435,
        height: 56,
        text: `⏰  समय: ${timeStr}`,
        fontSize: 20,
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

      // Venue Badge (y: 455 to 521)
      {
        id: "badge-venue",
        name: "Venue Badge",
        type: "text",
        x: 395,
        y: 455,
        width: width - 435,
        height: 66,
        text: `📍  स्थान: ${venueStr}`,
        fontSize: 19,
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

      // Invitation Note Card (y: 535 to 665)
      {
        id: "invitation-note",
        name: "Invitation Note",
        type: "text",
        x: 395,
        y: 535,
        width: width - 435,
        height: 130,
        text: message || "समस्त सम्मानित पदाधिकारी, कार्यकर्ता एवं क्षेत्रवासी बैठक में सादर आमंत्रित हैं। आपकी उपस्थिति और सुझाव अत्यंत महत्वपूर्ण हैं।",
        fontSize: 18,
        fontFamily: "Noto Sans Devanagari",
        color: "#064e3b",
        backgroundColor: "rgba(220, 252, 231, 0.7)",
        borderRadius: 14,
        borderWidth: 2,
        borderColor: "#86efac",
        lineHeight: 1.4,
        align: "left",
        zIndex: 10,
        editable: true,
      },

      footerBannerEl,
    ];
  }

  // ── 3. OTHER TEMPLATE (Celebrations, Achievements & Festive Greetings) ───
  if (category === "OTHER" || type === "other") {
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
        height: 120,
        backgroundColor: "rgba(244, 63, 94, 0.12)",
        zIndex: 1,
      },
      partyLogoEl,
      topSloganEl,
      leaderPhotoEl,
      leaderTitleEl,

      // Main Heading (Right Column Stack: y from 135 to 235)
      {
        id: "main-heading",
        name: "Greeting Heading",
        type: "text",
        x: 395,
        y: 135,
        width: width - 435,
        height: 100,
        text: heading || "हार्दिक बधाई एवं अनंत शुभकामनाएं",
        fontSize: 34,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: crimsonColor,
        align: "left",
        lineHeight: 1.2,
        dynamicToken: "{{headingText}}",
        zIndex: 10,
        editable: true,
      },

      // Subheading (Right Column Stack: y from 250 to 300)
      {
        id: "subheading-text",
        name: "Occasion / Subheading",
        type: "text",
        x: 395,
        y: 250,
        width: width - 435,
        height: 50,
        text: subheading || "विशिष्ट उपलब्धि एवं गौरवशाली अवसर पर मंगलकामनाएं",
        fontSize: 20,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: "#991b1b",
        align: "left",
        zIndex: 10,
        editable: true,
      },

      // Congratulatory Card (y: 315 to 575)
      {
        id: "message-card",
        name: "Congratulatory Card",
        type: "text",
        x: 395,
        y: 315,
        width: width - 435,
        height: 260,
        text: message || "आपकी इस ऐतिहासिक सफलता और उत्कृष्ट योगदान पर हमें गर्व है। ईश्वर से आपके उज्ज्वल भविष्य और निरंतर प्रगति की प्रार्थना करते हैं।",
        fontSize: 20,
        fontFamily: "Noto Sans Devanagari",
        color: "#1e293b",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        borderRadius: 16,
        borderWidth: 2,
        borderColor: "#fecdd3",
        lineHeight: 1.6,
        align: "left",
        dynamicToken: "{{messageText}}",
        zIndex: 10,
        editable: true,
      },

      // Highlight Badge Pill (y: 590 to 655)
      {
        id: "highlight-pill",
        name: "Celebration Badge",
        type: "text",
        x: 395,
        y: 590,
        width: width - 435,
        height: 65,
        text: "🏆 आपकी सफलता हमारा गौरव • उज्ज्वल भविष्य की कामना",
        fontSize: 19,
        fontFamily: "Noto Sans Devanagari",
        fontWeight: "bold",
        color: "#ffffff",
        backgroundColor: crimsonColor,
        borderRadius: 14,
        align: "center",
        zIndex: 10,
      },

      footerBannerEl,
    ];
  }

  // ── 4. GENERAL TEMPLATE (Clean Royal Blue Announcement Layout) ───────────
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
      height: 120,
      backgroundColor: "rgba(29, 78, 216, 0.12)",
      zIndex: 1,
    },
    partyLogoEl,
    topSloganEl,
    leaderPhotoEl,
    leaderTitleEl,

    // Main Heading (Right Column Stack: y from 135 to 235)
    {
      id: "main-heading",
      name: "Announcement Headline",
      type: "text",
      x: 395,
      y: 135,
      width: width - 435,
      height: 100,
      text: heading,
      fontSize: 34,
      fontFamily: "Noto Sans Devanagari",
      fontWeight: "bold",
      color: royalBlue,
      align: "left",
      lineHeight: 1.2,
      dynamicToken: "{{headingText}}",
      zIndex: 10,
      editable: true,
    },

    // Subheading (Right Column Stack: y from 250 to 300)
    {
      id: "subheading-text",
      name: "Vision Subheading",
      type: "text",
      x: 395,
      y: 250,
      width: width - 435,
      height: 50,
      text: subheading || "क्षेत्र के समग्र विकास एवं पारदर्शी प्रशासन की दिशा में निरंतर प्रयास",
      fontSize: 20,
      fontFamily: "Noto Sans Devanagari",
      fontWeight: "bold",
      color: "#1e40af",
      align: "left",
      zIndex: 10,
      editable: true,
    },

    // Main Notice Box (y: 315 to 575)
    {
      id: "message-card",
      name: "Notice Message Card",
      type: "text",
      x: 395,
      y: 315,
      width: width - 435,
      height: 260,
      text: message || "हमारा संकल्प: क्षेत्र के प्रत्येक नागरिक तक विकास और कल्याणकारी योजनाओं का सीधा लाभ पहुंचाना और जनसमस्याओं का त्वरित समाधान करना।",
      fontSize: 20,
      fontFamily: "Noto Sans Devanagari",
      color: "#1e293b",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderRadius: 16,
      borderWidth: 2,
      borderColor: "#bfdbfe",
      lineHeight: 1.6,
      align: "left",
      dynamicToken: "{{messageText}}",
      zIndex: 10,
      editable: true,
    },

    // Bottom Pillars Pill (y: 590 to 655)
    {
      id: "pillars-pill",
      name: "Pillars Badge",
      type: "text",
      x: 395,
      y: 590,
      width: width - 435,
      height: 65,
      text: "🏛️ सुशासन  •  ⚡ त्वरित समाधान  •  🤝 जन भागीदारी",
      fontSize: 19,
      fontFamily: "Noto Sans Devanagari",
      fontWeight: "bold",
      color: "#ffffff",
      backgroundColor: royalBlue,
      borderRadius: 14,
      align: "center",
      zIndex: 10,
    },

    footerBannerEl,
  ];
}
