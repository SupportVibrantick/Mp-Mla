/**
 * AI Prompt Templates for Competitor Analysis
 * These prompts ensure structured, parseable JSON responses from Gemini.
 */

export interface MetricDataPoint {
  category: string;
  metricKey: string;
  metricLabel: string;
  value: number;
  unit?: string;
}

export interface AnalysisInput {
  competitorName: string;
  competitorParty: string;
  constituency?: string;
  designation?: string;
  notes?: string;
  ownMetrics: MetricDataPoint[];
  competitorMetrics: MetricDataPoint[];
  period: string; // e.g., "April 2026"
}

export const COMPETITOR_METRIC_CATEGORIES = [
  "VOTER_OUTREACH",
  "GROUND_NETWORK",
  "ISSUE_RESOLUTION",
  "PUBLIC_SENTIMENT",
  "DIGITAL_PRESENCE",
  "EVENTS_ACTIVITIES",
  "FINANCIAL_DEVELOPMENT",
] as const;

/**
 * Build the full competitor analysis prompt
 */
export function buildAnalysisPrompt(input: AnalysisInput): string {
  const ownByCategory = groupByCategory(input.ownMetrics);
  const compByCategory = groupByCategory(input.competitorMetrics);
  const allCategories = new Set([
    ...COMPETITOR_METRIC_CATEGORIES,
    ...Object.keys(ownByCategory),
    ...Object.keys(compByCategory),
  ]);

  const comparisonTable = Array.from(allCategories)
    .map((cat) => {
      const ownItems = ownByCategory[cat] || [];
      const compItems = compByCategory[cat] || [];
      return `
### ${formatCategory(cat)}
**Our Metrics:**
${ownItems.length > 0 ? ownItems.map((m) => `  - ${m.metricLabel}: ${m.value} ${m.unit || ""}`).join("\n") : "  - No data available"}

**${input.competitorName} (${input.competitorParty}) Metrics:**
${compItems.length > 0 ? compItems.map((m) => `  - ${m.metricLabel}: ${m.value} ${m.unit || ""}`).join("\n") : "  - No data available"}`;
    })
    .join("\n");

  return `You are an expert political strategist and competitive intelligence analyst for Indian constituency politics. You are analyzing data for the period: ${input.period}.

## CONTEXT
We are an MLA/MP office analyzing our performance against a key competitor.

**Our Position:** Incumbent / Current MLA/MP
**Competitor:** ${input.competitorName} — ${input.competitorParty}
${input.constituency ? `**Constituency:** ${input.constituency}` : ""}
${input.designation ? `**Competitor Designation:** ${input.designation}` : ""}
${input.notes ? `**Known Context / Notes:** ${input.notes}` : ""}

## DATA FOR ANALYSIS
${comparisonTable}

## YOUR TASK
Perform a comprehensive, production-grade competitive analysis. Be specific, data-driven, and actionable. Do NOT give generic advice — every recommendation must reference the actual data provided.

Respond with a JSON object in EXACTLY this structure:
{
  "executiveSummary": "A 3-5 sentence strategic overview of our competitive position. Reference specific numbers.",
  "overallScore": <number 0-100 representing our competitive strength>,
  "areasLeading": <number of categories where we are stronger>,
  "areasTrailing": <number of categories where competitor is stronger>,
  "areasTied": <number of categories where it's roughly equal>,
  "metricComparisons": [
    {
      "category": "<CATEGORY_KEY>",
      "categoryLabel": "<Human Readable Category>",
      "ours": <our aggregate score for this category 0-100>,
      "theirs": <their aggregate score for this category 0-100>,
      "gap": <positive means we lead, negative means we trail>,
      "advantage": "ours" | "theirs" | "tied",
      "insight": "Specific data-driven insight about this category",
      "recommendation": "Concrete action to take for this category"
    }
  ],
  "strengths": ["Specific strength 1 with data reference", "..."],
  "weaknesses": ["Specific weakness 1 with data reference", "..."],
  "opportunities": ["Specific opportunity 1 based on gaps", "..."],
  "threats": ["Specific threat 1 based on competitor advantages", "..."],
  "recommendations": [
    {
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "action": "Specific action to take",
      "expectedImpact": "What improvement this will create",
      "timeline": "When to execute (immediate/1-2 weeks/1 month/quarterly)",
      "category": "<Related CATEGORY_KEY>"
    }
  ]
}

IMPORTANT RULES:
1. Every insight MUST reference actual data values provided, or explicitly say which data is missing.
2. Recommendations must be specific and actionable for Indian political context.
3. Score 0-100 should reflect realistic assessment, not optimistic.
4. Include these exact category keys in metricComparisons: ${COMPETITOR_METRIC_CATEGORIES.join(", ")}. Mark missing data clearly in the insight.
5. Minimum 3 items in strengths, weaknesses, opportunities, threats.
6. Minimum 5 recommendations sorted by priority (HIGH first).
7. Return ONLY valid JSON, no markdown, no commentary.`;
}

/**
 * Build follow-up chat prompt with analysis context
 */
export function buildChatPrompt(
  analysisContext: string,
  chatHistory: { role: string; message: string }[],
  newQuestion: string,
): string {
  const history = chatHistory
    .map((msg) => `${msg.role === "user" ? "User" : "Analyst"}: ${msg.message}`)
    .join("\n\n");

  return `You are an expert political strategist continuing a conversation about a competitive analysis.

## ANALYSIS REPORT CONTEXT
${analysisContext}

## CONVERSATION HISTORY
${history}

## NEW QUESTION
User: ${newQuestion}

## INSTRUCTIONS
- Answer the question using the analysis context and data provided.
- Be specific, data-driven, and actionable.
- Reference specific metrics when relevant.
- For Indian political context (constituency/ward level politics).
- If the question is unrelated to the analysis, politely redirect to the analysis topic.
- Keep the response concise but thorough (2-4 paragraphs max).
- Do NOT return JSON. Return a clear, well-formatted text response with markdown if helpful.`;
}

// ─── Helpers ────────────────────────────────────────────

function groupByCategory(
  metrics: MetricDataPoint[],
): Record<string, MetricDataPoint[]> {
  return metrics.reduce(
    (acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category].push(m);
      return acc;
    },
    {} as Record<string, MetricDataPoint[]>,
  );
}

function formatCategory(key: string): string {
  const map: Record<string, string> = {
    VOTER_OUTREACH: "Voter Outreach & Engagement",
    GROUND_NETWORK: "Ground Network Strength",
    ISSUE_RESOLUTION: "Issue Resolution / Public Service",
    PUBLIC_SENTIMENT: "Public Sentiment & Perception",
    DIGITAL_PRESENCE: "Digital & Social Media Presence",
    EVENTS_ACTIVITIES: "Events & Community Activities",
    FINANCIAL_DEVELOPMENT: "Financial / Development Work",
  };
  return map[key] || key.replace(/_/g, " ");
}
