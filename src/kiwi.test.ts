import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseFig } from "./index.js";
import type { Kiwi } from "./index.js";
import { figKiwiSchema } from "./utilities/figKiwiSchema.js";
import { KIWI_TYPES_HEADER } from "./utilities/kiwiTypesHeader.js";
import { renderKiwiTypes } from "./utilities/kiwiTypes.js";

const fixtures = join(__dirname, "..", "test-fixtures");
const files = [
  "circle.fig",
  "OpenFigs.fig",
  "vector-network/word-outline-stroke.fig",
  "instances/medium-complex.fig",
  "variables/just-fonts.deck",
];

const definitions = new Map(figKiwiSchema.definitions.map((d: any) => [d.name, d]));

/**
 * Check a decoded value against a definition the way src/kiwi.ts declares it.
 * Returns one line per disagreement.
 */
function conformance(value: any, typeName: string, where: string, out: string[], unknownFields: Set<string>): void {
  const def: any = definitions.get(typeName);
  if (!def) return void out.push(`${where}: no definition ${typeName}`);
  if (def.kind === "ENUM") {
    if (!def.fields.some((f: any) => f.name === value)) out.push(`${where}: ${JSON.stringify(value)} is not a ${typeName}`);
    return;
  }
  if (typeof value !== "object" || value === null) return void out.push(`${where}: expected ${typeName} object`);
  for (const field of def.fields) {
    if (def.kind === "STRUCT" && !(field.name in value)) out.push(`${where}.${field.name}: missing struct field`);
  }
  for (const [name, v] of Object.entries(value)) {
    const field = def.fields.find((f: any) => f.name === name);
    if (!field) { unknownFields.add(`${typeName}.${name}`); continue; }
    const at = `${where}.${name}`;
    if (field.isArray && field.type === "byte") {
      if (!(v instanceof Uint8Array)) out.push(`${at}: expected Uint8Array`);
      continue;
    }
    const items = field.isArray ? (Array.isArray(v) ? v : (out.push(`${at}: expected array`), [])) : [v];
    for (const item of items) {
      switch (field.type) {
        case "bool": if (typeof item !== "boolean") out.push(`${at}: expected boolean`); break;
        case "int64": case "uint64": if (typeof item !== "bigint") out.push(`${at}: expected bigint`); break;
        case "string": if (typeof item !== "string") out.push(`${at}: expected string`); break;
        case "byte": case "int": case "uint": case "float": if (typeof item !== "number") out.push(`${at}: expected number`); break;
        default: conformance(item, field.type, at, out, unknownFields);
      }
    }
  }
}

describe("generated kiwi types", () => {
  it("are up to date with figKiwiSchema.ts", () => {
    const expected = renderKiwiTypes(figKiwiSchema.definitions as any, KIWI_TYPES_HEADER);
    const actual = readFileSync(join(__dirname, "kiwi.ts"), "utf8").replace(/\r\n/g, "\n");
    expect(actual === expected, "src/kiwi.ts is stale: npx tsx src/utilities/generateKiwiTypes.ts > src/kiwi.ts").toBe(true);
  });

  it("describe what the decoder returns for the reference files", () => {
    const problems: string[] = [];
    const unknownFields = new Set<string>();
    let nodes = 0;
    for (const file of files) {
      const doc = parseFig(new Uint8Array(readFileSync(join(fixtures, file))));
      doc.nodes.forEach((node, i) => conformance(node, "NodeChange", `${file} nodes[${i}]`, problems, unknownFields));
      nodes += doc.nodes.length;
    }
    expect(problems.slice(0, 20)).toEqual([]);
    // Every reference file was written with this schema or an older one.
    expect([...unknownFields]).toEqual([]);
    expect(nodes).toBeGreaterThan(300);
  });

  it("conformance check reports a wrong type, a bad enum and a missing struct field", () => {
    const problems: string[] = [];
    conformance({ guid: { sessionID: 1 }, phase: "GONE", visible: 1 }, "NodeChange", "n", problems, new Set());
    expect(problems).toEqual(["n.guid.localID: missing struct field", "n.phase: \"GONE\" is not a NodePhase", "n.visible: expected boolean"]);
  });

  it("type the fields this library reads", () => {
    // Compile-time: these assignments fail to type-check if the generated
    // names drift from the ones the resolvers rely on.
    const change: Kiwi.NodeChange = {
      type: "INSTANCE",
      overrideKey: { sessionID: 1, localID: 2 },
      symbolData: { symbolID: { sessionID: 1, localID: 3 }, symbolOverrides: [{ visible: false }] },
      componentPropAssignments: [{ defID: { sessionID: 1, localID: 4 }, value: { boolValue: true } }],
      variableConsumptionMap: { entries: [{ variableField: "CORNER_RADIUS" }] },
    };
    const field: Kiwi.ComponentPropNodeField = "TEXT_DATA";
    expect([change.type, field]).toEqual(["INSTANCE", "TEXT_DATA"]);
  });
});
