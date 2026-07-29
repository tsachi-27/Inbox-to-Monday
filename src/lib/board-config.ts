// Monday.com board wiring, ported as-is from the original local project's
// board-config.json. These IDs were discovered via that project's
// scripts/inspect-board.js against the real "Leads" board and are stable
// (Monday column/group ids don't change once created).

export type LeadSource = "ati-lead" | "ati-propel-contact";

interface ColumnConfig {
  id: string;
  type: "status" | "date" | "phone" | "text" | "people";
}

export const boardConfig = {
  boardId: "1597808048",
  groupId: "new_group67093",
  columns: {
    landingPage: { id: "status_190", type: "status" } satisfies ColumnConfig,
    // Status is left unmapped on purpose — the board already defaults new
    // items to "To Schedule" via its own automation, and Tsachi wants full
    // manual control over that column and Landing Page's exact label.
    status: { id: "", type: "status" } satisfies ColumnConfig,
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
  } satisfies Record<LeadSource, { landingPageLabel: string; fillSubjectFromMessage: boolean }>,
};
