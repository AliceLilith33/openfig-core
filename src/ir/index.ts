/**
 * The design IR (see `types.ts`) built from the REST view of a file — from
 * `toRestDocument` and `toRestVariables`, or from the REST API itself.
 */
import type * as Rest from "@figma/rest-api-spec";
import type { FigDocument } from "../types.js";
import { toRestDocument, type RestFile, type TextLine } from "../rest/index.js";
import { toRestVariables, type RestVariables } from "../rest/variables.js";
import { blendMode, hex, irEffects, irPaints, irStroke, round, type TokenOf } from "./paint.js";
import { hasGeometry, nodeSvg } from "./svg.js";
import { imageInfo } from "./image.js";
import type {
  DesignIR, IRAction, IRAssets, IRComponent, IRComponentProp, IRConstraint, IRFlexLayout, IRGridLayout,
  IRInteraction, IRNode, IRNodeType, IRPage, IRPadding, IRScreen, IRStyle, IRText, IRTextRun, IRTextStyle,
  IRTokens, IRTrigger,
} from "./types.js";

export type * from "./types.js";
export { nodeSvg } from "./svg.js";

export interface ToDesignIROptions {
  /** The file's variables, from `toRestVariables` or `GET /v1/files/:key/variables/local`. */
  variables?: RestVariables | RestVariables["meta"];
  /** Image bytes by hash, for their pixel sizes and types. */
  images?: Map<string, Uint8Array>;
  /**
   * `expand` (default) keeps every instance's layers. `reference` leaves them
   * out when the component is defined in the file and the instance changes
   * nothing inside it beyond its properties.
   */
  instances?: "expand" | "reference";
  /** Keep hidden layers no component property can show. Default false. */
  keepHidden?: boolean;
  /** Vector-only frames and groups up to this size become SVG artwork. Default 160. */
  iconMaxSize?: number;
  /** Figma's layout of each text, by node id, from `toRestDocument`'s `textLines`. */
  textLines?: Map<string, TextLine[]>;
}

const VECTOR_TYPES = new Set(["VECTOR", "BOOLEAN_OPERATION", "STAR", "REGULAR_POLYGON"]);
const SHAPE_TYPES = new Set([...VECTOR_TYPES, "LINE", "ELLIPSE", "RECTANGLE"]);
const CONTAINER_TYPES = new Set(["FRAME", "GROUP", "INSTANCE", "COMPONENT"]);

const TYPES: Record<string, IRNodeType> = {
  FRAME: "frame", GROUP: "group", INSTANCE: "instance", COMPONENT: "component", COMPONENT_SET: "componentSet",
  TEXT: "text", RECTANGLE: "rectangle", ELLIPSE: "ellipse", LINE: "line", SECTION: "section",
  VECTOR: "vector", BOOLEAN_OPERATION: "vector", STAR: "vector", REGULAR_POLYGON: "vector",
};

const CONSTRAINTS: Record<string, IRConstraint | undefined> = {
  LEFT: undefined, TOP: undefined, RIGHT: "end", BOTTOM: "end", LEFT_RIGHT: "both", TOP_BOTTOM: "both",
  CENTER: "center", SCALE: "scale",
};

const TRIGGERS: Record<string, IRTrigger> = {
  ON_CLICK: "click", ON_HOVER: "hover", ON_PRESS: "press", ON_DRAG: "drag", MOUSE_ENTER: "mouse-enter",
  MOUSE_LEAVE: "mouse-leave", MOUSE_DOWN: "mouse-down", MOUSE_UP: "mouse-up", AFTER_TIMEOUT: "after-delay",
  ON_KEY_DOWN: "key", ON_MEDIA_HIT: "media", ON_MEDIA_END: "media",
};

const NAVIGATIONS: Record<string, IRAction["type"]> = {
  NAVIGATE: "navigate", OVERLAY: "overlay", SWAP: "swap-overlay", SCROLL_TO: "scroll-to", CHANGE_TO: "change-to",
};

/** Figma's easing curves as CSS timing functions; springs as `spring(mass, stiffness, damping)`. */
const EASINGS: Record<string, string> = {
  LINEAR: "linear",
  EASE_IN: "ease-in",
  EASE_OUT: "ease-out",
  EASE_IN_AND_OUT: "ease-in-out",
  EASE_IN_BACK: "cubic-bezier(0.3, -0.05, 0.7, -0.5)",
  EASE_OUT_BACK: "cubic-bezier(0.45, 1.45, 0.8, 1)",
  EASE_IN_AND_OUT_BACK: "cubic-bezier(0.7, -0.4, 0.4, 1.4)",
  GENTLE: "spring(1, 100, 15)",
  QUICK: "spring(1, 300, 20)",
  BOUNCY: "spring(1, 600, 15)",
  SLOW: "spring(1, 80, 20)",
};

const TEXT_CASES: Record<string, IRTextStyle["textTransform"]> = {
  UPPER: "uppercase", LOWER: "lowercase", TITLE: "capitalize", SMALL_CAPS: "small-caps", SMALL_CAPS_FORCED: "all-small-caps",
};

/** Node `boundVariables` keys → IR token field names. */
const BOUND_FIELDS: Record<string, string> = {
  itemSpacing: "gap", counterAxisSpacing: "lineGap",
  paddingTop: "padding.top", paddingRight: "padding.right", paddingBottom: "padding.bottom", paddingLeft: "padding.left",
  topLeftRadius: "radius.topLeft", topRightRadius: "radius.topRight",
  bottomRightRadius: "radius.bottomRight", bottomLeftRadius: "radius.bottomLeft",
  visible: "visible", opacity: "opacity", characters: "characters", strokeWeight: "stroke.weight",
  minWidth: "minWidth", maxWidth: "maxWidth", minHeight: "minHeight", maxHeight: "maxHeight",
};

const TEXT_BOUND = ["fontFamily", "fontSize", "fontStyle", "fontWeight", "letterSpacing", "lineHeight", "paragraphSpacing", "paragraphIndent"];

/** A property key without the `#<id>` Figma appends to non-variant properties. */
function propName(key: string): string {
  return key.replace(/#\d+:\d+$/, "");
}

/** `Size=Large, State=Hover` → `{ Size: "Large", State: "Hover" }`. */
function variantValues(name: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of name.split(",")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}

function slug(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "x";
}

interface Ctx {
  options: ToDesignIROptions;
  file: RestFile;
  byId: Map<string, any>;
  tokenOf: TokenOf;
  collectionName: Map<string, string>;
  modeName: Map<string, string>;
  components: Record<string, IRComponent>;
  styles: Record<string, IRStyle>;
  assets: IRAssets;
  /** SVG text (with neutral ids) → asset key, to share one asset between identical artwork. */
  svgKeys: Map<string, string>;
  fonts: Map<string, IRAssets["fonts"][number]>;
}

interface Parent {
  rest: any;
  /** The parent lays its children out (auto layout or grid). */
  stack?: "flex" | "grid";
}

// ---------------------------------------------------------------- tokens

function buildTokens(meta: RestVariables["meta"] | undefined): { tokens: IRTokens; tokenOf: TokenOf; collectionName: Map<string, string>; modeName: Map<string, string> } {
  const tokens: IRTokens = { collections: [], tokens: {} };
  const collectionName = new Map<string, string>();
  const modeName = new Map<string, string>();
  const byId = new Map<string, string>();
  const byKey = new Map<string, string>();
  if (!meta) return { tokens, tokenOf: () => undefined, collectionName, modeName };

  const collections = Object.values(meta.variableCollections);
  for (const c of collections) {
    collectionName.set(c.id, c.name);
    for (const m of c.modes) modeName.set(`${c.id}|${m.modeId}`, m.name);
    const out: IRTokens["collections"][number] = {
      id: c.id,
      name: c.name,
      modes: c.modes.map((m) => m.name),
      defaultMode: c.modes.find((m) => m.modeId === c.defaultModeId)?.name ?? c.modes[0]?.name ?? "",
    };
    if (c.remote) out.remote = true;
    tokens.collections.push(out);
  }

  // Names are unique within a collection, not across them: a library's
  // collection copied into the file often shares a local one's name. Local
  // variables get the plain name, then library ones, then deleted ones kept
  // for their references; the rest are qualified until unique.
  const rank = (v: Rest.LocalVariable) => (v.deletedButReferenced ? 2 : v.remote ? 1 : 0);
  const variables = Object.values(meta.variables).sort((a, b) => rank(a) - rank(b));
  const names = new Map<string, string>();
  const taken = new Set<string>();
  for (const v of variables) {
    const collection = collectionName.get(v.variableCollectionId) ?? "?";
    let name = v.name;
    if (taken.has(name)) name = `${collection}/${v.name}`;
    for (let i = 2; taken.has(name); i++) name = `${collection} ${i}/${v.name}`;
    taken.add(name);
    names.set(v.id, name);
    byId.set(v.id, name);
    if (v.key) byKey.set(v.key, name);
  }
  const tokenOf: TokenOf = (id) => {
    if (!id) return undefined;
    const hit = byId.get(id);
    if (hit) return hit;
    // A library variable is referenced by key and version; versions differ between copies.
    const m = /^VariableID:([^/]+)\//.exec(id);
    return m ? byKey.get(m[1]) : undefined;
  };

  const usedCss = new Set<string>();
  for (const v of variables) {
    const name = names.get(v.id)!;
    let css = v.codeSyntax?.WEB?.trim().replace(/^var\((.*)\)$/, "$1") ?? "";
    if (!css.startsWith("--")) css = `--${slug(name)}`;
    for (let i = 2; usedCss.has(css); i++) css = `--${slug(name)}-${i}`;
    usedCss.add(css);
    const collection = meta.variableCollections[v.variableCollectionId];
    const values: IRTokens["tokens"][string]["values"] = {};
    for (const [modeId, value] of Object.entries(v.valuesByMode)) {
      const mode = collection?.modes.find((m) => m.modeId === modeId)?.name ?? modeId;
      if (value && typeof value === "object" && "type" in value && value.type === "VARIABLE_ALIAS") {
        values[mode] = { token: tokenOf(value.id) ?? value.id };
      } else if (value && typeof value === "object" && "r" in value) {
        values[mode] = hex(value as Rest.RGBA);
      } else if (typeof value === "number") {
        values[mode] = round(value, 4);
      } else if (value !== undefined && value !== null) {
        values[mode] = value as string | boolean;
      }
    }
    const type = ({ COLOR: "color", FLOAT: "number", STRING: "string", BOOLEAN: "boolean" } as const)[v.resolvedType] ?? "string";
    const token: IRTokens["tokens"][string] = { id: v.id, collection: collection?.name ?? "", type, css, values };
    if (v.description) token.description = v.description;
    if (v.scopes?.length && !(v.scopes.length === 1 && v.scopes[0] === "ALL_SCOPES")) token.scopes = v.scopes;
    tokens.tokens[name] = token;
  }
  return { tokens, tokenOf, collectionName, modeName };
}

// ---------------------------------------------------------------- text

function textStyle(s: any, full: boolean): Partial<IRTextStyle> {
  const out: Partial<IRTextStyle> = {};
  const has = (k: string) => full || k in s;
  if (has("fontFamily")) out.fontFamily = s.fontFamily ?? "";
  if (has("fontStyle")) out.fontStyle = s.fontStyle ?? "Regular";
  if (has("fontWeight")) out.fontWeight = s.fontWeight ?? 400;
  if (s.italic) out.italic = true;
  if (has("fontSize")) out.fontSize = round(s.fontSize ?? 12, 3);
  if (has("lineHeightPx")) {
    out.lineHeight = round(s.lineHeightPx ?? (s.fontSize ?? 12) * 1.2, 3);
    if (s.lineHeightUnit === "INTRINSIC_%" && Math.abs((s.lineHeightPercent ?? 100) - 100) < 1e-3) out.lineHeightAuto = true;
  }
  if (has("letterSpacing") && s.letterSpacing) out.letterSpacing = round(s.letterSpacing, 3);
  const align = ({ CENTER: "center", RIGHT: "right", JUSTIFIED: "justify" } as const)[s.textAlignHorizontal as string];
  if (align) out.textAlign = align;
  const valign = ({ CENTER: "center", BOTTOM: "bottom" } as const)[s.textAlignVertical as string];
  if (valign) out.verticalAlign = valign;
  const tc = TEXT_CASES[s.textCase];
  if (tc) out.textTransform = tc;
  const deco = ({ UNDERLINE: "underline", STRIKETHROUGH: "line-through" } as const)[s.textDecoration as string];
  if (deco) out.textDecoration = deco;
  if (s.paragraphSpacing) out.paragraphSpacing = s.paragraphSpacing;
  if (s.paragraphIndent) out.paragraphIndent = s.paragraphIndent;
  if (s.listSpacing) out.listSpacing = s.listSpacing;
  if (s.leadingTrim === "CAP_HEIGHT") out.leadingTrim = "cap";
  return out;
}

function link(h: any): string | undefined {
  if (h?.type === "URL" && h.url) return h.url;
  if (h?.type === "NODE" && h.nodeID) return `#${h.nodeID}`;
  return undefined;
}

function noteFont(ctx: Ctx, s: Partial<IRTextStyle>): void {
  if (!s.fontFamily) return;
  const k = `${s.fontFamily}|${s.fontStyle}|${s.fontWeight}|${!!s.italic}`;
  const hit = ctx.fonts.get(k);
  if (hit) hit.nodes++;
  else {
    const f: IRAssets["fonts"][number] = { family: s.fontFamily, style: s.fontStyle ?? "Regular", weight: s.fontWeight ?? 400, nodes: 1 };
    if (s.italic) f.italic = true;
    ctx.fonts.set(k, f);
  }
}

function irText(ctx: Ctx, n: any): IRText {
  const base = n.style ?? {};
  const style = textStyle(base, true) as IRTextStyle;
  noteFont(ctx, style);
  const out: IRText = { content: n.characters ?? "", style };
  const baseFills = irPaints(n.fills, n.size?.x ?? 0, n.size?.y ?? 0, ctx.tokenOf);
  const ids: number[] = n.characterStyleOverrides ?? [];
  const table: Record<string, any> = n.styleOverrideTable ?? {};
  if (ids.some((id) => id && table[String(id)])) {
    const runs: IRTextRun[] = [];
    // Style ids are per code point: an emoji outside the BMP has one id.
    const chars = Array.from(out.content);
    let start = 0;
    while (start < chars.length) {
      const id = ids[start] ?? 0;
      let end = start + 1;
      while (end < chars.length && (ids[end] ?? 0) === id) end++;
      const run: IRTextRun = { text: chars.slice(start, end).join("") };
      const o = id ? table[String(id)] : undefined;
      if (o) {
        // REST repeats base values in overrides; keep what differs.
        const s = textStyle(o, false) as Record<string, unknown>;
        delete s.textAlign;
        delete s.verticalAlign;
        for (const k of Object.keys(s)) if (JSON.stringify(s[k]) === JSON.stringify((style as any)[k])) delete s[k];
        if (Object.keys(s).length) {
          run.style = s as Partial<IRTextStyle>;
          noteFont(ctx, { ...style, ...s });
        }
        const fills = o.fills ? irPaints(o.fills, n.size?.x ?? 0, n.size?.y ?? 0, ctx.tokenOf) : undefined;
        if (fills && JSON.stringify(fills) !== JSON.stringify(baseFills)) run.fills = fills;
        const l = link(o.hyperlink);
        if (l) run.link = l;
      }
      runs.push(run);
      start = end;
    }
    if (runs.some((r) => r.style || r.fills || r.link)) out.runs = runs;
  }
  const types: string[] = n.lineTypes ?? [];
  if (types.some((t) => t !== "NONE")) {
    const indents: number[] = n.lineIndentations ?? [];
    out.lines = types.map((t, i) => {
      const line: NonNullable<IRText["lines"]>[number] = {};
      if (t === "ORDERED") line.list = "ordered";
      if (t === "UNORDERED") line.list = "unordered";
      if (indents[i]) line.indent = indents[i];
      return line;
    });
  }
  const resize = ({ WIDTH_AND_HEIGHT: "width", HEIGHT: "height", TRUNCATE: "truncate" } as const)[base.textAutoResize as string];
  if (resize) out.autoResize = resize;
  if (base.maxLines) out.maxLines = base.maxLines;
  const l = link(base.hyperlink);
  if (l) out.link = l;
  const measured = ctx.options.textLines?.get(n.id);
  if (measured) out.measuredLines = measured;
  return out;
}

// ---------------------------------------------------------------- interactions

function irInteractions(ctx: Ctx, list: Rest.Interaction[] | undefined): IRInteraction[] {
  const out: IRInteraction[] = [];
  for (const i of list ?? []) {
    const t: any = i.trigger;
    const trigger = t ? TRIGGERS[t.type] : undefined;
    if (!trigger) continue;
    const ix: IRInteraction = { trigger, actions: [] };
    if (t.delay) ix.delay = t.delay;
    if (t.timeout !== undefined) ix.delay = t.timeout;
    if (t.keyCodes?.length) ix.keys = t.keyCodes;
    for (const a of (i.actions ?? []) as any[]) {
      if (!a) continue;
      if (a.type === "BACK" || a.type === "CLOSE") { ix.actions.push({ type: a.type === "BACK" ? "back" : "close" }); continue; }
      if (a.type === "URL") { ix.actions.push({ type: "open-url", url: a.url, newTab: a.openInNewTab !== false }); continue; }
      if (a.type !== "NODE") continue;
      const action: IRAction = { type: NAVIGATIONS[a.navigation] ?? "navigate" };
      if (a.destinationId) {
        action.target = a.destinationId;
        const name = ctx.byId.get(a.destinationId)?.name;
        if (name !== undefined) action.targetName = name;
      }
      const tr = a.transition;
      if (tr) {
        const e = tr.easing ?? {};
        let easing = EASINGS[e.type] ?? "ease-out";
        if (e.type === "CUSTOM_CUBIC_BEZIER" && e.easingFunctionCubicBezier) {
          const b = e.easingFunctionCubicBezier;
          easing = `cubic-bezier(${b.x1}, ${b.y1}, ${b.x2}, ${b.y2})`;
        } else if (e.type === "CUSTOM_SPRING" && e.easingFunctionSpring) {
          const s = e.easingFunctionSpring;
          easing = `spring(${s.mass}, ${s.stiffness}, ${s.damping})`;
        }
        action.transition = { type: String(tr.type).toLowerCase().replace(/_/g, "-"), duration: tr.duration, easing };
        if (tr.direction) action.transition.direction = String(tr.direction).toLowerCase();
      }
      if (a.preserveScrollPosition) action.preserveScroll = true;
      ix.actions.push(action);
    }
    if (ix.actions.length) out.push(ix);
  }
  return out;
}

// ---------------------------------------------------------------- layout

function padding(n: any): IRPadding | undefined {
  const p = { top: n.paddingTop ?? 0, right: n.paddingRight ?? 0, bottom: n.paddingBottom ?? 0, left: n.paddingLeft ?? 0 };
  return p.top || p.right || p.bottom || p.left ? p : undefined;
}

function containerLayout(n: any): IRFlexLayout | IRGridLayout | undefined {
  if (n.layoutMode === "GRID") {
    const g: IRGridLayout = { type: "grid", rows: n.gridRowsSizing ?? "", columns: n.gridColumnsSizing ?? "" };
    if (n.gridRowGap) g.rowGap = n.gridRowGap;
    if (n.gridColumnGap) g.columnGap = n.gridColumnGap;
    const p = padding(n);
    if (p) g.padding = p;
    return g;
  }
  if (n.layoutMode !== "HORIZONTAL" && n.layoutMode !== "VERTICAL") return undefined;
  const f: IRFlexLayout = { type: "flex", direction: n.layoutMode === "HORIZONTAL" ? "row" : "column" };
  const justify = ({ CENTER: "center", MAX: "end", SPACE_BETWEEN: "space-between" } as const)[n.primaryAxisAlignItems as string];
  if (justify) f.justify = justify;
  if (n.itemSpacing && justify !== "space-between") f.gap = round(n.itemSpacing, 3);
  const align = ({ CENTER: "center", MAX: "end", BASELINE: "baseline" } as const)[n.counterAxisAlignItems as string];
  if (align) f.align = align;
  if (n.layoutWrap === "WRAP") {
    f.wrap = true;
    if (n.counterAxisSpacing) f.lineGap = round(n.counterAxisSpacing, 3);
    if (n.counterAxisAlignContent === "SPACE_BETWEEN") f.alignContent = "space-between";
  }
  const p = padding(n);
  if (p) f.padding = p;
  if (n.itemReverseZIndex) f.reverseZ = true;
  if (n.strokesIncludedInLayout) f.strokesInLayout = true;
  return f;
}

const EPS = 1e-6;

function placement(n: any, out: IRNode): void {
  const t = n.relativeTransform ?? [[1, 0, 0], [0, 1, 0]];
  out.x = round(t[0][2], 3);
  out.y = round(t[1][2], 3);
  out.width = round(n.size?.x ?? 0, 3);
  out.height = round(n.size?.y ?? 0, 3);
  const [a, c, b, d] = [t[0][0], t[0][1], t[1][0], t[1][1]];
  if (Math.abs(a - 1) > EPS || Math.abs(b) > EPS || Math.abs(c) > EPS || Math.abs(d - 1) > EPS) {
    out.transform = [round(a, 5), round(b, 5), round(c, 5), round(d, 5)];
    // A flip has no single rotation; the transform says it all.
    const r = a * d - b * c > 0 ? round((Math.atan2(b, a) * 180) / Math.PI, 2) : 0;
    if (r) out.rotation = r;
  }
}

function inParent(n: any, parent: Parent | undefined, out: IRNode): void {
  const absolute = !parent?.stack || n.layoutPositioning === "ABSOLUTE";
  if (parent?.stack && n.layoutPositioning === "ABSOLUTE") out.absolute = true;
  if (absolute && parent && parent.rest.type !== "CANVAS" && parent.rest.type !== "SECTION") {
    const h = CONSTRAINTS[n.constraints?.horizontal];
    const v = CONSTRAINTS[n.constraints?.vertical];
    if (h || v) {
      out.constraints = {};
      if (h) out.constraints.horizontal = h;
      if (v) out.constraints.vertical = v;
    }
  }
  const sizing: NonNullable<IRNode["sizing"]> = {};
  const map = { HUG: "hug", FILL: "fill" } as const;
  const sh = map[n.layoutSizingHorizontal as "HUG" | "FILL"];
  const sv = map[n.layoutSizingVertical as "HUG" | "FILL"];
  if (sh) sizing.horizontal = sh;
  if (sv) sizing.vertical = sv;
  if (!n.layoutSizingHorizontal && n.type === "TEXT") {
    const r = n.style?.textAutoResize;
    if (r === "WIDTH_AND_HEIGHT") sizing.horizontal = sizing.vertical = "hug";
    if (r === "HEIGHT") sizing.vertical = "hug";
  }
  if (sizing.horizontal || sizing.vertical) out.sizing = sizing;
  for (const k of ["minWidth", "maxWidth", "minHeight", "maxHeight"] as const) if (n[k]) out[k] = n[k];
  if (parent?.stack === "grid" && !out.absolute && n.gridRowAnchorIndex !== undefined) {
    const cell: NonNullable<IRNode["gridCell"]> = { row: n.gridRowAnchorIndex, column: n.gridColumnAnchorIndex ?? 0 };
    if (n.gridRowSpan > 1) cell.rowSpan = n.gridRowSpan;
    if (n.gridColumnSpan > 1) cell.columnSpan = n.gridColumnSpan;
    const al = { MIN: "start", CENTER: "center", MAX: "end" } as const;
    const ah = al[n.gridChildHorizontalAlign as "MIN"];
    const av = al[n.gridChildVerticalAlign as "MIN"];
    if (ah) cell.alignH = ah;
    if (av) cell.alignV = av;
    out.gridCell = cell;
  }
}

// ---------------------------------------------------------------- tokens on nodes

function nodeTokens(ctx: Ctx, n: any): Record<string, string> | undefined {
  const b = n.boundVariables;
  if (!b) return undefined;
  const out: Record<string, string> = {};
  const set = (field: string, alias: any) => {
    const t = ctx.tokenOf(alias?.id);
    if (t) out[field] = t;
  };
  for (const [k, v] of Object.entries<any>(b)) {
    if (k === "size") { set("width", v?.x); set("height", v?.y); continue; }
    if (k === "individualStrokeWeights") { for (const side of ["top", "right", "bottom", "left"]) set(`stroke.weight.${side}`, v?.[side]); continue; }
    if (TEXT_BOUND.includes(k)) { set(`text.${k}`, Array.isArray(v) ? v[0] : v); continue; }
    const field = BOUND_FIELDS[k];
    if (field) set(field, v);
  }
  return Object.keys(out).length ? out : undefined;
}

function nodeModes(ctx: Ctx, n: any): Record<string, string> | undefined {
  const m = n.explicitVariableModes;
  if (!m) return undefined;
  const out: Record<string, string> = {};
  for (const [collection, mode] of Object.entries<string>(m)) {
    out[ctx.collectionName.get(collection) ?? collection] = ctx.modeName.get(`${collection}|${mode}`) ?? mode;
  }
  return out;
}

// ---------------------------------------------------------------- styles

function noteStyles(ctx: Ctx, n: any, ir: IRNode): void {
  const st = n.styles;
  if (!st) return;
  const refs: NonNullable<IRNode["styles"]> = {};
  for (const kind of ["fill", "stroke", "text", "effect", "grid"] as const) {
    const id = st[kind];
    if (!id) continue;
    refs[kind] = id;
    if (ctx.styles[id]) continue;
    const meta = (ctx.file.styles as any)?.[id];
    const base = { id, name: meta?.name ?? id, ...(meta?.description ? { description: meta.description } : {}) };
    const w = n.size?.x ?? 0;
    const h = n.size?.y ?? 0;
    if (kind === "fill") ctx.styles[id] = { ...base, type: "fill", paints: irPaints(n.fills, w, h, ctx.tokenOf) };
    else if (kind === "stroke") ctx.styles[id] = { ...base, type: "fill", paints: irPaints(n.strokes, w, h, ctx.tokenOf) };
    else if (kind === "text" && n.style) {
      const s = textStyle(n.style, true) as IRTextStyle;
      delete s.textAlign;
      delete s.verticalAlign;
      ctx.styles[id] = { ...base, type: "text", text: s };
    } else if (kind === "effect") ctx.styles[id] = { ...base, type: "effect", effects: irEffects(n.effects, ctx.tokenOf) };
    else if (kind === "grid") ctx.styles[id] = { ...base, type: "grid" };
  }
  if (Object.keys(refs).length) ir.styles = refs;
}

// ---------------------------------------------------------------- components

function propDefs(defs: Record<string, Rest.ComponentPropertyDefinition> | undefined): Record<string, IRComponentProp> | undefined {
  if (!defs) return undefined;
  const out: Record<string, IRComponentProp> = {};
  for (const [key, d] of Object.entries(defs)) {
    const type = ({ VARIANT: "variant", BOOLEAN: "boolean", TEXT: "text", INSTANCE_SWAP: "instance" } as const)[d.type];
    if (!type) continue;
    const p: IRComponentProp = { type, default: d.defaultValue as string | boolean };
    if (d.variantOptions?.length) p.options = d.variantOptions;
    if (d.preferredValues?.length) p.preferred = d.preferredValues.map((v) => v.key);
    const name = propName(key);
    out[name in out ? key : name] = p;
  }
  return Object.keys(out).length ? out : undefined;
}

function instanceOf(ctx: Ctx, n: any): IRNode["component"] {
  const id: string = n.componentId ?? "";
  const meta = (ctx.file.components as any)?.[id];
  const out: NonNullable<IRNode["component"]> = { id, name: meta?.name ?? ctx.byId.get(id)?.name ?? "" };
  if (meta?.componentSetId) out.set = meta.componentSetId;
  const variant: Record<string, string> = {};
  const props: Record<string, string | boolean> = {};
  for (const [key, p] of Object.entries<any>(n.componentProperties ?? {})) {
    if (p.type === "VARIANT") variant[key] = String(p.value);
    else props[propName(key)] = p.value;
  }
  const sorted = <T>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  if (Object.keys(variant).length) out.variant = sorted(variant);
  if (Object.keys(props).length) out.props = sorted(props);
  const overrides = ((n.overrides ?? []) as Rest.Overrides[])
    .filter((o) => o.id !== n.id && o.overriddenFields.length)
    .map((o) => ({ id: o.id, fields: [...new Set(o.overriddenFields.map((f) => OVERRIDE_GROUPS[f] ?? f))].sort() }));
  if (overrides.length) out.overrides = overrides;
  if (n.uniformScaleFactor && n.uniformScaleFactor !== 1) out.scale = n.uniformScaleFactor;
  return out;
}

/** REST override field names → what they change, in IR terms. */
const OVERRIDE_GROUPS: Record<string, string> = {
  characters: "characters", characterStyleOverrides: "characters", styleOverrideTable: "characters",
  lineTypes: "characters", lineIndentations: "characters",
  fontFamily: "textStyle", fontPostScriptName: "textStyle", fontSize: "textStyle", fontWeight: "textStyle",
  italic: "textStyle", letterSpacing: "textStyle", lineHeightPercent: "textStyle", lineHeightPercentFontSize: "textStyle",
  lineHeightPx: "textStyle", lineHeightUnit: "textStyle", openTypeFlags: "textStyle", inheritTextStyleId: "textStyle",
  text: "textStyle", textCase: "textStyle", textDecoration: "textStyle", paragraphSpacing: "textStyle", paragraphIndent: "textStyle",
  textAlignHorizontal: "textStyle", textAlignVertical: "textStyle", textAutoResize: "textStyle", hyperlink: "link",
  fills: "fills", inheritFillStyleId: "fills",
  strokes: "stroke", strokeWeight: "stroke", strokeAlign: "stroke", strokeDashes: "stroke", individualStrokeWeights: "stroke",
  width: "size", height: "size", preserveRatio: "size",
  cornerRadius: "radius", topLeftRadius: "radius", topRightRadius: "radius", bottomLeftRadius: "radius", bottomRightRadius: "radius",
  layoutMode: "layout", itemSpacing: "layout", primaryAxisSizingMode: "layout", counterAxisSizingMode: "layout",
  primaryAxisAlignItems: "layout", counterAxisAlignItems: "layout", paddingLeft: "layout", paddingRight: "layout",
  paddingTop: "layout", paddingBottom: "layout",
  layoutPositioning: "sizing", layoutAlign: "sizing", layoutGrow: "sizing",
  minWidth: "sizing", maxWidth: "sizing", minHeight: "sizing", maxHeight: "sizing",
};

const STATE_TRIGGERS: Record<string, "hover" | "press" | "click" | "focus"> = {
  ON_HOVER: "hover", MOUSE_ENTER: "hover", ON_PRESS: "press", MOUSE_DOWN: "press", ON_CLICK: "click", ON_KEY_DOWN: "focus",
};

/** Hover, press and click states of a set's variants, from their `CHANGE_TO` interactions. */
function states(set: any): IRComponent["states"] {
  const variants = new Set<string>((set.children ?? []).map((c: any) => c.id));
  const out: NonNullable<IRComponent["states"]> = {};
  for (const v of set.children ?? []) {
    const walk = (n: any) => {
      for (const i of n.interactions ?? []) {
        const kind = STATE_TRIGGERS[i.trigger?.type];
        if (!kind) continue;
        for (const a of i.actions ?? []) {
          if (a?.type === "NODE" && a.navigation === "CHANGE_TO" && variants.has(a.destinationId)) {
            (out[v.id] ??= {})[kind] ??= a.destinationId;
          }
        }
      }
      // Interactions inside nested instances belong to their own components.
      if (n.type !== "INSTANCE" || n === v) for (const c of n.children ?? []) walk(c);
    };
    walk(v);
  }
  return Object.keys(out).length ? out : undefined;
}

function registerComponent(ctx: Ctx, n: any, ir: IRNode, page: string): void {
  const kind = n.type === "COMPONENT_SET" ? "set" : "component";
  const meta = (kind === "set" ? ctx.file.componentSets : ctx.file.components) as any;
  const c: IRComponent = { id: n.id, name: n.name, kind, page, root: ir };
  const description = meta?.[n.id]?.description;
  if (description) c.description = description;
  const props = propDefs(n.componentPropertyDefinitions);
  if (props) c.props = props;
  if (kind === "set") {
    c.variants = (n.children ?? []).filter((v: any) => v.type === "COMPONENT").map((v: any) => ({ id: v.id, name: v.name, values: variantValues(v.name) }));
    const s = states(n);
    if (s) c.states = s;
  }
  ctx.components[n.id] = c;
}

// ---------------------------------------------------------------- svg artwork

function hasImage(paints: any[] | undefined): boolean {
  return (paints ?? []).some((p) => p.visible !== false && (p.type === "IMAGE" || p.type === "VIDEO"));
}

/** Whether a container holds nothing but vector shapes, at least one of them a path. */
function vectorArt(n: any): boolean {
  let paths = 0;
  const ok = (c: any): boolean => {
    if (c.visible === false) return true;
    if (hasImage(c.fills) || hasImage(c.strokes)) return false;
    if (c.effects?.some((e: any) => e.visible !== false)) return false;
    if (c.interactions?.length) return false;
    if (VECTOR_TYPES.has(c.type)) { paths++; return true; }
    if (SHAPE_TYPES.has(c.type)) return true;
    if (CONTAINER_TYPES.has(c.type) && !c.layoutMode) return (c.children ?? []).every(ok);
    return false;
  };
  if (n.layoutMode) return false;
  return (n.children ?? []).every(ok) && paths > 0;
}

function svgAsset(ctx: Ctx, n: any): string | undefined {
  if (!hasGeometry(n)) return undefined;
  const neutral = nodeSvg(n, "s");
  const known = ctx.svgKeys.get(neutral);
  if (known) return known;
  let key = slug(n.name);
  for (let i = 2; ctx.assets.svgs[key]; i++) key = `${slug(n.name)}-${i}`;
  ctx.svgKeys.set(neutral, key);
  ctx.assets.svgs[key] = { name: n.name, width: round(n.size?.x ?? 0, 3), height: round(n.size?.y ?? 0, 3), svg: nodeSvg(n, key) };
  return key;
}

function wantsSvg(ctx: Ctx, n: any, top: boolean): boolean {
  if (VECTOR_TYPES.has(n.type)) return true;
  if (!CONTAINER_TYPES.has(n.type)) return false;
  if (n.exportSettings?.some((e: any) => e.format === "SVG") && vectorArt(n)) return true;
  if (!vectorArt(n)) return false;
  const max = ctx.options.iconMaxSize ?? 160;
  const small = Math.max(n.size?.x ?? 0, n.size?.y ?? 0) <= max;
  return small || n.type === "INSTANCE" || (n.type === "COMPONENT" && !top);
}

// ---------------------------------------------------------------- nodes

function noteImages(ctx: Ctx, paints: any[] | undefined): void {
  for (const p of paints ?? []) {
    if (p.type !== "IMAGE" || !p.imageRef || p.visible === false) continue;
    const hit = ctx.assets.images[p.imageRef];
    if (hit) hit.nodes++;
    else {
      const entry: IRAssets["images"][string] = { nodes: 1 };
      const bytes = ctx.options.images?.get(p.imageRef);
      const info = bytes ? imageInfo(bytes) : undefined;
      if (info) Object.assign(entry, info);
      ctx.assets.images[p.imageRef] = entry;
    }
  }
}

function convert(ctx: Ctx, n: any, parent: Parent | undefined, page: string): IRNode | undefined {
  const refs = n.componentPropertyReferences;
  if (n.visible === false && !ctx.options.keepHidden && !refs?.visible) return undefined;
  if (n.type === "SLICE") return undefined;

  let type: IRNodeType = TYPES[n.type] ?? "frame";
  const out = { id: n.id, name: n.name ?? "", type } as IRNode;
  if (n.visible === false) out.visible = false;
  placement(n, out);
  inParent(n, parent, out);

  if (n.opacity !== undefined && n.opacity < 1) out.opacity = round(n.opacity, 3);
  const blend = blendMode(n.blendMode);
  if (blend) out.blendMode = blend;
  const w = n.size?.x ?? 0;
  const h = n.size?.y ?? 0;
  const fills = irPaints(n.fills, w, h, ctx.tokenOf);
  if (fills.length) out.fills = fills;
  noteImages(ctx, n.fills);
  noteImages(ctx, n.strokes);
  const stroke = irStroke(n, ctx.tokenOf);
  if (stroke) out.stroke = stroke;
  // A group has no corners of its own, and a vector's are already in its path.
  const cornered = n.type !== "GROUP" && n.type !== "LINE" && !VECTOR_TYPES.has(n.type);
  if (cornered && n.rectangleCornerRadii) {
    const r = n.rectangleCornerRadii as number[];
    out.radius = r.every((v) => v === r[0]) ? r[0] : [r[0], r[1], r[2], r[3]];
  } else if (cornered && n.cornerRadius) out.radius = n.cornerRadius;
  if (out.radius !== undefined && n.cornerSmoothing) out.cornerSmoothing = round(n.cornerSmoothing, 3);
  const effects = irEffects(n.effects, ctx.tokenOf);
  if (effects.length) out.effects = effects;
  if (n.isMask) out.mask = n.maskType === "VECTOR" ? "vector" : n.maskType === "LUMINANCE" ? "luminance" : "alpha";
  if (n.type === "ELLIPSE" && n.arcData) {
    const a = n.arcData;
    const full = Math.abs(a.endingAngle - a.startingAngle - 2 * Math.PI) < 1e-4;
    if (!full || a.innerRadius) out.arc = { start: round(a.startingAngle, 5), end: round(a.endingAngle, 5), innerRadius: round(a.innerRadius, 5) };
  }

  const layout = containerLayout(n);
  if (layout) out.layout = layout;
  if (n.clipsContent && n.type !== "GROUP") out.clip = true;
  const scroll = ({ HORIZONTAL_SCROLLING: "x", VERTICAL_SCROLLING: "y", HORIZONTAL_AND_VERTICAL_SCROLLING: "both" } as const)[n.overflowDirection as string];
  if (scroll) out.scroll = scroll;
  const sb = ({ FIXED: "fixed", STICKY_SCROLLS: "sticky" } as const)[n.scrollBehavior as string];
  if (sb) out.scrollBehavior = sb;

  if (n.type === "TEXT") out.text = irText(ctx, n);
  if (n.type === "INSTANCE") out.component = instanceOf(ctx, n);
  if (refs) out.propRefs = Object.fromEntries(Object.entries<string>(refs).map(([k, v]) => [k, propName(v)]));
  noteStyles(ctx, n, out);
  const tokens = nodeTokens(ctx, n);
  if (tokens) out.tokens = tokens;
  const modes = nodeModes(ctx, n);
  if (modes) out.modes = modes;
  const ix = irInteractions(ctx, n.interactions);
  if (ix.length) out.interactions = ix;
  if (n.exportSettings?.length) {
    out.exports = n.exportSettings.map((e: any) => {
      const x: NonNullable<IRNode["exports"]>[number] = { format: e.format };
      if (e.suffix) x.suffix = e.suffix;
      if (e.constraint?.type === "SCALE" && e.constraint.value !== 1) x.scale = e.constraint.value;
      return x;
    });
  }

  const top = !parent || parent.rest.type === "CANVAS" || parent.rest.type === "SECTION";
  if (wantsSvg(ctx, n, top)) {
    const key = svgAsset(ctx, n);
    if (key) {
      out.asset = key;
      if (out.type === "vector" || out.type === "frame" || out.type === "group") out.type = "svg";
      // The artwork draws the node's own fills and strokes too.
      delete out.fills;
      delete out.stroke;
      if (out.type !== "instance" && out.type !== "component") delete out.layout;
      if (n.type === "COMPONENT") registerComponent(ctx, n, out, page);
      return out;
    }
  }

  const kids: any[] = n.children ?? [];
  // A rectangle, or an empty frame, showing one image is an image element.
  if ((n.type === "RECTANGLE" || (n.type === "FRAME" && !kids.length)) && fills.length === 1 && fills[0].type === "image") out.type = "image";

  if (kids.length && !(n.type === "BOOLEAN_OPERATION")) {
    const reference = ctx.options.instances === "reference" && n.type === "INSTANCE" && !out.component?.overrides
      && ctx.byId.get(n.componentId)?.type === "COMPONENT";
    if (!reference) {
      const me: Parent = { rest: n, stack: layout?.type };
      const children = kids.map((c) => convert(ctx, c, me, page)).filter((c): c is IRNode => !!c);
      if (children.length) out.children = children;
    }
  }
  if (n.type === "COMPONENT" || n.type === "COMPONENT_SET") {
    if (!(n.type === "COMPONENT" && parent?.rest.type === "COMPONENT_SET")) registerComponent(ctx, n, out, page);
  }
  return out;
}

function screens(ctx: Ctx, page: any, list: any[], section: string[], out: IRScreen[], modes?: Record<string, string>): void {
  for (const c of list) {
    if (c.type === "SECTION") {
      if (c.visible === false && !ctx.options.keepHidden) continue;
      const own = nodeModes(ctx, c);
      screens(ctx, page, c.children ?? [], [...section, c.name], out, own ? { ...modes, ...own } : modes);
      continue;
    }
    const root = convert(ctx, c, { rest: page }, page.id);
    if (!root) continue;
    // Modes set on the page or a section around the screen apply inside it.
    if (modes) root.modes = { ...modes, ...root.modes };
    // Component definitions live in `components`, not among the screens.
    if (c.type === "COMPONENT" || c.type === "COMPONENT_SET") continue;
    const s: IRScreen = { id: c.id, name: c.name, root };
    if (section.length) s.section = section;
    out.push(s);
  }
}

/**
 * The design IR of a file from its REST JSON. Pass the variables to resolve
 * token names and modes, and REST JSON fetched with `geometry=paths` (or
 * `toRestDocument(doc, { geometry: true })`) for SVG artwork.
 */
export function toDesignIR(file: RestFile, options: ToDesignIROptions = {}): DesignIR {
  const meta = options.variables && "meta" in options.variables ? options.variables.meta : (options.variables as RestVariables["meta"] | undefined);
  const { tokens, tokenOf, collectionName, modeName } = buildTokens(meta);
  const byId = new Map<string, any>();
  const index = (n: any) => { byId.set(n.id, n); for (const c of n.children ?? []) index(c); };
  index(file.document);
  const ctx: Ctx = {
    options, file, byId, tokenOf, collectionName, modeName,
    components: {}, styles: {}, assets: { images: {}, svgs: {}, fonts: [] },
    svgKeys: new Map(), fonts: new Map(),
  };

  const pages: IRPage[] = [];
  for (const page of (file.document as any).children ?? []) {
    if (page.type !== "CANVAS") continue;
    const list: IRScreen[] = [];
    screens(ctx, page, page.children ?? [], [], list, nodeModes(ctx, page));
    pages.push({
      id: page.id,
      name: page.name,
      background: hex(page.backgroundColor),
      screens: list,
      flows: (page.flowStartingPoints ?? []).map((f: any) => ({ name: f.name, screen: f.nodeId })),
    });
  }

  // Components used here but defined in a library.
  for (const [id, c] of Object.entries<any>(file.components ?? {})) {
    if (ctx.components[id] || byId.get(id)?.type === "COMPONENT") continue;
    if (c.componentSetId) {
      if (ctx.components[c.componentSetId] || byId.get(c.componentSetId)) continue;
      const set = (file.componentSets as any)?.[c.componentSetId];
      ctx.components[c.componentSetId] = { id: c.componentSetId, name: set?.name ?? "", kind: "set", remote: true };
    } else {
      ctx.components[id] = { id, name: c.name, kind: "component", remote: true };
      if (c.description) ctx.components[id].description = c.description;
    }
  }

  ctx.assets.fonts = [...ctx.fonts.values()].sort((a, b) => b.nodes - a.nodes);
  return { version: 1, name: file.name ?? "", pages, components: ctx.components, tokens, styles: ctx.styles, assets: ctx.assets };
}

/** The design IR of a parsed .fig file: `toDesignIR` over its REST view, with geometry, variables and images. */
export function designFromFig(doc: FigDocument, options: Omit<ToDesignIROptions, "variables" | "images" | "textLines"> = {}): DesignIR {
  const textLines = new Map<string, TextLine[]>();
  return toDesignIR(toRestDocument(doc, { geometry: true, textLines }), {
    ...options,
    textLines,
    variables: toRestVariables(doc),
    images: doc.images,
  });
}
