// App-wide fix for number boxes: many inputs are `value={n}` with
// `onChange={e => set(Number(e.target.value))}`, so clearing the box shows "0"
// and typing then gives "0999". Here, for every <input type="number">:
//  - tapping a box that shows 0 selects it, so what you type replaces the 0;
//  - leading zeros are dropped as you type ("0999" → "999", "-05" → "-5",
//    but "0.5" stays).
// The value is rewritten through the native setter before React's own listener
// runs (capture phase on document), so React's onChange sees the clean value.
const nativeSet = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
const isNumberBox = (t: EventTarget | null): t is HTMLInputElement => t instanceof HTMLInputElement && t.type === "number";

export function installNumberInputFix() {
  document.addEventListener("focusin", (e) => {
    const el = e.target;
    if (isNumberBox(el) && Number(el.value) === 0 && el.value !== "") {
      setTimeout(() => { try { el.select(); } catch { /* some browsers can't select number boxes */ } }, 0);
    }
  }, true);
  document.addEventListener("input", (e) => {
    const el = e.target;
    if (!isNumberBox(el) || !nativeSet) return;
    const clean = el.value.replace(/^(-?)0+(?=\d)/, "$1");
    if (clean !== el.value) nativeSet.call(el, clean);
  }, true);
}
