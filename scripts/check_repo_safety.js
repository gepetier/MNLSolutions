import { execFileSync } from "node:child_process";

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const forbidden = tracked.filter((path) => {
  const name = path.split("/").at(-1);
  if (name === ".env.example") return false;
  if (/^\.env(?:\..*)?$|^pass\.env$/i.test(name)) return true;
  if (/^(?:contacts|quote-products|invoice_concepts)\.json$/i.test(name)) return true;
  if (/\.(?:xlsx?|pdf|msg|eml|sqlite3?|db)$/i.test(name)) return true;
  if (path.split("/").some((part) => ["logs", "outputs", "release", "dist", "node_modules", ".venv"].includes(part))) return true;
  return false;
});
if (forbidden.length) {
  console.error("Fitxers potencialment sensibles o generats sota control de versions:");
  for (const path of forbidden) console.error(" - " + path);
  console.error("Retira'ls del commit i revisa si cal netejar l'historial.");
  process.exitCode = 1;
} else {
  console.log("Cap ruta sensible coneguda detectada entre els fitxers versionats.");
}
