import { boardConfig, type LeadSource } from "./board-config";

const MONDAY_API_URL = "https://api.monday.com/v2";

export class MondayApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MondayApiError";
  }
}

function dateToISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function todayISO(): string {
  return dateToISO(new Date());
}

// Next business day: date + 1, then skip forward past Friday/Saturday to Sunday.
// Sun/Mon/Tue/Wed -> +1. Thu -> +3 (lands on Sun). Fri -> +2 (lands on Sun). Sat -> +1 (lands on Sun).
export function reminderDateISO(base: Date = new Date()): string {
  const d = new Date(base);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 5 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return dateToISO(d);
}

export interface LeadFields {
  fullName: string;
  email: string;
  phone?: string;
  message?: string;
}

type ColumnValue = string | { label: string } | { date: string } | { phone: string; countryShortName: string } | { personsAndTeams: { id: number; kind: "person" }[] };

export function buildColumnValues(fields: LeadFields, source: LeadSource): Record<string, ColumnValue> {
  const cols = boardConfig.columns;
  const sourceConfig = boardConfig.sources[source];
  const columnValues: Record<string, ColumnValue> = {};

  if (cols.landingPage.id && sourceConfig.landingPageLabel) {
    columnValues[cols.landingPage.id] = { label: sourceConfig.landingPageLabel };
  }
  if (cols.status.id && sourceConfig.statusLabel) {
    columnValues[cols.status.id] = { label: sourceConfig.statusLabel };
  }
  if (cols.contactDate.id) {
    columnValues[cols.contactDate.id] = { date: todayISO() };
  }
  if (cols.reminder.id) {
    columnValues[cols.reminder.id] = { date: reminderDateISO() };
  }
  if (cols.mobile.id && fields.phone) {
    columnValues[cols.mobile.id] = { phone: fields.phone.replace(/\D/g, ""), countryShortName: "IL" };
  }
  if (cols.email.id && fields.email) {
    columnValues[cols.email.id] = fields.email;
  }
  if (cols.people.id) {
    columnValues[cols.people.id] = { personsAndTeams: [{ id: Number(cols.people.userId), kind: "person" }] };
  }
  if (sourceConfig.fillSubjectFromMessage && cols.subject.id && fields.message) {
    columnValues[cols.subject.id] = fields.message;
  }
  if (cols.subject.id && sourceConfig.subjectText) {
    columnValues[cols.subject.id] = sourceConfig.subjectText;
  }

  return columnValues;
}

interface MondayGraphQLResponse {
  data?: { create_item: { id: string } };
  errors?: { message: string }[];
}

// HTTP header values must be Latin1 (byte values 0-255) - fetch throws
// "Cannot convert argument to a ByteString" if a header value contains
// anything outside that range. Header env vars occasionally pick up a stray
// non-Latin1 character when copy-pasted through a browser UI (smart quotes,
// zero-width characters, etc.), so strip anything illegal defensively and
// log if it ever actually removes something - that log is the signal to go
// re-paste the source env var cleanly rather than relying on this forever.
function sanitizeHeaderValue(value: string, envVarName: string): string {
  const cleaned = value.replace(/[^\x00-\xFF]/g, "");
  if (cleaned !== value) {
    console.warn(
      `${envVarName} contained ${value.length - cleaned.length} non-Latin1 character(s) that were stripped before use as an HTTP header. This env var likely needs to be re-pasted in Vercel's dashboard.`
    );
  }
  return cleaned.trim();
}

export async function mondayCreateItem(itemName: string, columnValues: Record<string, ColumnValue>, groupId?: string): Promise<string> {
  const rawToken = process.env.MONDAY_API_TOKEN;
  if (!rawToken) {
    throw new MondayApiError("MONDAY_API_TOKEN is not set");
  }
  const token = sanitizeHeaderValue(rawToken, "MONDAY_API_TOKEN");

  const query = `
    mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
      create_item (
        board_id: $boardId,
        group_id: $groupId,
        item_name: $itemName,
        column_values: $columnValues,
        create_labels_if_missing: true
      ) {
        id
      }
    }
  `;
  const variables = {
    boardId: boardConfig.boardId,
    groupId: groupId ?? boardConfig.groupId,
    itemName,
    columnValues: JSON.stringify(columnValues),
  };

  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "API-Version": "2024-10",
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  const json = (await res.json()) as MondayGraphQLResponse;
  if (json.errors?.length) {
    throw new MondayApiError(json.errors.map((e) => e.message).join("; "));
  }
  if (!json.data) {
    throw new MondayApiError("Monday API returned no data and no errors");
  }
  return json.data.create_item.id;
}
// touched: force fresh deploy to pick up corrected MONDAY_API_TOKEN
