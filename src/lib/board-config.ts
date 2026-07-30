// Monday.com board wiring, ported as-is from the original local project's
// board-config.json. These IDs were discovered via that project's
// scripts/inspect-board.js against the real "Leads" board and are stable
// (Monday column/group ids don't change once created).

export type LeadSource = "ati-lead" | "ati-propel-contact" | "ati-final-prd";

interface ColumnConfig {
  id: string;
  type: "status" | "date" | "phone" | "text" | "people";
}

interface SourceConfig {
  landingPageLabel?: string;
  statusLabel?: string;
  fillSubjectFromMessage: boolean;
}

export const boardConfig = {
  boardId: "1597808048",
  groupId: "new_group67093",
  columns: {
    landingPage: { id: "status_190", type: "status" } satisfies ColumnConfig,
    // Status is left unmapped for ati-lead / ati-propel-contact on purpose —
    // Tsachi wants full manual control over that column for those sources.
    // The ati-final-prd source is the one deliberate exception (see
    // sources.statusLabel below), so the column id itself is real; whether
    // it actually gets written depends entirely on the source config.
    status: { id: "status7", type: "status" } satisfies ColumnConfig,
    subject: { id: "text0", type: "text" } satisfies ColumnConfig,
    contactDate: { id: "contact_date", type: "date" } satisfies ColumnConfig,
    reminder: { id: "reminder", type: "date" } satisfies ColumnConfig,
    mobile: { id: "mobile8", type: "phone" } satisfies ColumnConfig,
    email: { id: "email8", type: "text" } satisfies ColumnConfig,
    people: { id: "people7", type: "people" as const, userId: "7232428" },
  },
  sources: {
    "ati-lead": {
      landingPageLabel: "Claude co.il",
      fillSubjectFromMessage: false,
    },
    "ati-propel-contact": {
      landingPageLabel: "Claude .com",
      fillSubjectFromMessage: true,
    },
    "ati-final-prd": {
      landingPageLabel: "Claude .com",
      statusLabel: "PRE PRD",
      fillSubjectFromMessage: false,
    },
  } as Record<LeadSource, SourceConfig>,
};
