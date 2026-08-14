import { boardConfig } from "./board-config";
import { MondayApiError } from "./monday";

const MONDAY_API_URL = "https://api.monday.com/v2";

export interface LeadMatch {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  groupTitle: string;
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

// Finds every item in the named board group whose item name contains
// `leadName` (case/diacritic-insensitive substring match, so a partial name
// still finds the right person) - the caller decides what to do when more
// than one match comes back.
export async function findLeadsInGroup(groupName: string, leadName: string): Promise<LeadMatch[]> {
  const groupsData = await mondayQuery<{ boards: { groups: { id: string; title: string }[] }[] }>(
    `query ($boardId: ID!) { boards(ids: [$boardId]) { groups { id title } } }`,
    { boardId: boardConfig.boardId }
  );
  const groups = groupsData.boards[0].groups;
  const group = groups.find((g) => g.title.trim() === groupName.trim());
  if (!group) {
    const available = groups.map((g) => g.title).join(", ");
    throw new Error(`No group named "${groupName}" on the board. Available groups: ${available}`);
  }

  const itemsData = await mondayQuery<{
    boards: { groups: { items_page: { items: { id: string; name: string; column_values: { id: string; text: string | null }[] }[] } }[] }[];
  }>(
    `query ($boardId: ID!, $groupId: [String!]) {
      boards(ids: [$boardId]) {
        groups(ids: $groupId) {
          items_page(limit: 500) {
            items {
              id
              name
              column_values(ids: ["email8", "mobile8"]) { id text }
            }
          }
        }
      }
    }`,
    { boardId: boardConfig.boardId, groupId: [group.id] }
  );

  const items = itemsData.boards[0].groups[0].items_page.items;
  const needle = leadName.trim().toLowerCase();

  return items
    .filter((it) => it.name.toLowerCase().includes(needle))
    .map((it) => {
      const byId = Object.fromEntries(it.column_values.map((c) => [c.id, c.text]));
      return {
        id: it.id,
        name: it.name,
        email: byId[boardConfig.columns.email.id] || null,
        phone: byId[boardConfig.columns.mobile.id] || null,
        groupTitle: group.title,
      };
    });
}
