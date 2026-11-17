export const join = (...parts) => parts.join("/").replace(/\/+/g, "/");
export const dirname = (file) => { const at = String(file).lastIndexOf("/"); return at > 0 ? String(file).slice(0, at) : at === 0 ? "/" : "."; };
export default { join, dirname };
