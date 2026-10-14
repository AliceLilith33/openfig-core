import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { nodeId, parseFig, resolveTree, toRestDocument, walkResolved } from "../index.js";
import type { FigDocument, FigGuid, FigNode } from "../index.js";

const G = (localID: number): FigGuid => ({ sessionID: 1, localID });
const K = (localID: number): FigGuid => ({ sessionID: 9, localID }); // override keys
const key = (g: FigGuid) => `${g.sessionID}:${g.localID}`;

/** A document under DOCUMENT 0 / CANVAS 100 from nodes that name their parent by localID. */
function docOf(nodes: Array<Partial<FigNode> & { id: number; parent?: number }>): FigDocument {
  const all = [
    { id: 0, type: "DOCUMENT", name: "Document" },
    { id: 100, parent: 0, type: "CANVAS", name: "Page 1" },
    ...nodes,
  ];
  const built: FigNode[] = all.map(({ id, parent, ...rest }, i) => ({
    name: `n${id}`,
    type: "FRAME",
    ...rest,
    guid: G(id),
    ...(parent !== undefined ? { parentIndex: { guid: G(parent), position: String.fromCharCode(0x21 + i) } } : {}),
  }) as FigNode);
  const nodeMap = new Map(built.map((n) => [nodeId(n)!, n]));
  const childrenMap = new Map<string, FigNode[]>();
  for (const n of built) {
    if (!n.parentIndex) continue;
    const pid = key(n.parentIndex.guid);
    childrenMap.set(pid, [...(childrenMap.get(pid) ?? []), n]);
  }
  return { nodes: built, nodeMap, childrenMap, images: new Map(), message: { blobs: [] } } as unknown as FigDocument;
}

function index(root: any): Map<string, any> {
  const out = new Map<string, any>();
  const walk = (n: any) => { out.set(n.id, n); (n.children ?? []).forEach(walk); };
  walk(root);
  return out;
}

const override = (path: FigGuid[], fields: Record<string, any>) => ({ guidPath: { guids: path }, ...fields });

describe("toRestDocument", () => {
  it("maps types and fills in what kiwi leaves out as defaults", () => {
    const doc = docOf([
      { id: 1, parent: 100, type: "FRAME", size: { x: 200, y: 100 }, stackMode: "VERTICAL", stackSpacing: 8 },
      { id: 2, parent: 1, type: "ROUNDED_RECTANGLE", size: { x: 50, y: 20 }, stackChildAlignSelf: "STRETCH" },
      { id: 3, parent: 100, type: "FRAME", resizeToFit: true, frameMaskDisabled: false, size: { x: 10, y: 10 } },
    ]);
    const rest = index(toRestDocument(doc).document);
    const frame = rest.get("1:1");
    expect(frame).toMatchObject({
      type: "FRAME", layoutMode: "VERTICAL", itemSpacing: 8, layoutWrap: "NO_WRAP",
      counterAxisSizingMode: "FIXED", clipsContent: true,
      // No stackPrimarySizing: the frame hugs its content.
      layoutSizingVertical: "HUG", layoutSizingHorizontal: "FIXED",
      constraints: { horizontal: "LEFT", vertical: "TOP" },
    });
    expect(frame).not.toHaveProperty("primaryAxisSizingMode");
    expect(rest.get("1:2")).toMatchObject({ type: "RECTANGLE", layoutAlign: "STRETCH", layoutGrow: 0, layoutSizingHorizontal: "FILL" });
    expect(rest.get("1:3")).toMatchObject({ type: "GROUP", clipsContent: false });
  });

  it("reads line heights in kiwi's three units", () => {
    const meta = { derivedTextData: { fontMetaData: [{ key: { family: "Inter", style: "Regular" }, fontLineHeight: 1.25, fontWeight: 400 }] } };
    const text = (id: number, lineHeight?: any) => ({
      id, parent: 100, type: "TEXT", fontSize: 20, fontName: { family: "Inter", style: "Regular", postscript: "Inter-Regular" },
      textData: { characters: "Hi" }, ...(lineHeight ? { lineHeight } : {}), ...meta,
    });
    const rest = index(toRestDocument(docOf([
      text(1), text(2, { value: 30, units: "PIXELS" }), text(3, { value: 1.5, units: "RAW" }), text(4, { value: 120, units: "PERCENT" }),
    ])).document);
    // No line height is "Auto": 100% of the font's own line height.
    expect(rest.get("1:1").style).toMatchObject({ lineHeightUnit: "INTRINSIC_%", lineHeightPercent: 100, lineHeightPx: 25 });
    expect(rest.get("1:2").style).toMatchObject({ lineHeightUnit: "PIXELS", lineHeightPx: 30, lineHeightPercentFontSize: 150, lineHeightPercent: 120 });
    expect(rest.get("1:3").style).toMatchObject({ lineHeightUnit: "FONT_SIZE_%", lineHeightPx: 30, lineHeightPercentFontSize: 150 });
    expect(rest.get("1:4").style).toMatchObject({ lineHeightUnit: "INTRINSIC_%", lineHeightPercent: 120, lineHeightPx: 30 });
    expect(rest.get("1:4").style).not.toHaveProperty("lineHeightPercentFontSize");
  });

  it("shows the current value of a fill style and a text style, not the copy cached on the node", () => {
    const doc = docOf([
      { id: 50, parent: 100, type: "ROUNDED_RECTANGLE", styleType: "FILL", name: "Brand", fillPaints: [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } }] } as any,
      { id: 51, parent: 100, type: "TEXT", styleType: "TEXT", name: "Body", fontSize: 16, fontName: { family: "Inter", style: "Bold", postscript: "Inter-Bold" } } as any,
      {
        id: 1, parent: 100, type: "TEXT", textData: { characters: "x" }, fontSize: 12, fontName: { family: "Inter", style: "Regular", postscript: "" },
        styleIdForFill: { guid: G(50) }, styleIdForText: { guid: G(51) },
        fillPaints: [{ type: "SOLID", color: { r: 0, g: 0, b: 1, a: 1 } }],
      } as any,
    ]);
    const file = toRestDocument(doc);
    const text = index(file.document).get("1:1");
    expect(text.fills[0].color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    expect(text.style).toMatchObject({ fontSize: 16, fontStyle: "Bold", fontPostScriptName: "Inter-Bold", fontWeight: 700 });
    expect(text.styles).toEqual({ fill: "1:50", text: "1:51" });
    expect(Object.keys(file.styles).sort()).toEqual(["1:50", "1:51"]);
  });

  it("expands instances with REST's sublayer ids and lists overrides per instance", () => {
    // Card (symbol 10): title TEXT (key K1) and a nested Badge instance (key K2)
    // of symbol 20, whose label TEXT has key K3.
    const doc = docOf([
      { id: 10, parent: 100, type: "SYMBOL", name: "Card", overrideKey: K(10) },
      { id: 11, parent: 10, type: "TEXT", name: "title", overrideKey: K(1), textData: { characters: "Title" } },
      { id: 12, parent: 10, type: "INSTANCE", name: "badge", overrideKey: K(2), symbolData: { symbolID: G(20), symbolOverrides: [override([K(3)], { name: "own" })] } },
      { id: 20, parent: 100, type: "SYMBOL", name: "Badge", overrideKey: K(20) },
      { id: 21, parent: 20, type: "TEXT", name: "label", overrideKey: K(3), textData: { characters: "New" } },
      {
        id: 1, parent: 100, type: "INSTANCE", name: "card", symbolData: { symbolID: G(10), symbolOverrides: [
          override([K(10)], { name: "Hero" }),
          override([K(1)], { textData: { characters: "Hello" } }),
          override([K(2), K(3)], { fillPaints: [] }),
        ] },
      },
    ]);
    const rest = index(toRestDocument(doc).document);
    expect(rest.get("I1:1;9:1").characters).toBe("Hello");
    expect(rest.get("I1:1;9:2;9:3")).toBeDefined();
    expect(rest.get("1:1").overrides).toEqual([
      { id: "1:1", overriddenFields: ["name"] },
      { id: "I1:1;9:1", overriddenFields: ["characterStyleOverrides", "characters", "lineIndentations", "lineTypes", "styleOverrideTable"] },
      { id: "I1:1;9:2;9:3", overriddenFields: ["fills"] },
    ]);
    // The nested instance lists what the outer instance changes inside it, not
    // the overrides it carries in its component.
    expect(rest.get("I1:1;9:2").overrides).toEqual([{ id: "I1:1;9:2;9:3", overriddenFields: ["fills"] }]);
  });

  it("maps prototype interactions", () => {
    const rest = index(toRestDocument(docOf([
      { id: 2, parent: 100, type: "FRAME" },
      {
        id: 1, parent: 100, type: "FRAME", prototypeInteractions: [
          { event: { interactionType: "ON_HOVER" }, actions: [{ connectionType: "INTERNAL_NODE", navigationType: "SWAP_STATE", transitionNodeID: G(2), transitionType: "SMART_ANIMATE", transitionDuration: 0.2, easingType: "OUT_CUBIC" }] },
          { event: { interactionType: "ON_CLICK" }, actions: [{ connectionType: "INTERNAL_NODE", navigationType: "OVERLAY", transitionNodeID: G(2), transitionType: "MOVE_FROM_RIGHT", transitionDuration: 0.3, easingType: "LINEAR" }] },
          { event: { interactionType: "AFTER_TIMEOUT", transitionTimeout: 2 }, actions: [{ connectionType: "URL", connectionURL: "https://example.com" }] },
        ],
      } as any,
    ])).document);
    expect(rest.get("1:1").interactions).toEqual([
      { trigger: { type: "ON_HOVER" }, actions: [{ type: "NODE", destinationId: "1:2", navigation: "CHANGE_TO", transition: { type: "SMART_ANIMATE", duration: 0.2, easing: { type: "EASE_OUT" } } }] },
      { trigger: { type: "ON_CLICK" }, actions: [{ type: "NODE", destinationId: "1:2", navigation: "OVERLAY", transition: { type: "MOVE_IN", direction: "LEFT", duration: 0.3, easing: { type: "LINEAR" } } }] },
      { trigger: { type: "AFTER_TIMEOUT", timeout: 2 }, actions: [{ type: "URL", url: "https://example.com", openInNewTab: true }] },
    ]);
  });

  it("gives corners as one radius when they agree and as four when they differ", () => {
    const rest = index(toRestDocument(docOf([
      { id: 1, parent: 100, type: "ROUNDED_RECTANGLE", cornerRadius: 8 },
      { id: 2, parent: 100, type: "ROUNDED_RECTANGLE", rectangleCornerRadiiIndependent: true, rectangleTopLeftCornerRadius: 4, rectangleTopRightCornerRadius: 4, rectangleBottomRightCornerRadius: 4, rectangleBottomLeftCornerRadius: 4 },
      { id: 3, parent: 100, type: "ROUNDED_RECTANGLE", rectangleCornerRadiiIndependent: true, rectangleTopRightCornerRadius: 1, rectangleBottomRightCornerRadius: 1 },
      { id: 4, parent: 100, type: "ELLIPSE", cornerRadius: 3 },
    ] as any)).document);
    expect(rest.get("1:1")).toMatchObject({ cornerRadius: 8, cornerSmoothing: 0 });
    expect(rest.get("1:2")).toMatchObject({ cornerRadius: 4 });
    expect(rest.get("1:3")).toMatchObject({ rectangleCornerRadii: [0, 1, 1, 0] });
    expect(rest.get("1:3")).not.toHaveProperty("cornerRadius");
    expect(rest.get("1:4")).not.toHaveProperty("cornerRadius");
  });

  it("converts a reference file, giving every resolved node one REST node", () => {
    const doc = parseFig(new Uint8Array(readFileSync(join(__dirname, "..", "..", "test-fixtures", "instances", "medium-complex.fig"))));
    const rest = index(toRestDocument(doc).document);
    const root = doc.nodes.find((n) => n.type === "DOCUMENT")!;
    let resolved = 0;
    walkResolved(resolveTree(doc, root), (r) => {
      if (!(r.node as any).internalOnly) resolved++;
      return (r.node as any).internalOnly ? false : undefined;
    });
    expect(rest.size).toBe(resolved);
    for (const n of rest.values()) expect(typeof n.id === "string" && typeof n.type === "string").toBe(true);
  });
});

// Optional: field-by-field comparison with REST responses for the same files.
// Point OPENFIG_REST_PAIRS at a folder of `<name>.fig` + `<name>/document.json`
// pairs (see docs/rest.md); skipped otherwise.
const pairsDir = process.env.OPENFIG_REST_PAIRS;
describe.runIf(pairsDir && existsSync(pairsDir))("toRestDocument against REST responses", () => {
  // Fields REST derives from data not in the file (library keys) or from
  // rendering (render bounds), and the undocumented vectorNetwork.
  const SKIP = new Set(["absoluteRenderBounds", "vectorNetwork"]);
  it("matches at least 99.7% of fields", () => {
    let ok = 0;
    let all = 0;
    for (const f of readdirSync(pairsDir!).filter((f) => f.endsWith(".fig"))) {
      const name = f.slice(0, -4);
      const truthPath = join(pairsDir!, name, "document.json");
      if (!existsSync(truthPath)) continue;
      const truth = JSON.parse(readFileSync(truthPath, "utf8"));
      const ours = index(toRestDocument(parseFig(new Uint8Array(readFileSync(join(pairsDir!, f)))), { geometry: true }).document);
      const walk = (t: any) => {
        const o = ours.get(t.id);
        for (const k of Object.keys(t)) {
          if (k === "children" || SKIP.has(k)) continue;
          all++;
          if (o && k in o && same(t[k], o[k], k)) ok++;
        }
        (t.children ?? []).forEach(walk);
      };
      walk(truth.document);
    }
    expect(all).toBeGreaterThan(0);
    expect(ok / all).toBeGreaterThan(0.997);
  });
});

const numbers = (s: string) => (s.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number);

/** Equal up to float noise: numbers within 0.1%, SVG path coordinates within 0.01. */
function same(a: any, b: any, key: string): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= 1e-3 * Math.max(1, Math.abs(a), Math.abs(b));
  if (typeof a === "string" && typeof b === "string" && key === "path") {
    const x = numbers(a);
    const y = numbers(b);
    return x.length === y.length && x.every((v, i) => Math.abs(v - y[i]) <= 0.01 * Math.max(1, Math.abs(v)));
  }
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => k in b && same(a[k], b[k], k));
}
