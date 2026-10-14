/**
 * Variable resolution.
 *
 * A `VARIABLE` node holds one value per mode (`variableDataValues.entries`,
 * keyed by `modeID`); its `VARIABLE_SET` lists the modes. Consumers point at a
 * variable with a `VariableData` whose `dataType` is `ALIAS` — a paint's
 * `colorVar`, or an entry in a node's `variableConsumptionMap` — and a
 * variable's own value can itself be an alias.
 *
 * References come in two forms: a local `guid`, or an `assetRef` whose `key`
 * matches the `key` of a library variable or set copied into the file. Which
 * mode applies is set per set by `variableModeBySetMap` on the node or its
 * nearest ancestor that has one; otherwise the set's first mode is used.
 */

import type { FigColor, FigDocument, FigGuid, FigNode, FigPaint } from "./types.js";
import { ancestors } from "./tree.js";
import { comparePosition, nodeId } from "./utils.js";

/** A reference to a variable or a variable set: a local guid or a library asset. */
export interface FigVariableRef {
  guid?: FigGuid;
  assetRef?: { key?: string; version?: string };
}

export interface ResolveVariableOptions {
  /**
   * The node the value is read for. Its `variableModeBySetMap`, or its nearest
   * ancestor's, chooses the mode of each set.
   */
  node?: FigNode;
  /** Explicit modes, by set: set node id (`"s:l"`) → mode guid. Wins over `node`. */
  modes?: Map<string, FigGuid>;
}

export interface ResolvedVariableValue {
  /** `resolvedDataType` of the final value: COLOR, FLOAT, STRING, BOOLEAN, ... */
  type: string;
  /**
   * The unwrapped value: a FigColor for COLOR, a number for FLOAT, a string
   * for STRING, a boolean for BOOLEAN; the raw `VariableAnyValue` otherwise.
   */
  value: unknown;
  /** The variable that held the value, after following aliases. Absent for a literal. */
  variable?: FigNode;
  /** The mode the value was read from. */
  modeID?: FigGuid;
}

const MAX_ALIAS_DEPTH = 32;

function guidKey(guid: FigGuid | undefined | null): string {
  return guid ? `${guid.sessionID}:${guid.localID}` : "";
}

function byRef(doc: FigDocument, ref: FigVariableRef | undefined, type: string): FigNode | undefined {
  if (!ref) return undefined;
  if (ref.guid) {
    const node = doc.nodeMap.get(guidKey(ref.guid));
    if (node?.type === type) return node;
  }
  const key = ref.assetRef?.key;
  if (key) return doc.nodes.find((n) => n.type === type && n.key === key && n.phase !== "REMOVED");
  return undefined;
}

/** The VARIABLE a reference names, if it is in the file. */
export function findVariable(doc: FigDocument, ref: FigVariableRef | undefined): FigNode | undefined {
  return byRef(doc, ref, "VARIABLE");
}

/** The VARIABLE_SET a variable belongs to, if it is in the file. */
export function variableSetOf(doc: FigDocument, variable: FigNode): FigNode | undefined {
  return byRef(doc, variable.variableSetID, "VARIABLE_SET");
}

/** A set's modes in order; the first is the default. */
export function variableModes(set: FigNode): Array<{ id: FigGuid; name: string }> {
  const modes: any[] = [...(set.variableSetModes ?? [])];
  modes.sort((a, b) => comparePosition(a.sortPosition, b.sortPosition));
  return modes.map((m) => ({ id: m.id, name: m.name }));
}

/**
 * The mode each set is in for `node`, from `variableModeBySetMap` on the node
 * and its ancestors — the nearest setting for a set wins. Keyed by set node id;
 * sets referenced but not in the file are left out.
 */
export function explicitModes(doc: FigDocument, node: FigNode): Map<string, FigGuid> {
  const modes = new Map<string, FigGuid>();
  for (const n of [node, ...ancestors(doc, node)]) {
    for (const entry of n.variableModeBySetMap?.entries ?? []) {
      const set = byRef(doc, entry.variableSetID, "VARIABLE_SET");
      if (!set || !entry.variableModeID) continue;
      const id = nodeId(set)!;
      if (!modes.has(id)) modes.set(id, entry.variableModeID);
    }
  }
  return modes;
}

function unwrap(value: any, type: string): unknown {
  if (!value) return undefined;
  switch (type) {
    case "COLOR":
      return value.colorValue;
    case "FLOAT":
      return value.floatValue;
    case "STRING":
      return value.textValue;
    case "BOOLEAN":
      return value.boolValue;
    default:
      return value;
  }
}

/**
 * The value a `VariableData` stands for: a literal is returned as is, an
 * `ALIAS` is followed to the variable and read in the applicable mode.
 * Returns `undefined` when an alias names a variable that is not in the file,
 * or the chain of aliases loops.
 */
export function resolveVariableData(
  doc: FigDocument,
  data: any,
  options: ResolveVariableOptions = {},
): ResolvedVariableValue | undefined {
  const modes = options.modes ?? new Map<string, FigGuid>();
  const fromNode = options.node ? explicitModes(doc, options.node) : new Map<string, FigGuid>();
  const seen = new Set<string>();

  let current = data;
  let variable: FigNode | undefined;
  let modeID: FigGuid | undefined;
  for (let depth = 0; depth <= MAX_ALIAS_DEPTH; depth++) {
    if (!current) return undefined;
    if (current.dataType !== "ALIAS") {
      const type = current.resolvedDataType ?? current.dataType;
      return { type, value: unwrap(current.value, type), variable, modeID };
    }

    variable = findVariable(doc, current.value?.alias);
    if (!variable) return undefined;
    const id = nodeId(variable)!;
    if (seen.has(id)) return undefined;
    seen.add(id);

    const entries: any[] = variable.variableDataValues?.entries ?? [];
    const set = variableSetOf(doc, variable);
    const setId = set ? nodeId(set)! : "";
    const wanted = modes.get(setId) ?? fromNode.get(setId) ?? (set ? variableModes(set)[0]?.id : undefined);
    // A mode the variable has no value for falls back to the default mode, then to its first value.
    const fallback = set ? variableModes(set)[0]?.id : undefined;
    const entry =
      entries.find((e) => guidKey(e.modeID) === guidKey(wanted)) ??
      entries.find((e) => guidKey(e.modeID) === guidKey(fallback)) ??
      entries[0];
    if (!entry) return undefined;
    modeID = entry.modeID;
    current = entry.variableData;
  }
  return undefined;
}

/** Resolve a variable by reference — `resolveVariableData` on an alias to it. */
export function resolveVariable(
  doc: FigDocument,
  ref: FigVariableRef | FigNode,
  options?: ResolveVariableOptions,
): ResolvedVariableValue | undefined {
  const alias = "type" in ref && ref.type === "VARIABLE" ? { guid: (ref as FigNode).guid } : (ref as FigVariableRef);
  return resolveVariableData(doc, { dataType: "ALIAS", value: { alias } }, options);
}

/** A paint's colour and opacity; it is drawn with alpha `color.a * opacity`. */
export interface ResolvedPaint {
  color?: FigColor;
  opacity: number;
}

/**
 * The colour and opacity a paint shows. A paint bound to a colour variable
 * (`colorVar` holding an `ALIAS`) takes the variable's RGB with `a: 1`, and the
 * variable's alpha as its opacity — Figma does the same when it caches the
 * bound value: a variable with alpha 0.5 is stored as `color.a = 1`,
 * `opacity = 0.5`. Otherwise, or when the variable cannot be resolved, the
 * paint's own `color` and `opacity`.
 *
 * Across 171,164 bound paints in public files, the variable's alpha always
 * equals `color.a * opacity` as Figma stored them; the paint's opacity is never
 * applied on top of it.
 */
export function resolvePaint(
  doc: FigDocument,
  paint: FigPaint & { colorVar?: any },
  options?: ResolveVariableOptions,
): ResolvedPaint {
  // A colorVar that is not an alias is a stored literal, not a binding; the
  // paint's own colour is the authoritative one.
  if (paint.colorVar?.dataType === "ALIAS") {
    const resolved = resolveVariableData(doc, paint.colorVar, options);
    if (resolved?.type === "COLOR" && resolved.value) {
      const { r, g, b, a } = resolved.value as FigColor;
      return { color: { r, g, b, a: 1 }, opacity: a ?? 1 };
    }
  }
  return { color: paint.color, opacity: paint.opacity ?? 1 };
}

/**
 * The colour of `resolvePaint`. For a bound paint its alpha is 1, as in
 * Figma's cached `paint.color`; the variable's alpha is the opacity — use
 * `resolvePaint` when drawing.
 */
export function resolvePaintColor(
  doc: FigDocument,
  paint: FigPaint & { colorVar?: any },
  options?: ResolveVariableOptions,
): FigColor | undefined {
  return resolvePaint(doc, paint, options).color;
}

/**
 * The variable-bound fields of a node (`variableConsumptionMap`), resolved:
 * `VariableField` name (e.g. `STACK_PADDING_LEFT`, `CORNER_RADIUS`) → value.
 * Bindings that cannot be resolved are left out.
 */
export function resolveBoundVariables(
  doc: FigDocument,
  node: FigNode,
  options: ResolveVariableOptions = {},
): Map<string, ResolvedVariableValue> {
  const out = new Map<string, ResolvedVariableValue>();
  const opts = { node, ...options };
  for (const entry of node.variableConsumptionMap?.entries ?? []) {
    if (!entry?.variableField) continue;
    const resolved = resolveVariableData(doc, entry.variableData, opts);
    if (resolved) out.set(entry.variableField, resolved);
  }
  return out;
}
