import { pool } from "./db";
import { decryptValue, encryptValue, lockWord } from "./secretsCrypto";

export type SecretGroup = "ai" | "email" | "whatsapp" | "push" | "music";

export const SECRET_DEFS = [
  { name: "ANTHROPIC_API_KEY", group: "ai" },
  { name: "OPENAI_API_KEY", group: "ai" },
  { name: "RESEND_API_KEY", group: "email" },
  { name: "SENDGRID_API_KEY", group: "email" },
  { name: "WHATSAPP_TOKEN", group: "whatsapp" },
  { name: "WHATSAPP_PHONE_ID", group: "whatsapp" },
  { name: "WHATSAPP_VERIFY_TOKEN", group: "whatsapp" },
  { name: "EXPO_ACCESS_TOKEN", group: "push" },
  { name: "SPOTIFY_CLIENT_ID", group: "music" },
  { name: "SPOTIFY_CLIENT_SECRET", group: "music" },
] as const satisfies readonly { name: string; group: SecretGroup }[];

export type SecretName = (typeof SECRET_DEFS)[number]["name"];
export type SecretState = "saved" | "env" | "unreadable" | "none";

const REFRESH_MS = 60_000;
const MAX_VALUE_LENGTH = 4000;

const saved = new Map<string, string>();
const unreadable = new Set<string>();
let refreshTimer: NodeJS.Timeout | undefined;

export const isSecretName = (name: string): name is SecretName => SECRET_DEFS.some((d) => d.name === name);

/** The key's value: the one the main admin saved in the website, else the host's variable of the same name. */
export function secret(name: SecretName): string | undefined {
  return saved.get(name) || process.env[name]?.trim() || undefined;
}

export function canSaveSecrets(): boolean {
  return lockWord() !== "";
}

async function ensureTable() {
  await pool.query("CREATE TABLE IF NOT EXISTS bridge_platform_secrets (name varchar PRIMARY KEY, value text NOT NULL, updated_at timestamp NOT NULL DEFAULT now(), updated_by varchar)");
}

export async function loadSecrets() {
  await ensureTable();
  const word = lockWord();
  const { rows } = await pool.query("SELECT name, value FROM bridge_platform_secrets");
  saved.clear();
  unreadable.clear();
  for (const row of rows) {
    const plain = decryptValue(row.value, word);
    if (plain === null) unreadable.add(row.name);
    else saved.set(row.name, plain);
  }
  if (!refreshTimer) {
    // Another server using the same database (the PC copy) picks up a change within a minute.
    refreshTimer = setInterval(() => void loadSecrets().catch((error) => console.error("[secrets] refresh failed", error)), REFRESH_MS);
    refreshTimer.unref();
  }
}

export function secretStates(): { name: SecretName; group: SecretGroup; state: SecretState }[] {
  return SECRET_DEFS.map(({ name, group }) => ({
    name,
    group,
    state: saved.has(name) ? "saved" : unreadable.has(name) ? "unreadable" : process.env[name]?.trim() ? "env" : "none",
  }));
}

export async function saveSecret(name: SecretName, value: string, updatedBy: string | null) {
  const clean = value.trim();
  if (!clean || clean.length > MAX_VALUE_LENGTH) throw new Error("the value is empty or too long");
  await ensureTable();
  await pool.query(
    "INSERT INTO bridge_platform_secrets (name, value, updated_by) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET value = $2, updated_by = $3, updated_at = now()",
    [name, encryptValue(clean, lockWord()), updatedBy],
  );
  saved.set(name, clean);
  unreadable.delete(name);
}

export async function removeSecret(name: SecretName) {
  await ensureTable();
  await pool.query("DELETE FROM bridge_platform_secrets WHERE name = $1", [name]);
  saved.delete(name);
  unreadable.delete(name);
}
