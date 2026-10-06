// Writes a single-file copy of the app (sound-engine.js inlined into index.html) for hosts that
// block page scripts loaded from separate files, such as the published Claude artifact.
// Usage: node scripts/build-single-file.mjs <output.html> [--fragment]
//   --fragment drops the <!DOCTYPE>, <html>, <head> and <body> wrappers (the artifact host adds them).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [out, flag] = process.argv.slice(2);
if (!out) { console.error("Usage: node scripts/build-single-file.mjs <output.html> [--fragment]"); process.exit(1); }

let html = readFileSync(path.join(root, "index.html"), "utf8");
const engine = readFileSync(path.join(root, "sound-engine.js"), "utf8");
const tag = '<script src="sound-engine.js"></script>';
if (!html.includes(tag)) { console.error("index.html no longer loads sound-engine.js the expected way"); process.exit(1); }
html = html.replace(tag, () => "<script>\n" + engine + "\n</script>");

if (flag === "--fragment") {
  html = html
    .replace(/<!DOCTYPE html>\s*/i, "")
    .replace(/<html[^>]*>\s*/i, "")
    .replace(/<head>\s*/i, "")
    .replace(/<meta charset="UTF-8">\s*/i, "")
    .replace(/<meta name="viewport"[^>]*>\s*/i, "")
    .replace(/<\/head>\s*/i, "")
    .replace(/<body>\s*/i, "")
    .replace(/<\/body>\s*/i, "")
    .replace(/<\/html>\s*/i, "");
}
writeFileSync(out, html);
console.log("Wrote " + out);
