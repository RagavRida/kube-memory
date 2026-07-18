import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { listOncalls } from "../pagerduty/client.js";
import { listUsers as listSlackUsers } from "../slack/client.js";

export interface OncallPerson {
  name: string;
  email?: string;
  slackUserId?: string;
  pagerDutyUserId?: string;
  team?: string;
  source: "roster" | "pagerduty" | "slack";
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  values.push(current.trim());
  return values;
}

/** Slack user IDs start with U (or W for workspace guests). Member IDs are not valid for mentions. */
export function normalizeSlackUserId(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  const id = raw.trim().replace(/^@/, "");
  if (/^U[A-Z0-9]+$/i.test(id) || /^W[A-Z0-9]+$/i.test(id)) return id;
  return undefined;
}

interface RosterRow {
  name: string;
  email?: string;
  slack_user_id?: string;
  pagerduty_user_id?: string;
  team?: string;
  active?: string;
}

function coalesceSlackId(row: RosterRow): string | undefined {
  const fromColumn = normalizeSlackUserId(row.slack_user_id);
  if (fromColumn) return fromColumn;
  // Common mistake: Slack user ID pasted in email column
  const fromEmail = normalizeSlackUserId(row.email);
  if (fromEmail) return fromEmail;
  return undefined;
}

let cachedRoster: RosterRow[] | null = null;

function repoRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
}

function loadRosterCsv(): RosterRow[] {
  if (cachedRoster) return cachedRoster;

  const path = resolve(repoRoot(), "docs/oncall-roster.csv");
  try {
    const raw = readFileSync(path, "utf8");
    const lines = raw.trim().split("\n");
    if (lines.length < 2) {
      cachedRoster = [];
      return cachedRoster;
    }

    const headers = parseCsvLine(lines[0]);
    cachedRoster = lines.slice(1).filter((l) => l.trim()).map((line) => {
      const values = parseCsvLine(line);
      const row: Record<string, string> = {};
      headers.forEach((header, i) => {
        row[header] = values[i] ?? "";
      });
      return row as unknown as RosterRow;
    });
    return cachedRoster;
  } catch {
    cachedRoster = [];
    return cachedRoster;
  }
}

export function getRosterEntry(team?: string): OncallPerson | undefined {
  const roster = loadRosterCsv();
  const active = roster.filter((r) => String(r.active ?? "true").toLowerCase() !== "false");
  const match = team
    ? active.find((r) => r.team?.toLowerCase() === team.toLowerCase())
    : active[0];

  if (!match) return undefined;

  return {
    name: match.name,
    email: normalizeSlackUserId(match.email) ? undefined : match.email,
    slackUserId: coalesceSlackId(match),
    pagerDutyUserId: match.pagerduty_user_id,
    team: match.team,
    source: "roster",
  };
}

async function resolveFromPagerDuty(workspaceId: string): Promise<OncallPerson | undefined> {
  try {
    const oncalls = await listOncalls({ workspaceId, limit: 5 });
    const first = oncalls[0] as { user?: { id?: string; summary?: string; email?: string } } | undefined;
    if (!first?.user) return undefined;

    let slackUserId: string | undefined;
    if (first.user.email) {
      const slackMembers = await listSlackUsers({ workspaceId, limit: 200 });
      const match = (slackMembers as Array<{ profile?: { email?: string }; id?: string }>).find(
        (m) => m.profile?.email?.toLowerCase() === first.user?.email?.toLowerCase(),
      );
      slackUserId = match?.id;
    }

    return {
      name: first.user.summary ?? "On-call",
      email: first.user.email,
      slackUserId,
      pagerDutyUserId: first.user.id,
      source: "pagerduty",
    };
  } catch {
    return undefined;
  }
}

export async function resolveOncall(workspaceId: string, team?: string): Promise<OncallPerson | undefined> {
  const roster = getRosterEntry(team);
  if (roster?.slackUserId || roster?.name) {
    return roster;
  }

  const pd = await resolveFromPagerDuty(workspaceId);
  if (pd) return pd;

  return roster;
}

export function formatSlackMention(person?: OncallPerson): string {
  if (!person) return "";
  const id = normalizeSlackUserId(person.slackUserId);
  if (id) return `<@${id}>`;
  return person.name ? `@${person.name}` : "";
}

/** Invalidate cached roster (e.g. after CSV edit). */
export function clearRosterCache(): void {
  cachedRoster = null;
}
