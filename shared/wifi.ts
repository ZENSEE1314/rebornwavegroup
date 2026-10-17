export type WifiSecurity = "WPA" | "WEP" | "nopass";

// WIFI:T:WPA;S:name;P:password;;  — the characters \ ; , : " in the name or password are escaped with a backslash.
export function wifiQrText(name: string, password: string, security: WifiSecurity): string {
  const escape = (value: string) => value.replace(/([\\;,:"])/g, "\\$1");
  return `WIFI:T:${security};S:${escape(name)};${security === "nopass" ? "" : `P:${escape(password)};`};`;
}
