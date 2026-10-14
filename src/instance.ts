/**
 * Instance resolution: what an INSTANCE actually shows.
 *
 * An INSTANCE has no children in the file. Its content is its symbol's
 * subtree, modified by three kinds of data stored on the instance:
 *
 * - `symbolData.symbolOverrides` — partial NodeChanges the user set (a fill, a
 *   name, `visible`, a size, an instance swap via `overriddenSymbolID`, ...).
 * - `derivedSymbolData` — partial NodeChanges Figma computed after applying
 *   them: final sizes, transforms, geometry and glyphs.
 * - `componentPropAssignments` — values for the symbol's component properties,
 *   which reach nodes that declare a matching `componentPropRefs` entry.
 *
 * Overrides and derived data address nodes with a `guidPath`. Each segment
 * names a node by its `overrideKey` (its `guid` when it has none) within one
 * symbol scope; a further segment continues inside the symbol of the nested
 * instance just named — the swapped-in symbol, when an instance swap applies at
 * that prefix. A segment equal to the symbol's own key addresses the instance
 * itself. Under these rules every override (1,901) and derived entry (19,707)
 * in the reference corpus resolves to exactly one node.
 */

import type { FigDocument, FigGuid, FigNode } from "./types.js";
import { deepClone, nodeId, sortByPosition } from "./utils.js";

export interface ResolvedNode {
  /**
   * The node as displayed: a copy of `source` with overrides, component
   * property values and derived data applied. It keeps `source`'s guid, so
   * the same symbol node appears once per instance that shows it.
   */
  node: FigNode;
  /** The node in the file this was built from. */
  source: FigNode;
  /**
   * The `guidPath` that addresses this node from the outermost instance being
   * resolved — what an override targeting it would carry. Empty outside any
   * instance.
   */
  path: FigGuid[];
  /** For an INSTANCE: the symbol its content came from, after any swap. */
  symbol?: FigNode;
  children: ResolvedNode[];
}

export interface ResolveOptions {
  /** Include nodes whose `phase` is `REMOVED`. Default `false`. */
  includeRemoved?: boolean;
  /** Apply `derivedSymbolData` (Figma's computed layout). Default `true`. */
  applyDerived?: boolean;
  /** Nested instances deeper than this are left unexpanded. Default 32. */
  maxDepth?: number;
  /**
   * Copy nodes shallowly, sharing their nested values with the document; a
   * caller must then not write into them. A third faster on large files.
   * Default `false` (deep copies).
   */
  shareValues?: boolean;
}

/** Override fields that are not node properties to copy. */
const STRUCTURAL_FIELDS = new Set(["guidPath", "guid", "parentIndex", "overriddenSymbolID", "type", "phase"]);

interface Scoped {
  path: FigGuid[];
  data: any;
}

interface Scope {
  overrides: Scoped[];
  derived: Scoped[];
  /** Component property values assigned by the instance whose symbol this is. */
  props: Map<string, any>;
  /** Path of the instance that opened this scope; `null` outside any instance. */
  prefix: FigGuid[] | null;
  /** Symbols being expanded, outermost first. */
  stack: string[];
}

const ROOT_SCOPE: Scope = { overrides: [], derived: [], props: new Map(), prefix: null, stack: [] };

function guidKey(guid: FigGuid | undefined | null): string {
  return guid ? `${guid.sessionID}:${guid.localID}` : "";
}

function sameGuid(a: FigGuid | undefined, b: FigGuid | undefined): boolean {
  return !!a && !!b && a.sessionID === b.sessionID && a.localID === b.localID;
}

/**
 * The key a guidPath segment uses for this node. An override key of all ones
 * (0xFFFFFFFF:0xFFFFFFFF) is no key: overrides and derived data name such a
 * node by its guid.
 */
export function overrideKeyOf(node: FigNode): FigGuid {
  const k = node.overrideKey;
  return k && k.sessionID !== 0xffffffff ? k : node.guid;
}

function scoped(entries: any[] | undefined): Scoped[] {
  return (entries ?? [])
    .filter((e) => e?.guidPath?.guids?.length)
    .map((e) => ({ path: e.guidPath.guids as FigGuid[], data: e }));
}

function addressed(list: Scoped[], key: FigGuid): Scoped[] {
  return list.filter((o) => o.path.length === 1 && sameGuid(o.path[0], key));
}

function through(list: Scoped[], key: FigGuid): Scoped[] {
  return list
    .filter((o) => o.path.length > 1 && sameGuid(o.path[0], key))
    .map((o) => ({ path: o.path.slice(1), data: o.data }));
}

/** Lengths that scaling an instance changes on the instance itself. */
const SCALED_FIELDS = new Set([
  "strokeWeight", "borderTopWeight", "borderRightWeight", "borderBottomWeight", "borderLeftWeight",
  "cornerRadius", "rectangleTopLeftCornerRadius", "rectangleTopRightCornerRadius",
  "rectangleBottomLeftCornerRadius", "rectangleBottomRightCornerRadius",
  "stackSpacing", "stackCounterSpacing", "stackHorizontalPadding", "stackVerticalPadding",
  "stackPaddingRight", "stackPaddingBottom", "stackPaddingLeft", "stackPaddingTop",
]);

/**
 * How an instance lays out its own children. A swapped instance takes these
 * from the symbol it now shows: the instance node still holds the old
 * symbol's (a button group swapped from a row variant to a stacked one).
 */
const CONTAINER_LAYOUT_FIELDS = [
  "stackMode", "stackSpacing", "stackPadding", "stackHorizontalPadding", "stackVerticalPadding",
  "stackPaddingLeft", "stackPaddingTop", "stackPaddingRight", "stackPaddingBottom",
  "stackPrimaryAlignItems", "stackCounterAlignItems", "stackReverseZIndex", "stackWrap",
  "stackCounterSpacing", "stackCounterAlignContent", "bordersTakeSpace",
  "gridRows", "gridColumns", "gridRowGap", "gridColumnGap", "gridRowsSizing", "gridColumnsSizing",
];

/** Copy every node property an override or derived entry carries onto `node`. */
export function applyNodeChange(node: FigNode, change: Record<string, any>): void {
  for (const [field, value] of Object.entries(change)) {
    if (STRUCTURAL_FIELDS.has(field) || value === undefined) continue;
    node[field] = deepClone(value);
  }
  // New text invalidates the cached layout unless the change brings its own.
  if ("textData" in change && !("derivedTextData" in change)) delete node.derivedTextData;
}

/**
 * Apply component property values to the fields `node` binds with
 * `componentPropRefs`. Returns the symbol to swap in, if a ref binds the
 * instance swap.
 */
function applyProps(node: FigNode, props: Map<string, any>): FigGuid | undefined {
  let swap: FigGuid | undefined;
  for (const ref of node.componentPropRefs ?? []) {
    if (ref?.isDeleted) continue;
    const value = props.get(guidKey(ref.defID));
    if (!value) continue;
    switch (ref.componentPropNodeField) {
      case "VISIBLE":
        if (typeof value.boolValue === "boolean") node.visible = value.boolValue;
        break;
      case "TEXT_DATA":
        if (value.textValue) {
          node.textData = deepClone(value.textValue);
          delete node.derivedTextData;
        }
        break;
      case "OVERRIDDEN_SYMBOL_ID":
        if (value.guidValue) swap = value.guidValue;
        break;
      case "INHERIT_FILL_STYLE_ID":
        if (value.guidValue) node.inheritFillStyleID = deepClone(value.guidValue);
        break;
    }
  }
  return swap;
}

function propsOf(node: FigNode): Map<string, any> {
  const props = new Map<string, any>();
  for (const a of node.componentPropAssignments ?? []) {
    if (a?.defID && a.value) props.set(guidKey(a.defID), a.value);
  }
  return props;
}

/** Children in layer order — sorted here too, for documents not built by the parser. */
function liveSortedChildren(doc: FigDocument, id: string, includeRemoved: boolean): FigNode[] {
  const children = sortByPosition([...(doc.childrenMap.get(id) ?? [])]);
  return includeRemoved ? children : children.filter((c) => c.phase !== "REMOVED");
}

/**
 * Resolve `node` and everything under it, expanding every instance in the
 * subtree into the content it displays.
 *
 * Nodes outside an instance are copied unchanged. A swapped or missing symbol
 * leaves its instance with no children; a symbol that contains itself, or
 * nesting past `maxDepth`, stops expanding at that instance.
 */
export function resolveTree(doc: FigDocument, node: FigNode, options: ResolveOptions = {}): ResolvedNode {
  const { includeRemoved = false, applyDerived = true, maxDepth = 32, shareValues = false } = options;

  const resolve = (source: FigNode, scope: Scope): ResolvedNode => {
    const key = overrideKeyOf(source);
    const path = scope.prefix === null ? [] : [...scope.prefix, key];
    // Shared nested values are never written here: changes replace whole
    // fields (`applyNodeChange`), and only `symbolData` is written into.
    let node: FigNode;
    if (shareValues) {
      node = { ...source };
      if (source.symbolData) node.symbolData = { ...source.symbolData };
    } else node = deepClone(source);

    const outerOverrides = addressed(scope.overrides, key);
    const outerDerived = applyDerived ? addressed(scope.derived, key) : [];
    const propSwap = applyProps(node, scope.props);

    if (source.type !== "INSTANCE") {
      for (const o of outerOverrides) applyNodeChange(node, o.data);
      for (const d of outerDerived) applyNodeChange(node, d.data);
      const children = liveSortedChildren(doc, nodeId(source)!, includeRemoved).map((c) => resolve(c, scope));
      return { node, source, path, children };
    }

    // Which symbol this instance shows: the outer scope's swap wins over a
    // property-bound swap, which wins over the instance's own symbolID.
    let symbolGuid: FigGuid | undefined = source.symbolData?.symbolID;
    if (propSwap) symbolGuid = propSwap;
    for (const o of outerOverrides) if (o.data.overriddenSymbolID) symbolGuid = o.data.overriddenSymbolID;
    const symbol = symbolGuid ? doc.nodeMap.get(guidKey(symbolGuid)) : undefined;
    if (symbol && node.symbolData) node.symbolData.symbolID = deepClone(symbol.guid);
    if (symbol && !sameGuid(symbolGuid, source.symbolData?.symbolID)) {
      for (const f of CONTAINER_LAYOUT_FIELDS) {
        if (symbol[f] === undefined) delete node[f];
        else node[f] = deepClone(symbol[f]);
      }
    }

    // The scope inside: the instance's own entries, then the outer ones
    // addressed through it. Later entries win, so outer beats inner.
    // An outer swap discards the instance's own entries, even when it swaps to
    // the same symbol: Figma's derived data for such instances never reflects
    // them (58 derived entries across the public corpus match only this way).
    const swappedByOuter = outerOverrides.some((o) => o.data.overriddenSymbolID);
    const own = (entries: any[] | undefined) => (swappedByOuter ? [] : scoped(entries));
    const inner: Scope = {
      overrides: [...own(source.symbolData?.symbolOverrides), ...through(scope.overrides, key)],
      derived: applyDerived ? [...own(source.derivedSymbolData), ...through(scope.derived, key)] : [],
      props: new Map(),
      prefix: path,
      stack: scope.stack,
    };

    // Entries addressing the symbol root apply to the instance itself, before
    // the outer scope's own entries for it.
    const selfKey = symbol ? overrideKeyOf(symbol) : undefined;
    if (selfKey) {
      const scale = source.symbolData?.uniformScaleFactor;
      const scaled = scale !== undefined && scale !== 1;
      for (const o of addressed(inner.overrides, selfKey)) {
        // Scaling an instance scales the lengths it stores; an entry for the
        // root may still hold them from before.
        const fresh = Object.fromEntries(Object.entries(o.data).filter(([k]) => !(scaled && SCALED_FIELDS.has(k) && k in source)));
        applyNodeChange(node, fresh);
      }
    }
    for (const o of outerOverrides) applyNodeChange(node, o.data);
    if (selfKey) for (const d of addressed(inner.derived, selfKey)) applyNodeChange(node, d.data);
    for (const d of outerDerived) applyNodeChange(node, d.data);
    // Assignments are read after overrides: an outer override can replace them.
    inner.props = propsOf(node);

    const symId = symbol ? nodeId(symbol)! : "";
    if (!symbol || scope.stack.includes(symId) || scope.stack.length >= maxDepth) {
      return { node, source, path, symbol, children: [] };
    }
    inner.stack = [...scope.stack, symId];
    const children = liveSortedChildren(doc, symId, includeRemoved).map((c) => resolve(c, inner));
    return { node, source, path, symbol, children };
  };

  return resolve(node, ROOT_SCOPE);
}

/**
 * What an INSTANCE displays: `resolveTree` for one instance. Throws if `node`
 * is not an INSTANCE.
 */
export function resolveInstance(doc: FigDocument, node: FigNode, options?: ResolveOptions): ResolvedNode {
  if (node.type !== "INSTANCE") {
    throw new Error(`resolveInstance: expected an INSTANCE, got ${node.type} "${node.name}"`);
  }
  return resolveTree(doc, node, options);
}

/** Visit a resolved tree depth-first, parents before children. */
export function walkResolved(
  root: ResolvedNode,
  visit: (resolved: ResolvedNode, depth: number) => void | boolean,
): void {
  const stack: Array<[ResolvedNode, number]> = [[root, 0]];
  while (stack.length > 0) {
    const [r, depth] = stack.pop()!;
    if (visit(r, depth) === false) continue;
    for (let i = r.children.length - 1; i >= 0; i--) stack.push([r.children[i], depth + 1]);
  }
}
