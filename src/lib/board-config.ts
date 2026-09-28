// Monday.com board wiring, ported as-is from the original local project's
// board-config.json. These IDs were discovered via that project's
// scripts/inspect-board.js against the real "Leads" board and are stable
// (Monday column/group ids don't change once created).

export type LeadSource = "ati-lead" | "ati-lead-import" | "ati-propel-contact" | "ati-final-prd";

interface ColumnConfig {
  id: string;
  type: "status" | "date" | "phone" | "text" | "people";
}

interface SourceConfig {
  landingPageLabel?: string;
  statusLabel?: string;
  subjectText?: string;
  fillSubjectFromMessage: boolean;
  // Defaults to boardConfig.groupId ("New Leads") when unset.
  groupId?: string;
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
    // Marks "this lead filled out the PRE PRD questionnaire" independently
    // of whatever group/status the lead is otherwise in - replaces the
    // earlier dedicated-group approach, which was creating duplicate items
    // for leads who already existed on the board under another source.
    prePrd: { id: "text_mm7m1sym", type: "text" } satisfies ColumnConfig,
  },
  sources: {
    "ati-lead": {
      landingPageLabel: "Claude co.il",
      fillSubjectFromMessage: false,
    },
    "ati-lead-import": {
      // Same domain/brand as ati-lead - tagged the same way pending
      // Tsachi telling us he wants this landing page distinguished.
      landingPageLabel: "Claude co.il",
      fillSubjectFromMessage: false,
    },
    "ati-propel-contact": {
      landingPageLabel: "Claude .com",
      fillSubjectFromMessage: true,
    },
    "ati-final-prd": {
      // No statusLabel/groupId: PRE PRD leads now land in the normal New
      // Leads group like everything else - the dedicated group caused the
      // same lead to appear twice when they'd already been contacted
      // through another channel. process-lead.ts checks the whole board
      // for an existing lead by phone/email before creating a new item;
      // when one exists, it only sets columns.prePrd to "YES" on it.
      landingPageLabel: "Claude .com",
      subjectText: "PRE PRD",
      fillSubjectFromMessage: false,
    },
  } as Record<LeadSource, SourceConfig>,
};
