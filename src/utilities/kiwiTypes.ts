/**
 * Render TypeScript declarations for a kiwi schema — the types of what
 * `compiledSchema.decodeMessage` returns.
 *
 * Decoding rules (kiwi-schema 0.5): ENUM values decode to their names; a
 * MESSAGE field is present only if it was written, so every one is optional;
 * a STRUCT always carries every field; `byte[]` is a Uint8Array; `int64` and
 * `uint64` are bigint.
 */

interface KiwiField {
  name: string;
  type: string | null;
  isArray: boolean;
  isDeprecated?: boolean;
}

interface KiwiDefinition {
  kind: "ENUM" | "STRUCT" | "MESSAGE";
  name: string;
  fields: KiwiField[];
}

const PRIMITIVES: Record<string, string> = {
  bool: "boolean",
  byte: "number",
  int: "number",
  uint: "number",
  float: "number",
  string: "string",
  int64: "bigint",
  uint64: "bigint",
};

function propertyName(name: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}

function fieldType(field: KiwiField): string {
  if (field.isArray && field.type === "byte") return "Uint8Array";
  const base = PRIMITIVES[field.type ?? ""] ?? field.type ?? "unknown";
  return field.isArray ? `${base}[]` : base;
}

export function renderKiwiTypes(definitions: readonly KiwiDefinition[], header: string): string {
  const out: string[] = [header.trimEnd(), ""];
  for (const def of definitions) {
    if (def.kind === "ENUM") {
      const values = def.fields.map((f) => JSON.stringify(f.name));
      out.push(`export type ${def.name} =`);
      out.push(values.map((v) => `  | ${v}`).join("\n") + ";");
      out.push("");
      continue;
    }
    const optional = def.kind === "MESSAGE" ? "?" : "";
    out.push(`export interface ${def.name} {`);
    for (const field of def.fields) {
      if (field.isDeprecated) out.push("  /** @deprecated */");
      out.push(`  ${propertyName(field.name)}${optional}: ${fieldType(field)};`);
    }
    out.push("}");
    out.push("");
  }
  return out.join("\n");
}
