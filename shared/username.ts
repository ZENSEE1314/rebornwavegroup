/** A new account's username is its email (the member can change it in Profile); null when there is no email. */
export function emailAsUsername(email: unknown): string | null {
  const clean = typeof email === "string" ? email.trim().toLowerCase() : "";
  return clean.includes("@") ? clean : null;
}
