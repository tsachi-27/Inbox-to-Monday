import { NextResponse } from "next/server";
import { boardConfig } from "@/lib/board-config";
import { MondayApiError } from "@/lib/monday";

const MONDAY_API_URL = "https://api.monday.com/v2";

interface MondayItem {
  id: string;
  group: { id: string; title: string };
  column_values: { text: string | null }[];
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

// Pulls every item on the board (across all pipeline-stage groups, not just
// "New Leads") with just its group and Contact Date - the minimum needed for
// the dashboard to aggregate leads-per-group over any date range the user
// picks client-side, without a fresh Monday round trip per filter change.
export async function GET() {
  try {
    const contactDateColId = boardConfig.columns.contactDate.id;

    const firstPage = await mondayQuery<FirstPageResponse["data"]>(
      `query ($boardId: ID!, $contactDateColId: [String!]) {
        boards(ids: [$boardId]) {
          items_page(limit: 500) {
            cursor
            items {
              id
              group { id title }
              column_values(ids: $contactDateColId) { text }
            }
          }
        }
      }`,
      { boardId: boardConfig.boardId, contactDateColId: [contactDateColId] }
    );

    const allItems: MondayItem[] = [...(firstPage!.boards[0].items_page.items ?? [])];
    let cursor = firstPage!.boards[0].items_page.cursor;

    while (cursor) {
      const nextPage = await mondayQuery<NextPageResponse["data"]>(
        `query ($cursor: String!, $contactDateColId: [String!]) {
          next_items_page(cursor: $cursor, limit: 500) {
            cursor
            items {
              id
              group { id title }
              column_values(ids: $contactDateColId) { text }
            }
          }
        }`,
        { cursor, contactDateColId: [contactDateColId] }
      );
      allItems.push(...(nextPage!.next_items_page.items ?? []));
      cursor = nextPage!.next_items_page.cursor;
    }

    const leads = allItems
      .map((item) => ({
        groupId: item.group.id,
        groupTitle: item.group.title,
        contactDate: item.column_values[0]?.text || null,
      }))
      .filter((lead) => lead.contactDate);

    return NextResponse.json({ leads });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
