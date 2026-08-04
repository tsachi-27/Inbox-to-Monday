import "dotenv/config";
import { boardConfig } from "../src/lib/board-config";
import { mondayCreateItem, todayISO, reminderDateISO, type MondayApiError } from "../src/lib/monday";

// Manual entry point for WhatsApp leads from Facebook campaigns - these have
// no email (Facebook lead ads only hand over name + phone), so they can't
// flow through the Gmail-based cron pipeline. Tsachi pastes name/phone pairs
// in chat, Claude fills this list in and runs the script by hand.
//
// Deliberately does NOT set Status - same "Tsachi sets it manually" rule as
// ati-lead / ati-propel-contact.
const leads: { fullName: string; phone: string }[] = [
  // { fullName: "...", phone: "+972 5X-XXX-XXXX" },
];

function normalizeIsraeliMobile(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Strip a leading 972 country code and replace with the local trunk "0".
  return digits.startsWith("972") ? "0" + digits.slice(3) : digits;
}

const cols = boardConfig.columns;

for (const lead of leads) {
  const phone = normalizeIsraeliMobile(lead.phone);
  const columnValues = {
    [cols.landingPage.id]: { label: "FB" },
    [cols.contactDate.id]: { date: todayISO() },
    [cols.reminder.id]: { date: reminderDateISO() },
    [cols.mobile.id]: { phone, countryShortName: "IL" },
    [cols.people.id]: { personsAndTeams: [{ id: Number(cols.people.userId), kind: "person" as const }] },
  };

  try {
    const itemId = await mondayCreateItem(lead.fullName, columnValues);
    console.log(`created: ${lead.fullName} -> item ${itemId}`);
  } catch (err) {
    const message = (err as MondayApiError | Error).message ?? String(err);
    console.log(`ERROR: ${lead.fullName} -> ${message}`);
  }
}
