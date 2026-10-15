/**
 * The REST API view of a parsed file: the JSON `GET /v1/files/:key` returns,
 * built from the .fig data alone.
 *
 * Node ids, types and fields follow `@figma/rest-api-spec`. Instances are
 * expanded the way REST expands them — their sublayers appear with ids of the
 * form `I<instance id>;<override key>;...` — and values come from Figma's
 * cached layout (`derivedSymbolData`) where it has one.
 */
import type * as Rest from "@figma/rest-api-spec";
import { geometryBounds, glyphBounds, intersect, union, withEffects, type Rect } from "./bounds.js";
import type { FigColor, FigDocument, FigGuid, FigNode, FigTransform } from "../types.js";
import { resolveTree, type ResolvedNode } from "../instance.js";
import { multiplyTransform, IDENTITY_TRANSFORM } from "../tree.js";
import { comparePosition, nodeId } from "../utils.js";
import { findVariableSet, resolveVariableData } from "../variables.js";
import { geometryBlobToSVGPath, getBlobBytes } from "../vector.js";
import { color, effects, guidString, paints, variableAlias, type ColorResolver } from "./paint.js";
import { interactions } from "./interactions.js";
import { runLineHeights, textBinding, textFields, textStyleRef } from "./text.js";
import { collectionIdOfRef, restCollectionId } from "./variables.js";

export interface ToRestOptions {
  /** Include `fillGeometry` and `strokeGeometry`, as `?geometry=paths` does. Default false, as in REST. */
  geometry?: boolean;
  /**
   * Filled, when given, with the lines Figma laid out each text in, by node
   * id: what `derivedTextData` saved. REST has no field for them.
   */
  textLines?: Map<string, TextLine[]>;
  /**
   * Filled, when given, with each list text's `listStartOffset` per line, by
   * node id: an ordered item that starts a list shows this number plus one.
   * REST has no field for it.
   */
  listStarts?: Map<string, number[]>;
  /**
   * Filled, when given, with the line height of each run of an "Auto" text
   * that sets another font or size, by node id and style override id: Figma
   * sizes such a run's lines by its own font. REST has no field for it.
   */
  runLineHeights?: Map<string, Record<string, number>>;
}

/**
 * One line of a text as Figma laid it out, from `derivedTextData` (or, in
 * older files, `textData`): where it starts in the text's
 * characters, counted in code points, its advance width in pixels,
 * trailing spaces included, and its baseline, in pixels from the top of the
 * text's box.
 */
export interface TextLine {
  start: number;
  width: number;
  baseline: number;
}

export type RestFile = Pick<
  Rest.GetFileResponse,
  "document" | "components" | "componentSets" | "styles" | "schemaVersion" | "name"
>;

interface Ctx {
  doc: FigDocument;
  geometry: boolean;
  /** Style and component nodes by their library key. */
  byKey: Map<string, FigNode>;
  /** Component and style ids the converted tree shows or refers to. */
  usedComponents: Set<string>;
  usedStyles: Set<string>;
  /** Each converted node's painted area, clipped, even where REST reports null (masks, operands). */
  painted: WeakMap<object, Rect | null>;
  textLines?: Map<string, TextLine[]>;
  listStarts?: Map<string, number[]>;
  runLineHeights?: Map<string, Record<string, number>>;
  /** SVG path of each geometry blob already written: instances share their components' blobs. */
  paths: Map<Uint8Array, string>;
}

/** What a node inherits from the nodes above it in the expanded tree. */
interface Scope {
  parent?: FigNode;
  abs: FigTransform;
  hidden: boolean;
  /** Variable mode per set node id. */
  modes: Map<string, FigGuid>;
  /** The outermost instance whose sublayers these are. */
  instanceRoot?: string;
  /** The component (or set) whose property definitions `componentPropRefs` point into. */
  propOwner?: FigNode;
  /** Overrides from enclosing instances, by path from `instanceRoot`. */
  outer: OuterOverride[];
  /** Product of the uniformScaleFactor of enclosing instances. */
  scale: number;
  /** The area clipping frames and masks above leave visible; absent for none, null for nothing. */
  clip?: Rect | null;
  /** Inside a boolean operation: the operation paints, its operands do not. */
  operand?: boolean;
}

interface OuterOverride {
  path: string[];
  fields: string[];
}

const SENTINEL = 0xffffffff;

const CONSTRAINT_H: Record<string, Rest.LayoutConstraint["horizontal"]> = {
  MIN: "LEFT", MAX: "RIGHT", CENTER: "CENTER", STRETCH: "LEFT_RIGHT", SCALE: "SCALE",
};
const CONSTRAINT_V: Record<string, Rest.LayoutConstraint["vertical"]> = {
  MIN: "TOP", MAX: "BOTTOM", CENTER: "CENTER", STRETCH: "TOP_BOTTOM", SCALE: "SCALE",
};

const VARIABLE_FIELDS: Record<string, [string, string?]> = {
  WIDTH: ["size", "x"],
  HEIGHT: ["size", "y"],
  STACK_SPACING: ["itemSpacing"],
  STACK_COUNTER_SPACING: ["counterAxisSpacing"],
  STACK_PADDING_LEFT: ["paddingLeft"],
  STACK_PADDING_TOP: ["paddingTop"],
  STACK_PADDING_RIGHT: ["paddingRight"],
  STACK_PADDING_BOTTOM: ["paddingBottom"],
  VISIBLE: ["visible"],
  OPACITY: ["opacity"],
  RECTANGLE_TOP_LEFT_CORNER_RADIUS: ["topLeftRadius"],
  RECTANGLE_TOP_RIGHT_CORNER_RADIUS: ["topRightRadius"],
  RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS: ["bottomLeftRadius"],
  RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS: ["bottomRightRadius"],
  MIN_WIDTH: ["minWidth"],
  MAX_WIDTH: ["maxWidth"],
  MIN_HEIGHT: ["minHeight"],
  MAX_HEIGHT: ["maxHeight"],
  BORDER_TOP_WEIGHT: ["individualStrokeWeights", "top"],
  BORDER_BOTTOM_WEIGHT: ["individualStrokeWeights", "bottom"],
  BORDER_LEFT_WEIGHT: ["individualStrokeWeights", "left"],
  BORDER_RIGHT_WEIGHT: ["individualStrokeWeights", "right"],
  TEXT_DATA: ["characters"],
};

/** The REST fields an instance override of each kiwi field shows up as. */
const OVERRIDE_FIELDS: Record<string, string[]> = {
  name: ["name"],
  visible: ["visible"],
  locked: ["locked"],
  opacity: ["opacity"],
  size: ["height", "width"],
  proportionsConstrained: ["preserveRatio"],
  fillPaints: ["fills"],
  strokePaints: ["strokes"],
  styleIdForFill: ["inheritFillStyleId"],
  styleIdForStrokeFill: ["strokes"],
  styleIdForText: ["inheritTextStyleId", "openTypeFlags", "text"],
  styleIdForEffect: ["effects"],
  effects: ["effects"],
  strokeWeight: ["strokeWeight"],
  strokeAlign: ["strokeAlign"],
  dashPattern: ["strokeDashes"],
  borderTopWeight: ["individualStrokeWeights", "strokeWeight"],
  borderBottomWeight: ["individualStrokeWeights", "strokeWeight"],
  borderLeftWeight: ["individualStrokeWeights", "strokeWeight"],
  borderRightWeight: ["individualStrokeWeights", "strokeWeight"],
  cornerRadius: ["cornerRadius"],
  rectangleTopLeftCornerRadius: ["topLeftRadius"],
  rectangleTopRightCornerRadius: ["topRightRadius"],
  rectangleBottomLeftCornerRadius: ["bottomLeftRadius"],
  rectangleBottomRightCornerRadius: ["bottomRightRadius"],
  textData: ["characterStyleOverrides", "characters", "lineIndentations", "lineTypes", "styleOverrideTable"],
  fontName: ["fontFamily", "fontPostScriptName", "fontWeight", "italic"],
  fontSize: ["fontSize", "letterSpacing", "lineHeightPercent", "lineHeightPercentFontSize", "lineHeightPx"],
  lineHeight: ["lineHeightPercent", "lineHeightPercentFontSize", "lineHeightPx", "lineHeightUnit"],
  letterSpacing: ["letterSpacing"],
  textAutoResize: ["textAutoResize"],
  textDecoration: ["textDecoration"],
  textCase: ["textCase"],
  hyperlink: ["hyperlink"],
  textAlignHorizontal: ["textAlignHorizontal"],
  textAlignVertical: ["textAlignVertical"],
  paragraphSpacing: ["paragraphSpacing"],
  paragraphIndent: ["paragraphIndent"],
  stackMode: ["layoutMode"],
  stackSpacing: ["itemSpacing"],
  stackPrimarySizing: ["primaryAxisSizingMode"],
  stackCounterSizing: ["counterAxisSizingMode"],
  stackPrimaryAlignItems: ["primaryAxisAlignItems"],
  stackCounterAlignItems: ["counterAxisAlignItems"],
  stackHorizontalPadding: ["paddingLeft"],
  stackPaddingLeft: ["paddingLeft"],
  stackPaddingRight: ["paddingRight"],
  stackVerticalPadding: ["paddingTop"],
  stackPaddingTop: ["paddingTop"],
  stackPaddingBottom: ["paddingBottom"],
  stackPositioning: ["layoutPositioning"],
  stackChildAlignSelf: ["layoutAlign"],
  stackChildPrimaryGrow: ["layoutGrow"],
  minSize: ["minHeight", "minWidth"],
  maxSize: ["maxHeight", "maxWidth"],
};

/** A FRAME Figma made for a group: never clips, always hugs its children, never painted. */
function isGroupFrame(n: FigNode): boolean {
  return (
    n.type === "FRAME" &&
    n.resizeToFit === true &&
    n.frameMaskDisabled === false &&
    !n.fillPaints?.length &&
    !n.strokePaints?.length &&
    !(n as any).backgroundPaints?.length
  );
}

function restType(n: FigNode): string {
  switch (n.type) {
    case "SYMBOL": return "COMPONENT";
    case "ROUNDED_RECTANGLE": return "RECTANGLE";
    case "FRAME":
      if ((n as any).isStateGroup) return "COMPONENT_SET";
      return isGroupFrame(n) ? "GROUP" : "FRAME";
    default: return n.type;
  }
}

const OVERFLOW: Record<string, string> = {
  HORIZONTAL: "HORIZONTAL_SCROLLING",
  VERTICAL: "VERTICAL_SCROLLING",
  BOTH: "HORIZONTAL_AND_VERTICAL_SCROLLING",
};

const FRAME_LIKE = new Set(["FRAME", "GROUP", "COMPONENT", "COMPONENT_SET", "INSTANCE"]);

/** The only fields REST gives a SECTION besides its id, name and children. */
const SECTION_FIELDS = new Set([
  "id", "name", "type", "visible", "locked", "scrollBehavior", "children", "fills", "fillGeometry",
  "strokes", "strokeWeight", "strokeAlign", "strokeGeometry", "absoluteBoundingBox", "absoluteRenderBounds",
  "relativeTransform", "size", "sectionContentsHidden", "boundVariables", "explicitVariableModes",
]);

/** Types REST never gives corner fields. */
const NO_CORNERS = new Set(["BOOLEAN_OPERATION", "ELLIPSE", "SECTION", "LINE", "TEXT", "GROUP"]);

/**
 * cornerRadius when the corners agree, rectangleCornerRadii when they were set
 * independently and differ; cornerSmoothing alongside either.
 */
function corners(n: any): Record<string, unknown> {
  if (n.rectangleCornerRadiiIndependent) {
    const radii = [
      n.rectangleTopLeftCornerRadius ?? 0,
      n.rectangleTopRightCornerRadius ?? 0,
      n.rectangleBottomRightCornerRadius ?? 0,
      n.rectangleBottomLeftCornerRadius ?? 0,
    ];
    if (radii.some((r) => r !== radii[0])) return { cornerSmoothing: n.cornerSmoothing ?? 0, rectangleCornerRadii: radii };
    return radii[0] ? { cornerRadius: radii[0], cornerSmoothing: n.cornerSmoothing ?? 0 } : {};
  }
  return n.cornerRadius ? { cornerRadius: n.cornerRadius, cornerSmoothing: n.cornerSmoothing ?? 0 } : {};
}

const GRID_ALIGN: Record<string, Rest.LayoutGrid["alignment"]> = { MIN: "MIN", CENTER: "CENTER", MAX: "MAX", STRETCH: "STRETCH" };

function layoutGrids(list: any[] | undefined): Rest.LayoutGrid[] | undefined {
  if (!list?.length) return undefined;
  return list.map((g) => {
    const grid = g.pattern === "GRID";
    const count = g.numSections;
    return {
      pattern: grid ? "GRID" : g.axis === "Y" ? "ROWS" : "COLUMNS",
      sectionSize: g.sectionSize ?? 0,
      visible: g.visible !== false,
      color: color(g.color),
      alignment: grid ? "MIN" : GRID_ALIGN[g.type] ?? "MIN",
      gutterSize: grid ? 0 : g.gutterSize ?? 0,
      offset: grid ? 0 : g.offset ?? 0,
      count: grid || count === undefined || count > 1e6 ? -1 : count,
    } as Rest.LayoutGrid;
  });
}

/**
 * Figma stores NaN as the transform and size of a group whose children are all
 * hidden, or a boolean operation with an empty result: there is nothing visible
 * to bound. REST JSON cannot hold NaN, so such a node is placed at its parent's
 * origin and sized to the box around its children, hidden or not.
 */
function finiteTransform(t: FigTransform | undefined): FigTransform | undefined {
  if (!t) return undefined;
  return [t.m00, t.m01, t.m02, t.m10, t.m11, t.m12].every(Number.isFinite) ? t : undefined;
}

function finiteSize(s: { x: number; y: number } | undefined): { x: number; y: number } | undefined {
  return s && Number.isFinite(s.x) && Number.isFinite(s.y) ? { x: s.x, y: s.y } : undefined;
}

function childrenExtent(r: ResolvedNode): { x: number; y: number } {
  let maxX = 0;
  let maxY = 0;
  for (const c of r.children) {
    const t = finiteTransform(c.node.transform) ?? IDENTITY_TRANSFORM;
    const s = finiteSize(c.node.size) ?? childrenExtent(c);
    const box = boundingBox(t, s.x, s.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }
  return { x: maxX, y: maxY };
}

function isSentinel(guid: any): boolean {
  return guid?.sessionID === SENTINEL && guid?.localID === SENTINEL;
}

function boundingBox(abs: FigTransform, w: number, h: number): Rest.Rectangle {
  const pts = [[0, 0], [w, 0], [0, h], [w, h]].map(([x, y]) => [
    abs.m00 * x + abs.m01 * y + abs.m02,
    abs.m10 * x + abs.m11 * y + abs.m12,
  ]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function geometry(ctx: Ctx, list: any[] | undefined): Rest.Path[] {
  const out: Rest.Path[] = [];
  for (const g of list ?? []) {
    const bytes = g?.commandsBlob !== undefined ? getBlobBytes(ctx.doc, g.commandsBlob) : undefined;
    if (!bytes) continue;
    let svg = ctx.paths.get(bytes);
    if (svg === undefined) ctx.paths.set(bytes, (svg = geometryBlobToSVGPath(bytes, { strict: false, significantDigits: 6 })));
    if (!svg) continue;
    // In the order REST writes the keys.
    const path: any = { path: svg };
    if (g.styleID) path.overrideID = g.styleID;
    path.windingRule = g.windingRule === "ODD" ? "EVENODD" : "NONZERO";
    out.push(path);
  }
  return out;
}

/** The `inherit*StyleID` fields older files (format versions up to 30) use instead. */
const LEGACY_STYLE_FIELDS: Record<string, string> = {
  styleIdForFill: "inheritFillStyleID",
  styleIdForStrokeFill: "inheritFillStyleIDForStroke",
  styleIdForEffect: "inheritEffectStyleID",
  styleIdForGrid: "inheritGridStyleID",
};

/**
 * The style reference in `field` of a node, or the older field it replaced
 * when that names a style in the file. Figma draws with the style's values, as
 * it lays text out with them (see `textStyleRef`), whatever copies the node
 * keeps.
 */
function styleRef(ctx: Ctx, n: any, field: string): any {
  if (n[field]) return n[field];
  const guid = n[LEGACY_STYLE_FIELDS[field]];
  if (!guid || isSentinel(guid)) return undefined;
  return (ctx.doc.nodeMap.get(guidString(guid)) as any)?.styleType ? { guid } : undefined;
}

/** The style node a `styleIdFor*` reference names, if it is in the file. */
function styleNode(ctx: Ctx, ref: any): FigNode | undefined {
  if (ref?.guid) return isSentinel(ref.guid) ? undefined : ctx.doc.nodeMap.get(guidString(ref.guid));
  const key = ref?.assetRef?.key;
  return key ? ctx.byKey.get(key) : undefined;
}

function styleId(ctx: Ctx, ref: any): string | undefined {
  if (ref?.guid) return isSentinel(ref.guid) ? undefined : guidString(ref.guid);
  const key = ref?.assetRef?.key;
  const node = key ? ctx.byKey.get(key) : undefined;
  return node ? nodeId(node)! : undefined;
}

function styles(ctx: Ctx, n: any, type: string): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  const set = (k: string, ref: any) => { const id = styleId(ctx, ref); if (id) out[k] = id; };
  set("fill", styleRef(ctx, n, "styleIdForFill"));
  set("stroke", styleRef(ctx, n, "styleIdForStrokeFill"));
  set("text", textStyleRef(n));
  set("effect", styleRef(ctx, n, "styleIdForEffect"));
  set("grid", styleRef(ctx, n, "styleIdForGrid"));
  // Frames list fill and stroke styles under both names.
  if (FRAME_LIKE.has(type)) {
    if (out.fill) out.fills = out.fill;
    if (out.stroke) out.strokes = out.stroke;
  }
  return Object.keys(out).length ? out : undefined;
}

function boundVariables(ctx: Ctx, n: any, textStyle?: any): Record<string, any> | undefined {
  const out: any = {};
  for (const e of n.variableConsumptionMap?.entries ?? []) {
    const text = textBinding(e);
    if (text) { (out[text[0]] ??= []).push(text[1]); continue; }
    const alias = variableAlias(e?.variableData);
    if (!alias) continue;
    const [key, sub] = VARIABLE_FIELDS[e.variableField] ?? [];
    if (!key) continue;
    if (sub) (out[key] ??= {})[sub] = alias;
    else out[key] = alias;
  }
  // A text style's own bindings show on the text that uses it.
  for (const e of textStyle?.variableConsumptionMap?.entries ?? []) {
    const text = textBinding(e);
    if (text && !out[text[0]]) out[text[0]] = [text[1]];
  }
  // Paints and effects bind what is shown: a style's, not the node's stale copies.
  const fillStyle: any = styleNode(ctx, styleRef(ctx, n, "styleIdForFill"));
  const strokeStyle: any = styleNode(ctx, styleRef(ctx, n, "styleIdForStrokeFill"));
  const effectStyle: any = styleNode(ctx, styleRef(ctx, n, "styleIdForEffect"));
  const paintAliases = (list: any[] | undefined) =>
    (list ?? []).map((p) => variableAlias(p?.colorVar)).filter(Boolean);
  const fills = paintAliases(fillStyle?.fillPaints ?? n.fillPaints);
  if (fills.length) out.fills = fills;
  const strokes = paintAliases(strokeStyle?.fillPaints ?? n.strokePaints);
  if (strokes.length) out.strokes = strokes;
  const fx = (effectStyle?.effects ?? n.effects ?? []).map((e: any) => variableAlias(e?.colorVar)).filter(Boolean);
  if (fx.length) out.effects = fx;
  return Object.keys(out).length ? out : undefined;
}

function stackOf(n: any): "HORIZONTAL" | "VERTICAL" | "GRID" | undefined {
  const m = n?.stackMode;
  return m === "HORIZONTAL" || m === "VERTICAL" || m === "GRID" ? m : undefined;
}

/** Auto-layout fields of a container. */
function layoutContainer(n: any, out: any): void {
  const mode = stackOf(n);
  if (!mode) return;
  out.layoutMode = mode;
  if (mode === "GRID") {
    const rows = gridTracks(n.gridRows);
    const columns = gridTracks(n.gridColumns);
    out.gridRowCount = rows.length;
    out.gridColumnCount = columns.length;
    out.gridRowGap = n.gridRowGap ?? 0;
    out.gridColumnGap = n.gridColumnGap ?? 0;
    out.gridRowsSizing = trackSizing(rows, n.gridRowsSizing);
    out.gridColumnsSizing = trackSizing(columns, n.gridColumnsSizing);
  }
  // kiwi omits stackCounterSizing when FIXED and stackPrimarySizing when it hugs.
  const primary = n.stackPrimarySizing ?? "RESIZE_TO_FIT_WITH_IMPLICIT_SIZE";
  const counter = n.stackCounterSizing ?? "FIXED";
  if (counter === "FIXED") out.counterAxisSizingMode = "FIXED";
  if (primary === "FIXED") out.primaryAxisSizingMode = "FIXED";
  const justify = n.stackPrimaryAlignItems;
  if (justify && justify !== "MIN") out.primaryAxisAlignItems = justify === "SPACE_EVENLY" ? "SPACE_BETWEEN" : justify;
  const align = n.stackCounterAlignItems;
  if (align && align !== "MIN") out.counterAxisAlignItems = align;
  // Older files name the left and top padding stackPaddingLeft and stackPaddingTop.
  const left = n.stackHorizontalPadding ?? n.stackPaddingLeft;
  const top = n.stackVerticalPadding ?? n.stackPaddingTop;
  if (left) out.paddingLeft = left;
  if (n.stackPaddingRight) out.paddingRight = n.stackPaddingRight;
  if (top) out.paddingTop = top;
  if (n.stackPaddingBottom) out.paddingBottom = n.stackPaddingBottom;
  if (n.stackSpacing) out.itemSpacing = n.stackSpacing;
  if (n.stackReverseZIndex) out.itemReverseZIndex = true;
  if (n.bordersTakeSpace) out.strokesIncludedInLayout = true;
  out.layoutWrap = n.stackWrap === "WRAP" ? "WRAP" : "NO_WRAP";
  if (n.stackWrap === "WRAP") {
    // NaN: the same gap as between items.
    out.counterAxisSpacing = Number.isFinite(n.stackCounterSpacing) ? n.stackCounterSpacing : n.stackSpacing ?? 0;
    out.counterAxisAlignContent = n.stackCounterAlignContent === "SPACE_BETWEEN" ? "SPACE_BETWEEN" : "AUTO";
  }
}

/** A grid's row or column ids, in order. */
function gridTracks(map: any): string[] {
  const entries: any[] = [...(map?.entries ?? [])];
  entries.sort((a, b) => comparePosition(a.position, b.position));
  return entries.map((e) => guidString(e.id));
}

function trackSize(f: any): string {
  switch (f?.type) {
    case "FIXED": return `${f.value ?? 0}px`;
    case "FLEX": return `${f.value ?? 1}fr`;
    default: return "auto";
  }
}

/** Track sizes as a CSS track list: `auto` hugs, `1fr` flexes, `120px` is fixed. */
function trackSizing(tracks: string[], map: any): string {
  const byId = new Map<string, any>();
  for (const e of map?.entries ?? []) byId.set(guidString(e.id), e.trackSize);
  return tracks
    .map((id) => {
      const t = byId.get(id);
      const min = trackSize(t?.minSizing);
      const max = trackSize(t?.maxSizing);
      return min === max ? max : `minmax(${min}, ${max})`;
    })
    .join(" ");
}

const GRID_CHILD_ALIGN: Record<string, string> = { AUTO: "AUTO", MIN: "MIN", CENTER: "CENTER", MAX: "MAX" };

function gridChild(n: any, parent: any, out: any): void {
  const rows = gridTracks(parent.gridRows);
  const columns = gridTracks(parent.gridColumns);
  const row = n.gridRowAnchor ? rows.indexOf(guidString(n.gridRowAnchor)) : -1;
  const column = n.gridColumnAnchor ? columns.indexOf(guidString(n.gridColumnAnchor)) : -1;
  if (row >= 0) out.gridRowAnchorIndex = row;
  if (column >= 0) out.gridColumnAnchorIndex = column;
  out.gridRowSpan = n.gridRowSpan ?? 1;
  out.gridColumnSpan = n.gridColumnSpan ?? 1;
  out.gridChildHorizontalAlign = GRID_CHILD_ALIGN[n.gridChildHorizontalAlign] ?? "AUTO";
  out.gridChildVerticalAlign = GRID_CHILD_ALIGN[n.gridChildVerticalAlign] ?? "AUTO";
}

/** Sizing of one axis: FIXED, HUG (sizes to content) or FILL (stretches in the parent). */
function axisSizing(n: any, parent: any, axis: "H" | "V"): "FIXED" | "HUG" | "FILL" {
  const parentMode = stackOf(parent);
  const absolute = n.stackPositioning === "ABSOLUTE";
  const mode = stackOf(n);
  // An auto-layout child that hugs on this axis hugs, even when it is also
  // set to stretch: Figma sizes it to its content.
  let own: "FIXED" | "HUG" | undefined;
  if (mode && mode !== "GRID") {
    const primary = (mode === "HORIZONTAL") === (axis === "H");
    const sizing = primary ? n.stackPrimarySizing ?? "RESIZE_TO_FIT_WITH_IMPLICIT_SIZE" : n.stackCounterSizing ?? "FIXED";
    own = sizing === "FIXED" ? "FIXED" : "HUG";
  }
  if (parentMode && parentMode !== "GRID" && !absolute && own !== "HUG") {
    const primary = (parentMode === "HORIZONTAL") === (axis === "H");
    if (primary ? n.stackChildPrimaryGrow === 1 : n.stackChildAlignSelf === "STRETCH") return "FILL";
  }
  if (own) return own;
  // Absolutely placed text keeps its box.
  if (n.type === "TEXT" && !(parentMode && absolute)) {
    if (n.textAutoResize === "WIDTH_AND_HEIGHT") return "HUG";
    if (n.textAutoResize === "HEIGHT" && axis === "V") return "HUG";
  }
  return "FIXED";
}

function layoutChild(n: any, parent: any, out: any): void {
  const inStack = !!stackOf(parent);
  if (inStack) {
    out.layoutAlign = n.stackChildAlignSelf === "STRETCH" ? "STRETCH" : "INHERIT";
    out.layoutGrow = n.stackChildPrimaryGrow === 1 ? 1 : 0;
    if (n.stackPositioning === "ABSOLUTE") out.layoutPositioning = "ABSOLUTE";
    else if (stackOf(parent) === "GRID") gridChild(n, parent, out);
  }
  if (inStack || stackOf(n)) {
    out.layoutSizingHorizontal = axisSizing(n, parent, "H");
    out.layoutSizingVertical = axisSizing(n, parent, "V");
  }
  const min = n.minSize?.value;
  const max = n.maxSize?.value;
  if (min?.x) out.minWidth = min.x;
  if (min?.y) out.minHeight = min.y;
  if (max?.x && max.x < 1e9) out.maxWidth = max.x;
  if (max?.y && max.y < 1e9) out.maxHeight = max.y;
}

const EXPORT_FORMATS: Record<string, Rest.ExportSetting["format"]> = { PNG: "PNG", JPEG: "JPG", SVG: "SVG", PDF: "PDF" };
const EXPORT_CONSTRAINTS: Record<string, Rest.ExportSetting["constraint"]["type"]> = {
  CONTENT_SCALE: "SCALE", CONTENT_WIDTH: "WIDTH", CONTENT_HEIGHT: "HEIGHT",
};

function exportSettings(list: any[] | undefined): Rest.ExportSetting[] | undefined {
  const out: Rest.ExportSetting[] = [];
  for (const s of list ?? []) {
    const format = EXPORT_FORMATS[s?.imageType];
    if (!format) continue;
    out.push({
      suffix: s.suffix ?? "",
      format,
      constraint: { type: EXPORT_CONSTRAINTS[s.constraint?.type] ?? "SCALE", value: s.constraint?.value ?? 1 },
    });
  }
  return out.length ? out : undefined;
}

function propKey(def: any): string {
  return def.type === "VARIANT" ? def.name : `${def.name}#${guidString(def.id)}`;
}

/** Definitions of a component or component set, keyed as REST keys them. */
function propDefs(ctx: Ctx, n: any): Record<string, Rest.ComponentPropertyDefinition> | undefined {
  const defs: any[] = (n.componentPropDefs ?? []).filter((d: any) => !d?.isDeleted);
  if (!defs.length) return undefined;
  const orders = new Map<string, string[]>(
    (n.stateGroupPropertyValueOrders ?? []).map((o: any) => [o.property, o.values]),
  );
  const out: Record<string, any> = {};
  for (const d of [...defs].sort((a, b) => comparePosition(a.sortPosition, b.sortPosition))) {
    const def: any = { type: d.type };
    const v = d.initialValue ?? {};
    switch (d.type) {
      case "BOOLEAN": def.defaultValue = v.boolValue ?? false; break;
      case "TEXT": def.defaultValue = v.textValue?.characters ?? ""; break;
      case "INSTANCE_SWAP": {
        const target = v.guidValue ? ctx.doc.nodeMap.get(guidString(v.guidValue)) : undefined;
        def.defaultValue = target ? nodeId(target) : v.guidValue ? guidString(v.guidValue) : "";
        def.preferredValues = [];
        break;
      }
      case "VARIANT": {
        const values = orders.get(d.name) ?? [];
        def.defaultValue = values[0] ?? "";
        def.variantOptions = values;
        break;
      }
    }
    out[propKey(d)] = def;
  }
  return out;
}

/** Variant values of a component in a set, from its `Prop=Value, ...` name. */
function variantValues(name: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of name.split(",")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function ownerOf(ctx: Ctx, symbol: FigNode): FigNode {
  const parent = symbol.parentIndex ? ctx.doc.nodeMap.get(guidString(symbol.parentIndex.guid)) : undefined;
  return (parent as any)?.isStateGroup ? parent! : symbol;
}

function componentProperties(ctx: Ctx, instance: any, symbol: FigNode | undefined): Record<string, Rest.ComponentProperty> | undefined {
  if (!symbol) return undefined;
  const owner: any = ownerOf(ctx, symbol);
  const defs: any[] = (owner.componentPropDefs ?? []).filter((d: any) => !d?.isDeleted);
  if (!defs.length) return undefined;
  const assigned = new Map<string, any>(
    (instance.componentPropAssignments ?? []).map((a: any) => [guidString(a.defID), a]),
  );
  const variants = variantValues(symbol.name ?? "");
  const out: Record<string, any> = {};
  for (const d of defs) {
    const a = assigned.get(guidString(d.id));
    const v = a?.value ?? d.initialValue ?? {};
    const prop: any = { type: d.type };
    switch (d.type) {
      case "VARIANT": prop.value = variants[d.name] ?? ""; break;
      case "BOOLEAN": prop.value = v.boolValue ?? false; break;
      case "TEXT": prop.value = v.textValue?.characters ?? ""; break;
      case "INSTANCE_SWAP": prop.value = v.guidValue ? guidString(v.guidValue) : ""; prop.preferredValues = []; break;
    }
    prop.boundVariables = {};
    out[propKey(d)] = prop;
  }
  return out;
}

function propertyReferences(ctx: Ctx, n: any, owner: FigNode | undefined): Record<string, string> | undefined {
  const refs: any[] = (n.componentPropRefs ?? []).filter((r: any) => !r?.isDeleted);
  if (!refs.length || !owner) return undefined;
  // A variant carries a stub per property of its set, naming the set's
  // definition by parentPropDefId.
  const set = owner.parentIndex ? ctx.doc.nodeMap.get(guidString(owner.parentIndex.guid)) : undefined;
  const all: any[] = [...((owner as any).componentPropDefs ?? []), ...((set as any)?.isStateGroup ? (set as any).componentPropDefs ?? [] : [])];
  const byId = new Map<string, any>(all.map((d: any) => [guidString(d.id), d]));
  const defs = new Map<string, any>();
  for (const [id, d] of byId) defs.set(id, d.name === undefined && d.parentPropDefId ? byId.get(guidString(d.parentPropDefId)) : d);
  const FIELDS: Record<string, string> = { VISIBLE: "visible", TEXT_DATA: "characters", OVERRIDDEN_SYMBOL_ID: "mainComponent" };
  const out: Record<string, string> = {};
  for (const r of refs) {
    const field = FIELDS[r.componentPropNodeField];
    const def = defs.get(guidString(r.defID));
    if (field && def) out[field] = propKey(def);
  }
  return Object.keys(out).length ? out : undefined;
}

/** An instance's own overrides, as REST field names, by path from `base`. */
function ownOverrides(source: any, base: string[]): OuterOverride[] {
  const out: OuterOverride[] = [];
  for (const e of source.symbolData?.symbolOverrides ?? []) {
    const path: string[] = (e?.guidPath?.guids ?? []).map(guidString);
    if (!path.length) continue;
    const fields = Object.keys(e).flatMap((k) => OVERRIDE_FIELDS[k] ?? []);
    out.push({ path: [...base, ...path], fields });
  }
  return out;
}

/**
 * REST `overrides`: the sublayers of this instance whose fields an enclosing
 * instance — or, for an outermost instance, the instance itself — overrides.
 * A nested instance does not list the overrides it carries in its component.
 */
function overrides(entries: OuterOverride[], self: string[], selfKey: string, root: string, id: string): Rest.Overrides[] {
  const byId = new Map<string, Set<string>>();
  for (const e of entries) {
    if (e.path.length < self.length || self.some((k, i) => e.path[i] !== k)) continue;
    const rest = e.path.slice(self.length);
    const target = rest.length === 0 || (rest.length === 1 && rest[0] === selfKey) ? id : `I${root};${e.path.join(";")}`;
    const fields = byId.get(target) ?? new Set<string>();
    for (const f of e.fields) fields.add(f);
    byId.set(target, fields);
  }
  const out: Rest.Overrides[] = [];
  for (const [target, fields] of byId) if (fields.size) out.push({ id: target, overriddenFields: [...fields].sort() });
  // The instance's own entry comes first.
  return out.sort((a, b) => (a.id === id ? -1 : b.id === id ? 1 : 0));
}

function withModes(ctx: Ctx, modes: Map<string, FigGuid>, n: any): Map<string, FigGuid> {
  const entries: any[] = n.variableModeBySetMap?.entries ?? [];
  if (!entries.length) return modes;
  const next = new Map(modes);
  for (const e of entries) {
    const set = findVariableSet(ctx.doc, e?.variableSetID);
    if (set && e.variableModeID) next.set(nodeId(set)!, e.variableModeID);
  }
  return next;
}

/** REST `explicitVariableModes`: the modes set on the node itself, by collection id. */
function explicitVariableModes(ctx: Ctx, n: any): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const e of n.variableModeBySetMap?.entries ?? []) {
    if (!e?.variableModeID) continue;
    const set = findVariableSet(ctx.doc, e.variableSetID);
    const id = set ? restCollectionId(set) : collectionIdOfRef(e.variableSetID);
    if (id) out[id] = guidString(e.variableModeID);
  }
  return Object.keys(out).length ? out : undefined;
}

function flowStartingPoints(ctx: Ctx, r: ResolvedNode): Rest.FlowStartingPoint[] {
  return r.children
    .filter((c) => (c.node as any).prototypeStartingPoint)
    .sort((a, b) => comparePosition((a.node as any).prototypeStartingPoint.position, (b.node as any).prototypeStartingPoint.position))
    .map((c) => ({ nodeId: nodeId(c.source)!, name: (c.node as any).prototypeStartingPoint.name ?? "" }));
}

function fillOverrideTable(ctx: Ctx, n: any, resolve: ColorResolver): Record<string, any> | undefined {
  const table: any[] = n.vectorData?.styleOverrideTable ?? [];
  if (!table.length) return undefined;
  const out: Record<string, any> = {};
  for (const entry of table) {
    if (entry?.styleID === undefined) continue;
    out[String(entry.styleID)] = entry.fillPaints ? { fills: paints(entry.fillPaints, resolve) } : null;
  }
  return out;
}

/**
 * The lines Figma saved for a text node, when they cover its characters as
 * they are now; an override that changed the text without a new layout leaves
 * none.
 */
function textLines(n: any): TextLine[] | undefined {
  // Older files keep the layout in `textData` itself.
  const lines: any[] | undefined = n.derivedTextData?.baselines ?? n.textData?.baselines;
  if (!lines?.length) return undefined;
  const count = Array.from(n.textData?.characters ?? "").length;
  if (lines[lines.length - 1].endCharacter !== count) return undefined;
  // Figma rounds a width up to whole pixels: thousandths keep a hair over one.
  const r = (v: number | undefined) => Math.round((v ?? 0) * 1000) / 1000;
  return lines.map((b) => ({ start: b.firstCharacter ?? 0, width: r(b.width), baseline: r(b.position?.y) }));
}

function convert(ctx: Ctx, r: ResolvedNode, scope: Scope): any {
  const n: any = r.node;
  const id = r.path.length && scope.instanceRoot
    ? `I${scope.instanceRoot};${r.path.map(guidString).join(";")}`
    : nodeId(r.source)!;
  const type = restType(n);
  const out: any = { id, name: n.name ?? "", type };
  if (n.visible === false) out.visible = false;
  if (n.locked) out.locked = true;
  out.scrollBehavior = n.scrollBehavior === "FIXED_WHEN_CHILD_OF_SCROLLING_FRAME" ? "FIXED" : n.scrollBehavior ?? "SCROLLS";

  const modes = withModes(ctx, scope.modes, n);
  const resolve: ColorResolver = (colorVar) => {
    const v = resolveVariableData(ctx.doc, colorVar, { modes });
    return v?.type === "COLOR" ? (v.value as FigColor) : undefined;
  };

  if (type === "DOCUMENT" || type === "CANVAS") {
    if (type === "CANVAS") {
      out.backgroundColor = color(n.backgroundColor);
      const flows = flowStartingPoints(ctx, r);
      out.prototypeStartNodeID = n.prototypeStartNodeID && !isSentinel(n.prototypeStartNodeID)
        ? guidString(n.prototypeStartNodeID)
        : flows[0]?.nodeId ?? null;
      out.flowStartingPoints = flows;
      out.prototypeDevice = { type: "NONE", rotation: "NONE" };
    }
    out.children = r.children
      .filter((c) => !(c.node as any).internalOnly)
      .map((c) => convert(ctx, c, { ...scope, parent: n, abs: IDENTITY_TRANSFORM, modes }));
    return out;
  }

  const rel: FigTransform = finiteTransform(n.transform) ?? IDENTITY_TRANSFORM;
  const abs = multiplyTransform(scope.abs, rel);
  const hidden = scope.hidden || n.visible === false;
  const size = finiteSize(n.size) ?? childrenExtent(r);
  const rot = Math.atan2(rel.m10, rel.m00);
  if (rot !== 0) out.rotation = rot;

  const refs = propertyReferences(ctx, n, scope.propOwner);
  if (refs) out.componentPropertyReferences = refs;
  const bound = boundVariables(ctx, n, type === "TEXT" ? styleNode(ctx, textStyleRef(n)) : undefined);
  if (bound) out.boundVariables = bound;
  const explicit = explicitVariableModes(ctx, n);
  if (explicit) out.explicitVariableModes = explicit;

  // A scaled instance (K-scaled in Figma) scales its own lengths and those of its contents.
  const scale = scope.scale * (type === "INSTANCE" ? n.symbolData?.uniformScaleFactor ?? 1 : 1);
  let symbol: FigNode | undefined;
  if (type === "INSTANCE") {
    symbol = n.symbolData?.symbolID ? ctx.doc.nodeMap.get(guidString(n.symbolData.symbolID)) : undefined;
    out.componentId = symbol ? nodeId(symbol)! : n.symbolData?.symbolID ? guidString(n.symbolData.symbolID) : "";
    const props = componentProperties(ctx, n, symbol);
    if (props) out.componentProperties = props;
    const shown = r.symbol ?? symbol;
    const selfKey = shown ? guidString((shown as any).overrideKey ?? shown.guid) : "";
    const self = r.path.map(guidString);
    const entries = self.length ? scope.outer : ownOverrides(r.source, []);
    out.overrides = overrides(entries, self, selfKey, self.length ? scope.instanceRoot! : id, id);
    const scale = n.symbolData?.uniformScaleFactor;
    if (scale !== undefined && scale !== 1) out.uniformScaleFactor = scale;
  }
  if (type === "COMPONENT_SET" || (type === "COMPONENT" && !(scope.parent as any)?.isStateGroup)) {
    const defs = propDefs(ctx, n);
    if (defs) out.componentPropertyDefinitions = defs;
  }

  out.blendMode = n.blendMode ?? "PASS_THROUGH";
  if (n.opacity !== undefined && n.opacity !== 1) out.opacity = n.opacity;
  if (n.mask) {
    out.isMask = true;
    out.maskType = n.maskType === "OUTLINE" ? "VECTOR" : n.maskType === "LUMINANCE" ? "LUMINANCE" : "ALPHA";
  }
  const fillStyle = styleNode(ctx, styleRef(ctx, n, "styleIdForFill"));
  const strokeStyle = styleNode(ctx, styleRef(ctx, n, "styleIdForStrokeFill"));
  const effectStyle = styleNode(ctx, styleRef(ctx, n, "styleIdForEffect"));
  const fills = paints((fillStyle as any)?.fillPaints ?? n.fillPaints, resolve);
  if (FRAME_LIKE.has(type)) {
    out.clipsContent = type === "GROUP" ? false : n.frameMaskDisabled !== true;
    out.background = fills;
  }
  out.fills = fills;
  out.strokes = paints((strokeStyle as any)?.fillPaints ?? n.strokePaints, resolve);
  if (!NO_CORNERS.has(type)) Object.assign(out, corners(n));
  out.strokeWeight = n.strokeWeight ?? 1;
  out.strokeAlign = n.strokeAlign ?? "CENTER";
  if (n.strokeCap && n.strokeCap !== "NONE") out.strokeCap = n.strokeCap;
  if (n.strokeJoin && n.strokeJoin !== "MITER") out.strokeJoin = n.strokeJoin;
  if (n.dashPattern?.length) out.strokeDashes = n.dashPattern;
  if (n.borderStrokeWeightsIndependent) {
    out.individualStrokeWeights = {
      top: n.borderTopWeight ?? 0, right: n.borderRightWeight ?? 0,
      bottom: n.borderBottomWeight ?? 0, left: n.borderLeftWeight ?? 0,
    };
  }
  if (FRAME_LIKE.has(type)) {
    // The deprecated backgroundColor is the topmost visible fill, when that is a solid colour.
    const top = [...fills].reverse().find((p: any) => p.visible !== false) as any;
    out.backgroundColor = top?.type === "SOLID" ? { ...top.color, a: top.color.a * (top.opacity ?? 1) } : { r: 0, g: 0, b: 0, a: 0 };
    layoutContainer(n, out);
    const overflow = OVERFLOW[n.scrollDirection];
    if (overflow) out.overflowDirection = overflow;
    const grids = layoutGrids(n.layoutGrids);
    if (grids) out.layoutGrids = grids;
  }
  const fot = fillOverrideTable(ctx, n, resolve);
  if (fot) out.fillOverrideTable = fot;
  if (ctx.geometry) {
    out.fillGeometry = geometry(ctx, n.fillGeometry);
    // REST outlines only strokes that show.
    const stroked = out.strokes.some((p: any) => p.visible !== false);
    out.strokeGeometry = stroked ? geometry(ctx, n.strokeGeometry) : [];
  }
  const st = styles(ctx, n, type);
  if (st) {
    out.styles = st;
    for (const s of Object.values(st)) ctx.usedStyles.add(s);
  }
  if (type === "COMPONENT") ctx.usedComponents.add(id);
  if (type === "INSTANCE" && out.componentId) ctx.usedComponents.add(out.componentId);

  out.absoluteBoundingBox = boundingBox(abs, size.x, size.y);
  out.constraints = {
    vertical: CONSTRAINT_V[n.verticalConstraint ?? "MIN"] ?? "TOP",
    horizontal: CONSTRAINT_H[n.horizontalConstraint ?? "MIN"] ?? "LEFT",
  };
  out.relativeTransform = [
    [rel.m00, rel.m01, rel.m02],
    [rel.m10, rel.m11, rel.m12],
  ];
  out.size = size;
  if (scope.parent) layoutChild(n, scope.parent, out);

  if (type === "TEXT") {
    // Figma caches the scaled type of a scaled instance's text on the node; the
    // text style no longer describes it, and REST does not report the style.
    const scaled = scale !== 1;
    Object.assign(out, textFields(n, (ref) => (scaled ? undefined : styleNode(ctx, ref)), resolve));
    if (scaled && out.styles) {
      delete out.styles.text;
      if (!Object.keys(out.styles).length) delete out.styles;
    }
    const lines = ctx.textLines && textLines(n);
    if (lines) ctx.textLines!.set(id, lines);
    const starts: number[] | undefined = n.textData?.lines?.map((l: any) => l?.listStartOffset ?? 0);
    if (ctx.listStarts && starts?.some((s) => s)) ctx.listStarts.set(id, starts);
    const heights = ctx.runLineHeights && runLineHeights(n, scaled ? undefined : (ref) => styleNode(ctx, ref));
    if (heights) ctx.runLineHeights!.set(id, heights);
  }
  if (type === "BOOLEAN_OPERATION") out.booleanOperation = n.booleanOperation ?? "UNION";
  if (type === "ELLIPSE") {
    out.arcData = {
      startingAngle: n.arcData?.startingAngle ?? 0,
      endingAngle: n.arcData?.endingAngle ?? 2 * Math.PI,
      innerRadius: n.arcData?.innerRadius ?? 0,
    };
  }
  if (type === "REGULAR_POLYGON" || type === "STAR") out.count = n.count ?? 3;
  if (type === "STAR") out.starInnerScale = n.starInnerScale ?? 0.382;
  if (type === "SECTION") out.sectionContentsHidden = n.sectionContentsHidden ?? false;
  const exports = exportSettings(n.exportSettings);
  if (exports) out.exportSettings = exports;
  out.effects = effects((effectStyle as any)?.effects ?? n.effects, resolve);
  out.interactions = interactions(n.prototypeInteractions);
  if (type !== "BOOLEAN_OPERATION") out.complexStrokeProperties = { strokeType: "BASIC" };

  if (r.children.length || FRAME_LIKE.has(type) || type === "BOOLEAN_OPERATION" || type === "SECTION") {
    const childScope: Scope = {
      parent: n,
      abs,
      hidden,
      modes,
      instanceRoot: r.path.length === 0 && type === "INSTANCE" ? id : scope.instanceRoot,
      propOwner: type === "INSTANCE" ? (r.symbol ? ownerOf(ctx, r.symbol) : undefined)
        : type === "COMPONENT" || type === "COMPONENT_SET" ? n : scope.propOwner,
      scale,
      outer: type !== "INSTANCE" ? scope.outer
        : r.path.length === 0 ? ownOverrides(r.source, [])
        : [...scope.outer, ...ownOverrides(r.source, r.path.map(guidString))],
    };
    // A mask clips the siblings above it.
    let clip = out.clipsContent ? intersect(out.absoluteBoundingBox, scope.clip) : scope.clip;
    out.children = r.children.map((c) => {
      const child = convert(ctx, c, { ...childScope, clip, operand: scope.operand || type === "BOOLEAN_OPERATION" });
      if (child.isMask && !hidden && child.visible !== false) clip = ctx.painted.get(child) ?? null;
      return child;
    });
  }
  out.absoluteRenderBounds = renderBounds(ctx, n, out, abs, hidden, scope);
  if (type === "SECTION") for (const k of Object.keys(out)) if (!SECTION_FIELDS.has(k)) delete out[k];
  return out;
}

/** The area the node paints (see bounds.ts); records it in `ctx.painted` and returns what REST reports. */
function renderBounds(ctx: Ctx, n: any, out: any, abs: FigTransform, hidden: boolean, scope: Scope): Rest.Rectangle | null {
  if (hidden) {
    ctx.painted.set(out, null);
    return null;
  }
  const shows = (paints: any[] | undefined) => (paints ?? []).some((p) => p.visible !== false && (p.opacity ?? 1) > 0);
  let own: Rect | null = null;
  if (out.type === "TEXT") {
    const glyphs = glyphBounds(ctx.doc, n.derivedTextData, abs);
    own = glyphs === undefined ? out.absoluteBoundingBox : glyphs;
  } else {
    const fill = geometryBounds(ctx.doc, n.fillGeometry, abs);
    if (shows(out.fills)) own = fill;
    if (shows(out.strokes) && out.strokeWeight > 0) {
      const stroke = geometryBounds(ctx.doc, n.strokeGeometry, abs);
      // Figma stores the whole stroke outline and clips an inside stroke to the fill.
      own = union(own, out.strokeAlign === "INSIDE" && fill ? intersect(stroke, fill) : stroke);
    }
  }
  // A frame always counts its own box, painted or not.
  if (FRAME_LIKE.has(out.type) && out.type !== "GROUP") own = union(own, out.absoluteBoundingBox);
  let all = own;
  if (out.type !== "BOOLEAN_OPERATION") {
    for (const c of out.children ?? []) {
      // A mask paints nothing but still counts for its parent; a group counts
      // its text's layout box as well as the glyphs.
      let p = ctx.painted.get(c) ?? null;
      if (out.type === "GROUP" && c.type === "TEXT" && p) p = union(p, intersect(c.absoluteBoundingBox, scope.clip));
      all = union(all, p);
    }
  }
  const painted = intersect(withEffects(all, out.effects ?? []), scope.clip);
  ctx.painted.set(out, painted);
  return out.isMask || scope.operand ? null : painted;
}

function componentMeta(n: any): any {
  return {
    key: n.componentKey ?? n.key ?? "",
    name: n.name ?? "",
    description: n.symbolDescription ?? n.description ?? "",
    remote: !!n.sharedSymbolReference || !!n.sourceLibraryKey,
    documentationLinks: [],
  };
}

/**
 * Convert a parsed file to the REST API's file JSON. Pass `{ geometry: true }`
 * to include vector paths.
 */
export function toRestDocument(doc: FigDocument, options: ToRestOptions = {}): RestFile {
  const root = doc.nodes.find((n) => n.type === "DOCUMENT");
  if (!root) throw new Error("toRestDocument: no DOCUMENT node");
  const byKey = new Map<string, FigNode>();
  for (const n of doc.nodes) {
    const key = (n as any).key ?? (n as any).componentKey;
    if (key && n.phase !== "REMOVED") byKey.set(key, n);
  }
  const ctx: Ctx = { doc, geometry: options.geometry === true, byKey, usedComponents: new Set(), usedStyles: new Set(), painted: new WeakMap(), textLines: options.textLines, listStarts: options.listStarts, runLineHeights: options.runLineHeights, paths: new Map() };
  const document = convert(ctx, resolveTree(doc, root, { shareValues: true }), {
    abs: IDENTITY_TRANSFORM,
    hidden: false,
    modes: new Map(),
    outer: [],
    scale: 1,
  });

  const usedSets = new Set<string>();
  for (const c of ctx.usedComponents) {
    const parent = doc.nodeMap.get(c)?.parentIndex?.guid;
    if (parent) usedSets.add(guidString(parent));
  }
  const components: Record<string, any> = {};
  const componentSets: Record<string, any> = {};
  const styleMap: Record<string, any> = {};
  for (const n of doc.nodes as any[]) {
    if (n.phase === "REMOVED") continue;
    const nid = nodeId(n)!;
    if (n.type === "SYMBOL") {
      if (!ctx.usedComponents.has(nid)) continue;
      const meta = componentMeta(n);
      const parent = n.parentIndex ? doc.nodeMap.get(guidString(n.parentIndex.guid)) : undefined;
      if ((parent as any)?.isStateGroup) meta.componentSetId = nodeId(parent!);
      components[nodeId(n)!] = meta;
    } else if (n.isStateGroup) {
      if (!usedSets.has(nid)) continue;
      const { remote, ...meta } = componentMeta(n);
      componentSets[nodeId(n)!] = meta;
    } else if (n.styleType && n.styleType !== "NONE") {
      if (!ctx.usedStyles.has(nid)) continue;
      styleMap[nodeId(n)!] = {
        key: n.key ?? "",
        name: n.name ?? "",
        styleType: n.styleType,
        remote: !!n.sharedStyleReference,
        description: n.styleDescription ?? "",
      };
    }
  }
  return {
    document,
    components,
    componentSets,
    styles: styleMap,
    schemaVersion: 0,
    name: (doc.meta as any)?.file_name ?? "",
  } as RestFile;
}
