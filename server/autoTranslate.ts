// Auto-translate admin text (FAQ etc.) from English into Chinese and Bahasa.
// Tries, in order: OpenAI (if OPENAI_API_KEY is set — best quality, keeps the
// club's tone), Google Translate's free endpoint, then MyMemory. Each provider
// is skipped on any error, so the button works as long as one is reachable.
export type TLang = "zh" | "id";
const GOOGLE_CODE: Record<TLang, string> = { zh: "zh-CN", id: "id" };
const NAME: Record<TLang, string> = { zh: "Simplified Chinese", id: "Bahasa Indonesia" };
const TIMEOUT = 15000;

async function viaOpenAI(texts: string[], to: TLang): Promise<string[] | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST", signal: AbortSignal.timeout(TIMEOUT),
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini", temperature: 0.2, response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `You translate short texts for a nightclub/KTV member app in Batam, Indonesia into ${NAME[to]}. Keep numbers, prices (RP …), emoji, brand names (Reborn Wave, Doluruu, KGOLD, KOS) and line breaks unchanged. Reply as JSON {"t": [ ...translations in the same order... ]}.` },
        { role: "user", content: JSON.stringify(texts) },
      ],
    }),
  });
  if (!r.ok) throw new Error(`openai ${r.status}`);
  const j: any = await r.json();
  const out = JSON.parse(j?.choices?.[0]?.message?.content || "{}")?.t;
  return Array.isArray(out) && out.length === texts.length ? out.map(String) : null;
}

async function viaGoogle(text: string, to: TLang): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${GOOGLE_CODE[to]}&dt=t&q=${encodeURIComponent(text)}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error(`google ${r.status}`);
  const j: any = await r.json();
  const out = (j?.[0] || []).map((seg: any) => seg?.[0] || "").join("");
  if (!out) throw new Error("google empty");
  return out;
}

async function viaMyMemory(text: string, to: TLang): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${GOOGLE_CODE[to]}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });
  if (!r.ok) throw new Error(`mymemory ${r.status}`);
  const j: any = await r.json();
  const out = j?.responseData?.translatedText;
  if (!out || j?.responseStatus !== 200) throw new Error("mymemory failed");
  return String(out);
}

async function perText(texts: string[], to: TLang, fn: (t: string, to: TLang) => Promise<string>): Promise<string[]> {
  return Promise.all(texts.map((t) => (t.trim() ? fn(t, to) : Promise.resolve(""))));
}

// Translate each text to `to`. Empty strings stay empty. Throws if no provider works.
export async function translateTexts(texts: string[], to: TLang): Promise<string[]> {
  const errors: string[] = [];
  try { const r = await viaOpenAI(texts, to); if (r) return r; } catch (e: any) { errors.push(String(e?.message || e)); }
  try { return await perText(texts, to, viaGoogle); } catch (e: any) { errors.push(String(e?.message || e)); }
  try { return await perText(texts, to, viaMyMemory); } catch (e: any) { errors.push(String(e?.message || e)); }
  throw new Error(`No translation service reachable (${errors.join("; ")})`);
}
