import type * as Rest from "@figma/rest-api-spec";
import type { FigNode } from "../types.js";
import { guidString, paints, variableAlias, type ColorResolver } from "./paint.js";

/** CSS-style weights for the style names Figma's font picker uses. */
const WEIGHTS: [RegExp, number][] = [
  [/hairline|thin/i, 100],
  [/extra\s*light|ultra\s*light/i, 200],
  [/semi\s*bold|demi\s*bold/i, 600],
  [/extra\s*bold|ultra\s*bold/i, 800],
  [/black|heavy/i, 900],
  [/light/i, 300],
  [/medium/i, 500],
  [/bold/i, 700],
];

function weightFromStyle(style: string | undefined): number {
  for (const [re, w] of WEIGHTS) if (re.test(style ?? "")) return w;
  return 400;
}

/**
 * Properties a text style sets. A TEXT node, or a run of one, that uses a
 * style shows the style's current values for these — not the copies cached on
 * the node, which go stale when the style changes.
 */
const STYLE_FIELDS = [
  "fontName", "fontSize", "lineHeight", "letterSpacing", "paragraphSpacing", "paragraphIndent",
  "listSpacing", "textCase", "textDecoration", "hangingPunctuation", "leadingTrim",
  "fontVariations",
] as const;

/** Looks up the style node a `styleIdFor*` reference names. */
export type StyleLookup = (ref: any) => FigNode | undefined;

function withTextStyle(src: any, lookup: StyleLookup | undefined): any {
  const style: any = src?.styleIdForText ? lookup?.(src.styleIdForText) : undefined;
  if (!style) return src;
  const out = { ...src };
  for (const k of STYLE_FIELDS) if (style[k] !== undefined) out[k] = style[k];
  // Kiwi leaves default values out: a style without a case or decoration sets
  // the original case and none, whatever the node's cached copy says.
  if (style.textCase === undefined) out.textCase = "ORIGINAL";
  if (style.textDecoration === undefined) out.textDecoration = "NONE";
  // The style's own font metrics, for line heights relative to the font.
  out.styleFontMetaData = style.derivedTextData?.fontMetaData;
  return out;
}

function fontMeta(node: any, fontName: any): any {
  const lists: any[][] = [
    node.styleFontMetaData ?? [],
    node.derivedTextData?.fontMetaData ?? [],
    node.textData?.fontMetaData ?? [],
  ];
  for (const list of lists) {
    const hit = list.find((m) => m?.key?.family === fontName?.family && m?.key?.style === fontName?.style);
    if (hit) return hit;
  }
  return undefined;
}

function hyperlink(link: any): Rest.Hyperlink | undefined {
  if (link?.url) return { type: "URL", url: link.url };
  if (link?.guid) return { type: "NODE", nodeID: guidString(link.guid) };
  return undefined;
}

const LINE_TYPES: Record<string, "NONE" | "ORDERED" | "UNORDERED"> = {
  ORDERED_LIST: "ORDERED",
  UNORDERED_LIST: "UNORDERED",
};

const VARIABLE_FIELDS: Record<string, string> = {
  FONT_FAMILY: "fontFamily",
  FONT_SIZE: "fontSize",
  FONT_STYLE: "fontStyle",
  FONT_WEIGHT: "fontWeight",
  LETTER_SPACING: "letterSpacing",
  LINE_HEIGHT: "lineHeight",
  PARAGRAPH_SPACING: "paragraphSpacing",
  PARAGRAPH_INDENT: "paragraphIndent",
};

/**
 * The REST field and alias of one `variableConsumptionMap` entry of text, if
 * it binds one. A bound font style holds the weight variable (`asFloat`) or
 * a style name variable (`asString`).
 */
export function textBinding(e: any): [string, Rest.VariableAlias] | undefined {
  const field = VARIABLE_FIELDS[e?.variableField];
  if (!field) return undefined;
  const data = e.variableData;
  if (data?.dataType === "FONT_STYLE") {
    const v = data.value?.fontStyleValue;
    const weight = variableAlias(v?.asFloat);
    if (weight) return ["fontWeight", weight];
    const style = variableAlias(v?.asString);
    return style ? ["fontStyle", style] : undefined;
  }
  const alias = variableAlias(data);
  return alias ? [field, alias] : undefined;
}

/**
 * The REST `TypeStyle` of `src` — a TEXT node, or one entry of its
 * `styleOverrideTable` when `base` is the node it overrides. An override only
 * lists the fields it sets, as REST does.
 */
function typeStyle(rawSrc: any, base: any, lookup: StyleLookup | undefined, resolve: ColorResolver | undefined): Rest.TypeStyle {
  const full = !base;
  const src = withTextStyle(rawSrc, lookup);
  const merged = full ? src : { ...base, ...src };
  const out: any = {};
  const has = (k: string) => full || k in src;

  if (has("fontName")) {
    const f = merged.fontName ?? { family: "", style: "", postscript: "" };
    const meta = fontMeta(merged, f);
    out.fontFamily = f.family;
    // Observed: REST reports no PostScript name for Inter Regular, Figma's
    // default font, and none when the file has none.
    out.fontPostScriptName = f.postscript && !(f.family === "Inter" && f.style === "Regular") ? f.postscript : null;
    out.fontStyle = f.style;
    out.fontWeight = meta?.fontWeight ?? weightFromStyle(f.style);
    if (/italic|oblique/i.test(f.style)) out.italic = true;
  }
  if (has("paragraphSpacing") && merged.paragraphSpacing) out.paragraphSpacing = merged.paragraphSpacing;
  if (has("paragraphIndent") && merged.paragraphIndent) out.paragraphIndent = merged.paragraphIndent;
  if (has("listSpacing") && merged.listSpacing) out.listSpacing = merged.listSpacing;
  if (has("hangingPunctuation") && merged.hangingPunctuation) out.hangingPunctuation = true;
  if (full) {
    const resize = merged.textAutoResize ?? "NONE";
    if (resize !== "NONE") out.textAutoResize = resize;
    else if (merged.textTruncation === "ENDING") out.textAutoResize = "TRUNCATE";
  }
  if (has("textDecoration") && merged.textDecoration && merged.textDecoration !== "NONE") out.textDecoration = merged.textDecoration;
  if (has("textCase") && merged.textCase && merged.textCase !== "ORIGINAL") out.textCase = merged.textCase;
  // Every run of a truncated text reports the truncation too.
  if (merged.textTruncation === "ENDING") out.textTruncation = "ENDING";
  if (full && merged.maxLines) out.maxLines = merged.maxLines;
  if (has("fontSize")) out.fontSize = merged.fontSize ?? 12;
  if (full) {
    out.textAlignHorizontal = merged.textAlignHorizontal ?? "LEFT";
    out.textAlignVertical = merged.textAlignVertical ?? "TOP";
  }
  if (has("letterSpacing")) {
    const ls = merged.letterSpacing;
    out.letterSpacing = !ls ? 0 : ls.units === "PERCENT" ? (ls.value * (merged.fontSize ?? 12)) / 100 : ls.value;
  }
  if (has("hyperlink")) {
    const link = hyperlink(merged.hyperlink);
    if (link) out.hyperlink = link;
  }
  if (has("lineHeight")) Object.assign(out, lineHeight(merged));
  if (has("leadingTrim") && merged.leadingTrim && merged.leadingTrim !== "NONE") out.leadingTrim = merged.leadingTrim;
  if (!full && "fillPaints" in src) out.fills = paints(src.fillPaints, resolve);

  const bound: any = {};
  for (const e of src.variableConsumptionMap?.entries ?? []) {
    const b = textBinding(e);
    if (b) bound[b[0]] = b[1];
  }
  if (Object.keys(bound).length) out.boundVariables = bound;
  return out;
}

/**
 * kiwi line heights: PIXELS; PERCENT, of the font's own line height (100% is
 * "Auto"); RAW, a multiple of the font size. A node without one is "Auto".
 */
function lineHeight(style: any): Partial<Rest.TypeStyle> {
  const fontSize = style.fontSize ?? 12;
  const lh = style.lineHeight ?? { value: 100, units: "PERCENT" };
  const intrinsic = fontMeta(style, style.fontName)?.fontLineHeight;
  const ofIntrinsic = (px: number) => (intrinsic ? (px / (fontSize * intrinsic)) * 100 : 100);
  if (lh.units === "PIXELS") {
    return {
      lineHeightPx: lh.value,
      lineHeightPercent: ofIntrinsic(lh.value),
      lineHeightPercentFontSize: (lh.value / fontSize) * 100,
      lineHeightUnit: "PIXELS",
    };
  }
  if (lh.units === "RAW") {
    const px = lh.value * fontSize;
    return {
      lineHeightPx: px,
      lineHeightPercent: ofIntrinsic(px),
      lineHeightPercentFontSize: lh.value * 100,
      lineHeightUnit: "FONT_SIZE_%",
    };
  }
  return {
    lineHeightPx: (lh.value / 100) * fontSize * (intrinsic ?? 1.2),
    lineHeightPercent: lh.value,
    lineHeightUnit: "INTRINSIC_%",
  };
}

/** The TEXT-specific REST fields of a node. */
export function textFields(node: any, lookup?: StyleLookup, resolve?: ColorResolver): Partial<Rest.TextNode> {
  const data = node.textData ?? {};
  const characters: string = data.characters ?? "";
  const ids: number[] = data.characterStyleIDs ?? [];
  // REST drops trailing runs of the base style.
  let end = ids.length;
  while (end > 0 && !ids[end - 1]) end--;
  const table: Record<string, Rest.TypeStyle> = {};
  const base = withTextStyle(node, lookup);
  for (const entry of data.styleOverrideTable ?? []) {
    if (entry?.styleID === undefined) continue;
    const { styleID, ...fields } = entry;
    table[String(styleID)] = typeStyle(fields, base, lookup, resolve);
  }
  const lines: any[] = data.lines ?? [];
  return {
    characters,
    characterStyleOverrides: ids.slice(0, end),
    styleOverrideTable: table,
    lineTypes: lines.map((l) => LINE_TYPES[l?.lineType] ?? "NONE"),
    lineIndentations: lines.map((l) => l?.indentationLevel ?? 0),
    style: typeStyle(node, undefined, lookup, resolve),
    // REST reports the text layout version from 3 on.
    ...(node.textUserLayoutVersion >= 3 ? { layoutVersion: node.textUserLayoutVersion } : {}),
  } as Partial<Rest.TextNode>;
}
