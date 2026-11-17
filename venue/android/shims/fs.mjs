// The bridge keeps its song list (and the box it found) in files next to it: on the box they live in the app's own folder, by file name.
const nameOf = (file) => String(file).split("/").pop();

export function existsSync(file) { return AndroidHost.fileAge(nameOf(file)) >= 0; }
export function statSync(file) {
  const age = AndroidHost.fileAge(nameOf(file));
  if (age < 0) throw new Error(`ENOENT: ${file}`);
  return { mtimeMs: Date.now() - age };
}
export function readFileSync(file) {
  const text = AndroidHost.readFile(nameOf(file));
  if (text === null) throw new Error(`ENOENT: ${file}`);
  return text;
}
export function writeFileSync(file, text) {
  if (!AndroidHost.writeFile(nameOf(file), String(text))) throw new Error(`cannot write ${file}`);
}
export default { existsSync, statSync, readFileSync, writeFileSync };
