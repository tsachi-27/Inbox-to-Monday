import { NextResponse } from "next/server";
import { boardConfig } from "@/lib/board-config";
import { MondayApiError } from "@/lib/monday";

const MONDAY_API_URL = "https://api.monday.com/v2";

interface MondayItem {
  id: string;
  name: string;
  group: { id: string; title: string };
  column_values: { id: string; text: string | null }[];
}

interface ItemsPage {
  cursor: string | null;
  items: MondayItem[];
}

interface FirstPageResponse {
  data?: { boards: { items_page: ItemsPage }[] };
  errors?: { message: string }[];
}

interface NextPageResponse {
  data?: { next_items_page: ItemsPage };
  errors?: { message: string }[];
}

async function mondayQuery<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) throw new MondayApiError("MONDAY_API_TOKEN is not set");

  const res = await fetch(MONDAY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token, "API-Version": "2024-10" },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const json = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (json.errors?.length) throw new MondayApiError(json.errors.map((e) => e.message).join("; "));
  if (!json.data) throw new MondayApiError("Monday API returned no data and no errors");
  return json.data;
}

// PRE PRD items aren't real leads (Tsachi's framing) - excluded from the
// dashboard entirely regardless of which group they physically sit in on
// the board, so this holds even before he's finished moving them to their
// own dedicated group.
const EXCLUDED_STATUS = "PRE PRD";

// Pulls every item on the board (across all pipeline-stage groups, not just
// "New Leads") with its group, Contact Date, and Status - the minimum
// needed for the dashboard to aggregate leads-per-group over any date range
// the user picks client-side, without a fresh Monday round trip per filter
// change.
export async function GET() {
  try {
    const colIds = [boardConfig.columns.contactDate.id, boardConfig.columns.status.id, boardConfig.columns.landingPage.id];

    const firstPage = await mondayQuery<FirstPageResponse["data"]>(
      `query ($boardId: ID!, $colIds: [String!]) {
        boards(ids: [$boardId]) {
          items_page(limit: 500) {
            cursor
            items {
              id
              name
              group { id title }
              column_values(ids: $colIds) { id text }
            }
          }
        }
      }`,
      { boardId: boardConfig.boardId, colIds }
    );

    const allItems: MondayItem[] = [...(firstPage!.boards[0].items_page.items ?? [])];
    let cursor = firstPage!.boards[0].items_page.cursor;

    while (cursor) {
      const nextPage = await mondayQuery<NextPageResponse["data"]>(
        `query ($cursor: String!, $colIds: [String!]) {
          next_items_page(cursor: $cursor, limit: 500) {
            cursor
            items {
              id
              name
              group { id title }
              column_values(ids: $colIds) { id text }
            }
          }
        }`,
        { cursor, colIds }
      );
      allItems.push(...(nextPage!.next_items_page.items ?? []));
      cursor = nextPage!.next_items_page.cursor;
    }

    const leads = allItems
      .map((item) => {
        const byId = Object.fromEntries(item.column_values.map((c) => [c.id, c.text]));
        return {
          groupId: item.group.id,
          groupTitle: item.group.title,
          name: item.name,
          contactDate: byId[boardConfig.columns.contactDate.id] || null,
          status: byId[boardConfig.columns.status.id] || null,
          landingPage: byId[boardConfig.columns.landingPage.id] || null,
        };
      })
      .filter((lead) => lead.contactDate && lead.status !== EXCLUDED_STATUS)
      .map(({ groupId, groupTitle, name, contactDate, landingPage }) => ({ groupId, groupTitle, name, contactDate, landingPage }));

    return NextResponse.json({ leads });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
