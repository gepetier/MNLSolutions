import test from "node:test";
import assert from "node:assert/strict";
import { parseCsv } from "../src/csv.js";
import { contactsToCsv } from "../src/contactStore.js";

test("CSV: camps amb comes, cometes i salts de línia", () => {
  const rows = parseCsv('nom,nota\r\n"Prova, SL","va dir ""hola"""\r\n');
  assert.deepEqual(rows, [{ nom: "Prova, SL", nota: 'va dir "hola"' }]);
});

test("CSV: línies buides i capçalera sense registres", () => {
  assert.deepEqual(parseCsv(""), []);
  assert.deepEqual(parseCsv("nom,telefon\n\n"), []);
});

test("Exportació de contactes ficticis amb escapament correcte", () => {
  const csv = contactsToCsv([{ name: 'Proves "Nord", SL', email: "exemple@example.invalid" }]);
  assert.match(csv, /^name,vat,email,/);
  assert.match(csv, /"Proves ""Nord"", SL"/);
  assert.match(csv, /exemple@example\.invalid/);
  assert.ok(csv.includes("\r\n"));
});
