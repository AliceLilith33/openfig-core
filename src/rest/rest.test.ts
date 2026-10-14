import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { nodeId, parseFig, resolveTree, toRestDocument, toRestVariables, walkResolved } from "../index.js";
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

  it("binds the variables of the paints a style shows, not those of the node's cached paints", () => {
    const alias = (localID: number) => ({ dataType: "ALIAS", value: { alias: { guid: G(localID) } } });
    const solid = (colorVar?: object) => [{ type: "SOLID", color: { r: 0, g: 0, b: 1, a: 1 }, ...(colorVar ? { colorVar } : {}) }];
    const doc = docOf([
      { id: 50, parent: 100, type: "RECTANGLE", styleType: "FILL", name: "Plain", fillPaints: solid() } as any,
      { id: 51, parent: 100, type: "RECTANGLE", styleType: "FILL", name: "Bound", fillPaints: solid(alias(61)) } as any,
      // Auto Layout Playground 2412:2036: Figma lists no binding for such a frame.
      { id: 1, parent: 100, type: "FRAME", fillPaints: solid(alias(60)), styleIdForFill: { guid: G(50) } } as any,
      { id: 2, parent: 100, type: "RECTANGLE", fillPaints: solid(), styleIdForFill: { guid: G(51) }, strokePaints: solid(alias(60)), styleIdForStrokeFill: { guid: G(51) } } as any,
    ]);
    const rest = index(toRestDocument(doc).document);
    const v = (localID: number) => ({ type: "VARIABLE_ALIAS", id: `VariableID:1:${localID}` });
    expect(rest.get("1:1").boundVariables).toBeUndefined();
    expect(rest.get("1:2").boundVariables).toEqual({ fills: [v(61)], strokes: [v(61)] });
  });

  it("reads the text style of older files from inheritTextStyleID", () => {
    // Figma lays the text out at the style's 16px; the node still caches 35px.
    const doc = docOf([
      { id: 51, parent: 100, type: "TEXT", styleType: "TEXT", name: "Base", fontSize: 16, lineHeight: { value: 1.6, units: "RAW" }, fontName: { family: "Open Sans", style: "Regular", postscript: "" } } as any,
      {
        id: 1, parent: 100, type: "TEXT", textData: { characters: "x" }, fontSize: 35, lineHeight: { value: 100, units: "PERCENT" },
        fontName: { family: "Open Sans", style: "Regular", postscript: "" }, inheritTextStyleID: G(51),
      } as any,
    ]);
    const text = index(toRestDocument(doc).document).get("1:1");
    expect(text.style).toMatchObject({ fontSize: 16, lineHeightPx: 25.6, lineHeightUnit: "FONT_SIZE_%" });
    expect(text.styles).toEqual({ text: "1:51" });
  });

  it("reads the fill, stroke and effect styles of older files from their inherit fields", () => {
    const red = [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 }, opacity: 1, visible: true }];
    const blue = [{ type: "SOLID", color: { r: 0, g: 0, b: 1, a: 1 }, opacity: 1, visible: true }];
    const shadow = [{ type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.5 }, offset: { x: 0, y: 2 }, radius: 4, visible: true }];
    const doc = docOf([
      { id: 51, parent: 100, type: "RECTANGLE", styleType: "FILL", name: "Red", fillPaints: red } as any,
      { id: 52, parent: 100, type: "RECTANGLE", styleType: "EFFECT", name: "Shadow", effects: shadow } as any,
      { id: 53, parent: 100, type: "VECTOR", name: "not a style", fillPaints: red } as any,
      {
        id: 1, parent: 100, type: "RECTANGLE", fillPaints: blue, strokePaints: blue,
        inheritFillStyleID: G(51), inheritFillStyleIDForStroke: G(51), inheritEffectStyleID: G(52),
      } as any,
      { id: 2, parent: 100, type: "RECTANGLE", fillPaints: blue, inheritFillStyleID: G(53) } as any,
    ]);
    const rest = index(toRestDocument(doc).document);
    const rect = rest.get("1:1");
    expect(rect.fills[0].color).toMatchObject({ r: 1, g: 0, b: 0 });
    expect(rect.strokes[0].color).toMatchObject({ r: 1, g: 0, b: 0 });
    expect(rect.effects[0]).toMatchObject({ type: "DROP_SHADOW", radius: 4 });
    expect(rect.styles).toEqual({ fill: "1:51", stroke: "1:51", effect: "1:52" });
    // A field naming a node that is not a style is ignored.
    expect(rest.get("1:2").fills[0].color).toMatchObject({ r: 0, g: 0, b: 1 });
    expect(rest.get("1:2").styles).toBeUndefined();
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
      { trigger: { type: "ON_HOVER" }, actions: [{ type: "NODE", destinationId: "1:2", navigation: "CHANGE_TO", transition: { type: "SMART_ANIMATE", duration: 200, easing: { type: "EASE_OUT" } } }] },
      { trigger: { type: "ON_CLICK" }, actions: [{ type: "NODE", destinationId: "1:2", navigation: "OVERLAY", transition: { type: "MOVE_IN", direction: "LEFT", duration: 300, easing: { type: "LINEAR" } } }] },
      { trigger: { type: "AFTER_TIMEOUT", timeout: 2000 }, actions: [{ type: "URL", url: "https://example.com", openInNewTab: true }] },
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

  it("replaces the NaN geometry Figma stores for a group of hidden layers", () => {
    const rest = index(toRestDocument(docOf([
      { id: 1, parent: 100, type: "FRAME", resizeToFit: true, frameMaskDisabled: false, size: { x: NaN, y: NaN }, transform: { m00: 1, m01: 0, m02: 10, m10: 0, m11: 1, m12: 20 } },
      { id: 2, parent: 1, type: "ROUNDED_RECTANGLE", visible: false, size: { x: 30, y: 40 }, transform: { m00: 1, m01: 0, m02: 5, m10: 0, m11: 1, m12: 5 } },
      { id: 3, parent: 100, type: "BOOLEAN_OPERATION", size: { x: NaN, y: NaN }, transform: { m00: NaN, m01: NaN, m02: NaN, m10: NaN, m11: NaN, m12: NaN } },
    ] as any)).document);
    expect(rest.get("1:1")).toMatchObject({ size: { x: 35, y: 45 }, absoluteBoundingBox: { x: 10, y: 20, width: 35, height: 45 } });
    expect(rest.get("1:3")).toMatchObject({ size: { x: 0, y: 0 }, relativeTransform: [[1, 0, 0], [0, 1, 0]] });
    expect(JSON.stringify(rest.get("1:3"))).not.toContain("null,");
  });

  it("sizes a child that both hugs and stretches by its content, and absolute text by its box", () => {
    const rest = index(toRestDocument(docOf([
      { id: 1, parent: 100, type: "FRAME", stackMode: "VERTICAL", stackPrimarySizing: "FIXED", size: { x: 300, y: 200 } },
      // Its own row hugs; the stretch is stale and Figma sizes it to its content.
      { id: 2, parent: 1, type: "FRAME", stackMode: "HORIZONTAL", stackChildAlignSelf: "STRETCH", stackCounterSizing: "RESIZE_TO_FIT_WITH_IMPLICIT_SIZE" },
      { id: 3, parent: 1, type: "FRAME", stackMode: "HORIZONTAL", stackPrimarySizing: "FIXED", stackChildAlignSelf: "STRETCH" },
      { id: 4, parent: 1, type: "TEXT", stackPositioning: "ABSOLUTE", textAutoResize: "HEIGHT", textData: { characters: "x" } },
    ] as any)).document);
    expect(rest.get("1:2")).toMatchObject({ layoutAlign: "STRETCH", layoutSizingHorizontal: "HUG" });
    expect(rest.get("1:3")).toMatchObject({ layoutSizingHorizontal: "FILL" });
    expect(rest.get("1:4")).toMatchObject({ layoutPositioning: "ABSOLUTE", layoutSizingHorizontal: "FIXED", layoutSizingVertical: "FIXED" });
  });

  it("gives grids, scrolling and explicit variable modes", () => {
    const track = (localID: number, type: string, value = 1) => ({ id: G(localID), trackSize: { minSizing: { type, value }, maxSizing: { type, value } } });
    const rest = index(toRestDocument(docOf([
      { id: 50, parent: 100, type: "VARIABLE_SET", name: "Theme", variableSetModes: [{ id: G(51), name: "Light", sortPosition: "a" }, { id: G(52), name: "Dark", sortPosition: "b" }] },
      {
        id: 1, parent: 100, type: "FRAME", stackMode: "GRID", gridRowGap: 4, gridColumnGap: 8, scrollDirection: "VERTICAL",
        variableModeBySetMap: { entries: [{ variableSetID: { guid: G(50) }, variableModeID: G(52) }] },
        gridRows: { entries: [{ id: G(60), position: "a" }] },
        gridColumns: { entries: [{ id: G(71), position: "b" }, { id: G(70), position: "a" }] },
        gridRowsSizing: { entries: [track(60, "HUG")] },
        gridColumnsSizing: { entries: [track(70, "FIXED", 120), { id: G(71), trackSize: { minSizing: { type: "FIXED", value: 40 }, maxSizing: { type: "FLEX", value: 1 } } }] },
      },
      { id: 2, parent: 1, type: "ROUNDED_RECTANGLE", gridRowAnchor: G(60), gridColumnAnchor: G(71), gridChildHorizontalAlign: "CENTER" },
    ] as any)).document);
    expect(rest.get("1:1")).toMatchObject({
      layoutMode: "GRID", gridRowCount: 1, gridColumnCount: 2, gridRowGap: 4, gridColumnGap: 8,
      gridRowsSizing: "auto", gridColumnsSizing: "120px minmax(40px, 1fr)",
      overflowDirection: "VERTICAL_SCROLLING",
      explicitVariableModes: { "VariableCollectionId:1:50": "1:52" },
    });
    expect(rest.get("1:2")).toMatchObject({ gridRowAnchorIndex: 0, gridColumnAnchorIndex: 1, gridRowSpan: 1, gridColumnSpan: 1, gridChildHorizontalAlign: "CENTER", gridChildVerticalAlign: "AUTO" });
  });

  it("names a variant's layers' properties by the set's definitions", () => {
    const rest = index(toRestDocument(docOf([
      { id: 1, parent: 100, type: "FRAME", isStateGroup: true, componentPropDefs: [{ id: G(90), name: "Label", type: "TEXT", initialValue: { textValue: { characters: "OK" } } }] },
      // Each variant carries a stub naming the set's definition.
      { id: 2, parent: 1, type: "SYMBOL", name: "State=Default", componentPropDefs: [{ id: G(91), parentPropDefId: G(90) }] },
      { id: 3, parent: 2, type: "TEXT", textData: { characters: "OK" }, componentPropRefs: [{ defID: G(91), componentPropNodeField: "TEXT_DATA" }] },
    ] as any)).document);
    expect(rest.get("1:3").componentPropertyReferences).toEqual({ characters: "Label#1:90" });
  });

  it("converts variables to the local variables response", () => {
    const doc = docOf([
      { id: 50, parent: 100, type: "VARIABLE_SET", name: "Theme", isPublishable: true, variableSetModes: [{ id: G(51), name: "Light", sortPosition: "a" }, { id: G(52), name: "Dark", sortPosition: "b" }] },
      {
        id: 60, parent: 100, type: "VARIABLE", name: "bg", variableSetID: { guid: G(50) }, variableResolvedType: "COLOR", isPublishable: false,
        variableScopes: ["FRAME_FILL", "STROKE"], codeSyntax: { entries: [{ platform: "WEB", value: "--bg" }] },
        variableDataValues: { entries: [
          { modeID: G(51), variableData: { dataType: "COLOR", resolvedDataType: "COLOR", value: { colorValue: { r: 1, g: 1, b: 1, a: 1 } } } },
          { modeID: G(52), variableData: { dataType: "ALIAS", resolvedDataType: "COLOR", value: { alias: { guid: G(61) } } } },
        ] },
      },
      { id: 61, parent: 100, type: "VARIABLE", name: "gap", key: "k61", version: "3:4", sourceLibraryKey: "lib", variableSetID: { guid: G(50) }, variableResolvedType: "FLOAT", isSoftDeleted: true, variableDataValues: { entries: [{ modeID: G(51), variableData: { dataType: "FLOAT", value: { floatValue: 8 } } }] } },
    ] as any);
    const { meta } = toRestVariables(doc);
    expect(meta.variableCollections["VariableCollectionId:1:50"]).toEqual({
      id: "VariableCollectionId:1:50", name: "Theme", key: "", modes: [{ modeId: "1:51", name: "Light" }, { modeId: "1:52", name: "Dark" }],
      defaultModeId: "1:51", remote: false, hiddenFromPublishing: false, variableIds: ["VariableID:1:60", "VariableID:k61/3:4"],
    });
    expect(meta.variables["VariableID:1:60"]).toEqual({
      id: "VariableID:1:60", name: "bg", key: "", variableCollectionId: "VariableCollectionId:1:50", resolvedType: "COLOR",
      valuesByMode: { "1:51": { r: 1, g: 1, b: 1, a: 1 }, "1:52": { type: "VARIABLE_ALIAS", id: "VariableID:1:61" } },
      remote: false, description: "", hiddenFromPublishing: true, scopes: ["FRAME_FILL", "STROKE_COLOR"], codeSyntax: { WEB: "--bg" },
    });
    // A library variable is identified by key and version, as references to it are.
    expect(meta.variables["VariableID:k61/3:4"]).toMatchObject({ remote: true, deletedButReferenced: true, valuesByMode: { "1:51": 8 }, scopes: ["ALL_SCOPES"] });
  });

  it("leaves out a deleted collection and marks its variables deleted", () => {
    const { meta } = toRestVariables(docOf([
      { id: 50, parent: 100, type: "VARIABLE_SET", name: "Old", isSoftDeleted: true, variableSetModes: [{ id: G(51), name: "Mode 1", sortPosition: "a" }] },
      { id: 60, parent: 100, type: "VARIABLE", name: "gap", variableSetID: { guid: G(50) }, variableResolvedType: "FLOAT", variableDataValues: { entries: [{ modeID: G(51), variableData: { dataType: "FLOAT", value: { floatValue: 4 } } }] } },
      { id: 70, parent: 100, type: "VARIABLE_SET", name: "Live", variableSetModes: [{ id: G(71), name: "Mode 1", sortPosition: "a" }] },
      { id: 80, parent: 100, type: "VARIABLE", name: "pad", variableSetID: { guid: G(70) }, variableResolvedType: "FLOAT", variableDataValues: { entries: [{ modeID: G(71), variableData: { dataType: "FLOAT", value: { floatValue: 8 } } }] } },
    ] as any));
    expect(Object.keys(meta.variableCollections)).toEqual(["VariableCollectionId:1:70"]);
    expect(meta.variables["VariableID:1:60"]).toMatchObject({ variableCollectionId: "VariableCollectionId:1:50", deletedButReferenced: true });
    expect(meta.variables["VariableID:1:80"]).not.toHaveProperty("deletedButReferenced");
  });

  it("shows a text style's variable bindings on the text that uses it", () => {
    const alias = (localID: number) => ({ dataType: "ALIAS", value: { alias: { guid: G(localID) } } });
    const fontStyle = (value: object) => ({ dataType: "FONT_STYLE", value: { fontStyleValue: value } });
    const textStyle = (id: number, entries: any[]) => ({
      id, parent: 100, type: "TEXT", styleType: "TEXT", name: `Style ${id}`, fontSize: 16, fontName: { family: "Inter", style: "Regular", postscript: "" },
      variableConsumptionMap: { entries },
    });
    const text = (id: number, style: number, extra: object = {}) => ({
      id, parent: 100, type: "TEXT", textData: { characters: "x" }, fontSize: 16, fontName: { family: "Inter", style: "Regular", postscript: "" },
      styleIdForText: { guid: G(style) }, ...extra,
    });
    const rest = index(toRestDocument(docOf([
      textStyle(50, [
        { variableField: "FONT_SIZE", variableData: alias(60) },
        { variableField: "FONT_FAMILY", variableData: alias(61) },
        // A numeric font style variable is the weight.
        { variableField: "FONT_STYLE", variableData: fontStyle({ asFloat: alias(62) }) },
      ]),
      textStyle(51, [{ variableField: "FONT_STYLE", variableData: fontStyle({ asString: alias(63) }) }]),
      text(1, 50),
      text(2, 51),
      // The node's own binding wins over its style's.
      text(3, 50, { variableConsumptionMap: { entries: [{ variableField: "FONT_SIZE", variableData: alias(64) }] } }),
      text(4, 51, { variableConsumptionMap: { entries: [{ variableField: "FONT_STYLE", variableData: fontStyle({ asFloat: alias(65) }) }] } }),
    ] as any)).document);
    const v = (localID: number) => ({ type: "VARIABLE_ALIAS", id: `VariableID:1:${localID}` });
    expect(rest.get("1:1").boundVariables).toEqual({ fontSize: [v(60)], fontFamily: [v(61)], fontWeight: [v(62)] });
    expect(rest.get("1:2").boundVariables).toEqual({ fontStyle: [v(63)] });
    expect(rest.get("1:3").boundVariables).toEqual({ fontSize: [v(64)], fontFamily: [v(61)], fontWeight: [v(62)] });
    // The node's own font style binding, in its type style too.
    expect(rest.get("1:4").boundVariables).toEqual({ fontWeight: [v(65)], fontStyle: [v(63)] });
    expect(rest.get("1:4").style.boundVariables).toEqual({ fontWeight: v(65) });
  });

  it("sets the original case and no decoration when a text style leaves them out", () => {
    const font = { fontSize: 16, fontName: { family: "Inter", style: "Regular", postscript: "" } };
    const rest = index(toRestDocument(docOf([
      { id: 50, parent: 100, type: "TEXT", styleType: "TEXT", name: "Plain", ...font },
      { id: 51, parent: 100, type: "TEXT", styleType: "TEXT", name: "Caps", textCase: "UPPER", textDecoration: "UNDERLINE", ...font },
      // The node's cached copy still says upper case and underline.
      { id: 1, parent: 100, type: "TEXT", textData: { characters: "x" }, textCase: "UPPER", textDecoration: "UNDERLINE", styleIdForText: { guid: G(50) }, ...font },
      { id: 2, parent: 100, type: "TEXT", textData: { characters: "x" }, styleIdForText: { guid: G(51) }, ...font },
      { id: 3, parent: 100, type: "TEXT", textData: { characters: "x" }, textCase: "UPPER", ...font },
    ] as any)).document);
    expect(rest.get("1:1").style).not.toHaveProperty("textCase");
    expect(rest.get("1:1").style).not.toHaveProperty("textDecoration");
    expect(rest.get("1:2").style).toMatchObject({ textCase: "UPPER", textDecoration: "UNDERLINE" });
    // Without a style the node's own value stands.
    expect(rest.get("1:3").style).toMatchObject({ textCase: "UPPER" });
  });

  it("keeps explicit variable modes on a section", () => {
    const rest = index(toRestDocument(docOf([
      { id: 50, parent: 100, type: "VARIABLE_SET", name: "Theme", variableSetModes: [{ id: G(51), name: "Light", sortPosition: "a" }, { id: G(52), name: "Dark", sortPosition: "b" }] },
      { id: 1, parent: 100, type: "SECTION", variableModeBySetMap: { entries: [{ variableSetID: { guid: G(50) }, variableModeID: G(52) }] } },
    ] as any)).document);
    expect(rest.get("1:1")).toMatchObject({ type: "SECTION", explicitVariableModes: { "VariableCollectionId:1:50": "1:52" } });
  });

  it("outlines strokes only when one shows", () => {
    // A blob for the path M 0 0 L 10 0 Z.
    const blob = new Uint8Array(1 + 8 + 1 + 8 + 1);
    const view = new DataView(blob.buffer);
    blob[0] = 1;
    blob[9] = 2;
    view.setFloat32(10, 10, true);
    const red = { type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } };
    const doc = docOf([
      { id: 1, parent: 100, type: "ROUNDED_RECTANGLE", strokePaints: [red], strokeGeometry: [{ commandsBlob: 0 }] },
      { id: 2, parent: 100, type: "ROUNDED_RECTANGLE", strokePaints: [{ ...red, visible: false }], strokeGeometry: [{ commandsBlob: 0 }] },
      { id: 3, parent: 100, type: "ROUNDED_RECTANGLE", strokeGeometry: [{ commandsBlob: 0 }] },
    ] as any);
    (doc as any).message.blobs.push(blob);
    const rest = index(toRestDocument(doc, { geometry: true }).document);
    expect(rest.get("1:1").strokeGeometry).toHaveLength(1);
    expect(rest.get("1:2").strokeGeometry).toEqual([]);
    expect(rest.get("1:3").strokeGeometry).toEqual([]);
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
