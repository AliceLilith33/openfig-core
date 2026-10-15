import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { parseFig, screenIR, toDesignIR, toRestDocument, toRestVariables } from "../index.js";
import type { DesignIR, IRNode, RestFile, RestVariables } from "../index.js";

const IDENTITY = [[1, 0, 0], [0, 1, 0]];
const at = (x: number, y: number) => [[1, 0, x], [0, 1, y]];
const solid = (r: number, g: number, b: number, extra: object = {}) => ({ type: "SOLID", blendMode: "NORMAL", color: { r, g, b, a: 1 }, ...extra });

/** A REST node with the fields every node has. */
function node(id: string, type: string, extra: Record<string, unknown> = {}): any {
  return {
    id, name: `n${id}`, type, blendMode: "PASS_THROUGH", fills: [], strokes: [], strokeWeight: 1, strokeAlign: "INSIDE",
    effects: [], interactions: [], relativeTransform: IDENTITY, size: { x: 100, y: 100 },
    constraints: { horizontal: "LEFT", vertical: "TOP" }, ...extra,
  };
}

function file(children: any[], extra: Partial<RestFile> = {}): RestFile {
  return {
    name: "Test",
    schemaVersion: 0,
    components: {},
    componentSets: {},
    styles: {},
    document: { id: "0:0", name: "Document", type: "DOCUMENT", children: [
      { id: "0:1", name: "Page 1", type: "CANVAS", backgroundColor: { r: 0.9, g: 0.9, b: 0.9, a: 1 }, flowStartingPoints: [], children },
    ] },
    ...extra,
  } as unknown as RestFile;
}

function index(ir: DesignIR): Map<string, IRNode> {
  const out = new Map<string, IRNode>();
  const walk = (n: IRNode) => { out.set(n.id, n); n.children?.forEach(walk); };
  for (const p of ir.pages) for (const s of p.screens) walk(s.root);
  for (const c of Object.values(ir.components)) if (c.root) walk(c.root);
  return out;
}

describe("toDesignIR", () => {
  it("describes auto layout as flex, and how children size and sit in it", () => {
    const ir = toDesignIR(file([
      node("1:1", "FRAME", {
        relativeTransform: at(40, 60), size: { x: 320, y: 200 }, clipsContent: true,
        layoutMode: "HORIZONTAL", itemSpacing: 8, primaryAxisAlignItems: "SPACE_BETWEEN", counterAxisAlignItems: "CENTER",
        paddingLeft: 16, paddingRight: 16, paddingTop: 12, paddingBottom: 12, layoutWrap: "NO_WRAP",
        children: [
          node("1:2", "RECTANGLE", { layoutSizingHorizontal: "FILL", layoutSizingVertical: "FIXED", relativeTransform: at(16, 12) }),
          node("1:3", "RECTANGLE", { layoutPositioning: "ABSOLUTE", constraints: { horizontal: "RIGHT", vertical: "TOP_BOTTOM" } }),
        ],
      }),
      node("1:4", "FRAME", { children: [node("1:5", "ELLIPSE", { constraints: { horizontal: "CENTER", vertical: "SCALE" } })] }),
    ]));
    const n = index(ir);
    expect(ir.pages[0]).toMatchObject({ name: "Page 1", background: "#e6e6e6" });
    expect(ir.pages[0].screens.map((s) => s.id)).toEqual(["1:1", "1:4"]);
    expect(n.get("1:1")).toMatchObject({
      type: "frame", x: 40, y: 60, width: 320, height: 200, clip: true,
      layout: { type: "flex", direction: "row", justify: "space-between", align: "center", padding: { top: 12, right: 16, bottom: 12, left: 16 } },
    });
    // With space-between the gap is automatic.
    expect(n.get("1:1")!.layout).not.toHaveProperty("gap");
    expect(n.get("1:2")).toMatchObject({ x: 16, y: 12, sizing: { horizontal: "fill" } });
    expect(n.get("1:2")).not.toHaveProperty("constraints");
    expect(n.get("1:3")).toMatchObject({ absolute: true, constraints: { horizontal: "end", vertical: "both" } });
    expect(n.get("1:5")).toMatchObject({ constraints: { horizontal: "center", vertical: "scale" } });
  });

  it("keeps a rotated or flipped node's box and gives its transform", () => {
    const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
    const ir = toDesignIR(file([
      node("1:1", "RECTANGLE", { relativeTransform: [[c, -s, 10], [s, c, 20]], size: { x: 50, y: 30 } }),
      node("1:2", "RECTANGLE", { relativeTransform: [[-1, 0, 100], [0, 1, 0]] }),
    ]));
    const n = index(ir);
    expect(n.get("1:1")).toMatchObject({ x: 10, y: 20, width: 50, height: 30, rotation: 30 });
    expect(n.get("1:1")!.transform!.map((v) => Math.round(v * 1000) / 1000)).toEqual([0.866, 0.5, -0.5, 0.866]);
    expect(n.get("1:2")).toMatchObject({ transform: [-1, 0, 0, 1] });
    expect(n.get("1:2")).not.toHaveProperty("rotation");
    // Where each shows: the transformed box's bounds in the parent.
    expect(n.get("1:1")!.bounds).toEqual({ x: -5, y: 20, width: 58.301, height: 50.981 });
    expect(n.get("1:2")!.bounds).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it("turns gradients into CSS for the node's box", () => {
    const stops = [{ color: { r: 1, g: 0, b: 0, a: 1 }, position: 0 }, { color: { r: 0, g: 0, b: 1, a: 1 }, position: 1 }];
    const grad = (handles: number[][]) => ({
      type: "GRADIENT_LINEAR", blendMode: "NORMAL", gradientStops: stops,
      gradientHandlePositions: handles.map(([x, y]) => ({ x, y })),
    });
    const ir = toDesignIR(file([
      node("1:1", "RECTANGLE", { fills: [grad([[0, 0.5], [1, 0.5], [0, 1]])] }),
      node("1:2", "RECTANGLE", { fills: [grad([[0.5, 0], [0.5, 1], [0, 0]])] }),
      // Corner to corner of a 200 × 100 box: CSS's "to bottom right" angle, 0% and 100% at the corners.
      node("1:3", "RECTANGLE", { size: { x: 200, y: 100 }, fills: [grad([[0, 0], [1, 1], [0, 1]])] }),
      node("1:4", "RECTANGLE", { fills: [{ ...grad([[0.5, 0.5], [1, 0.5], [0.5, 1]]), type: "GRADIENT_RADIAL", opacity: 0.5 }] }),
    ]));
    const n = index(ir);
    expect((n.get("1:1")!.fills![0] as any).css).toBe("linear-gradient(90deg, #ff0000 0%, #0000ff 100%)");
    expect((n.get("1:2")!.fills![0] as any).css).toBe("linear-gradient(180deg, #ff0000 0%, #0000ff 100%)");
    expect((n.get("1:3")!.fills![0] as any).css).toBe("linear-gradient(116.57deg, #ff0000 0%, #0000ff 100%)");
    expect(n.get("1:4")!.fills![0]).toMatchObject({
      type: "radial", css: "radial-gradient(50px 50px at 50% 50%, rgba(255, 0, 0, 0.502) 0%, rgba(0, 0, 255, 0.502) 100%)",
      stops: [{ color: "#ff000080", position: 0 }, { color: "#0000ff80", position: 1 }],
    });
  });

  it("splits text into runs that list only what differs from the base style", () => {
    const style = {
      fontFamily: "Inter", fontPostScriptName: null, fontStyle: "Regular", fontWeight: 400, fontSize: 16,
      textAlignHorizontal: "CENTER", textAlignVertical: "TOP", letterSpacing: 0, lineHeightPx: 19.36,
      lineHeightPercent: 100, lineHeightUnit: "INTRINSIC_%", textAutoResize: "HEIGHT",
    };
    const ir = toDesignIR(file([
      node("1:1", "TEXT", {
        fills: [solid(0, 0, 0)], characters: "Hello bold\nitem",
        characterStyleOverrides: [0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 2, 2, 2, 2],
        styleOverrideTable: {
          // REST repeats the base font size in an override.
          1: { fontFamily: "Inter", fontStyle: "Bold", fontWeight: 700, fontSize: 16, fills: [solid(0, 0, 0)] },
          2: { fills: [solid(1, 0, 0)], hyperlink: { type: "URL", url: "https://example.com" } },
        },
        lineTypes: ["NONE", "UNORDERED"], lineIndentations: [0, 1], style,
      }),
    ]));
    const t = index(ir).get("1:1")!;
    expect(t.text).toEqual({
      content: "Hello bold\nitem",
      style: { fontFamily: "Inter", fontStyle: "Regular", fontWeight: 400, fontSize: 16, lineHeight: 19.36, lineHeightAuto: true, textAlign: "center" },
      runs: [
        { text: "Hello " },
        { text: "bold", style: { fontStyle: "Bold", fontWeight: 700 } },
        { text: "\n" },
        { text: "item", fills: [{ type: "solid", color: "#ff0000" }], link: "https://example.com" },
      ],
      lines: [{}, { list: "unordered", indent: 1 }],
      autoResize: "height",
    });
    expect(t.sizing).toEqual({ vertical: "hug" });
    expect(ir.assets.fonts.map((f) => `${f.family} ${f.style}`)).toEqual(["Inter Regular", "Inter Bold"]);
  });

  it("numbers an ordered item that restarts the count from the file's list start", () => {
    const style = { fontFamily: "Inter", fontStyle: "Regular", fontWeight: 400, fontSize: 16, lineHeightPx: 19.36, lineHeightUnit: "PIXELS" };
    const ir = toDesignIR(file([
      node("1:1", "TEXT", { characters: "four\nfive", lineTypes: ["ORDERED", "ORDERED"], lineIndentations: [1, 1], style }),
    ]), { listStarts: new Map([["1:1", [3, 0]]]) });
    expect(index(ir).get("1:1")!.text!.lines).toEqual([{ list: "ordered", indent: 1, start: 4 }, { list: "ordered", indent: 1 }]);
  });

  it("counts an emoji outside the BMP as one character when splitting runs", () => {
    const ir = toDesignIR(file([
      node("1:1", "TEXT", {
        characters: "😀 ok", characterStyleOverrides: [0, 0, 1, 1],
        styleOverrideTable: { 1: { fontStyle: "Bold", fontWeight: 700 } },
        style: { fontFamily: "Inter", fontStyle: "Regular", fontWeight: 400, fontSize: 12, lineHeightPx: 14 },
      }),
    ]));
    expect(index(ir).get("1:1")!.text!.runs).toEqual([{ text: "😀 " }, { text: "ok", style: { fontStyle: "Bold", fontWeight: 700 } }]);
  });

  it("names tokens, keeps local names plain, and reads modes and bindings", () => {
    const meta: RestVariables["meta"] = {
      variableCollections: {
        "VariableCollectionId:1:1": { id: "VariableCollectionId:1:1", name: "Theme", key: "", modes: [{ modeId: "1:0", name: "Light" }, { modeId: "1:1", name: "Dark" }], defaultModeId: "1:0", remote: false, hiddenFromPublishing: false, variableIds: [] },
        "VariableCollectionId:abc/1:2": { id: "VariableCollectionId:abc/1:2", name: "Theme", key: "abc", modes: [{ modeId: "2:0", name: "Default" }], defaultModeId: "2:0", remote: true, hiddenFromPublishing: false, variableIds: [] },
      },
      variables: {
        "VariableID:9:1": { id: "VariableID:9:1", name: "bg", key: "k1", variableCollectionId: "VariableCollectionId:1:1", resolvedType: "COLOR", valuesByMode: { "1:0": { r: 1, g: 1, b: 1, a: 1 }, "1:1": { type: "VARIABLE_ALIAS", id: "VariableID:9:2" } }, remote: false, description: "", hiddenFromPublishing: false, scopes: ["FRAME_FILL"], codeSyntax: { WEB: "var(--surface)" } },
        "VariableID:9:2": { id: "VariableID:9:2", name: "black", key: "k2", variableCollectionId: "VariableCollectionId:1:1", resolvedType: "COLOR", valuesByMode: { "1:0": { r: 0, g: 0, b: 0, a: 1 }, "1:1": { r: 0, g: 0, b: 0, a: 1 } }, remote: false, description: "", hiddenFromPublishing: false, scopes: ["ALL_SCOPES"], codeSyntax: {} },
        "VariableID:k3/5:5": { id: "VariableID:k3/5:5", name: "bg", key: "k3", variableCollectionId: "VariableCollectionId:abc/1:2", resolvedType: "FLOAT", valuesByMode: { "2:0": 8 }, remote: true, description: "", hiddenFromPublishing: false, scopes: ["ALL_SCOPES"], codeSyntax: {} },
      },
    };
    const ir = toDesignIR(file([
      node("1:1", "FRAME", {
        explicitVariableModes: { "VariableCollectionId:1:1": "1:1" },
        fills: [solid(0, 0, 0, { boundVariables: { color: { type: "VARIABLE_ALIAS", id: "VariableID:9:1" } } })],
        layoutMode: "VERTICAL", itemSpacing: 8,
        // A library variable is found by key whatever version the reference names.
        boundVariables: { itemSpacing: { type: "VARIABLE_ALIAS", id: "VariableID:k3/7:7" } },
      }),
    ]), { variables: meta });
    expect(Object.keys(ir.tokens.tokens)).toEqual(["bg", "black", "Theme/bg"]);
    expect(ir.tokens.tokens.bg).toMatchObject({ css: "--surface", collection: "Theme", type: "color", values: { Light: "#ffffff", Dark: { token: "black" } }, scopes: ["FRAME_FILL"] });
    expect(ir.tokens.tokens["Theme/bg"]).toMatchObject({ css: "--theme-bg", values: { Default: 8 } });
    expect(ir.tokens.collections.map((c) => [c.name, c.modes, c.defaultMode])).toEqual([["Theme", ["Light", "Dark"], "Light"], ["Theme", ["Default"], "Default"]]);
    const f = index(ir).get("1:1")!;
    expect(f.fills).toEqual([{ type: "solid", color: "#000000", token: "bg" }]);
    expect(f.tokens).toEqual({ gap: "Theme/bg" });
    expect(f.modes).toEqual({ Theme: "Dark" });
  });

  it("names deleted variables after local and library ones", () => {
    const variable = (id: string, collection: string, extra: object = {}) => ({
      id, name: "bg", key: "", variableCollectionId: collection, resolvedType: "FLOAT", valuesByMode: {}, remote: false,
      description: "", hiddenFromPublishing: false, scopes: ["ALL_SCOPES"], codeSyntax: {}, ...extra,
    });
    const meta = {
      variableCollections: {
        "VariableCollectionId:1:1": { id: "VariableCollectionId:1:1", name: "Theme", key: "", modes: [{ modeId: "1:0", name: "Mode 1" }], defaultModeId: "1:0", remote: false, hiddenFromPublishing: false, variableIds: [] },
        "VariableCollectionId:abc/1:2": { id: "VariableCollectionId:abc/1:2", name: "Lib", key: "abc", modes: [{ modeId: "2:0", name: "Mode 1" }], defaultModeId: "2:0", remote: true, hiddenFromPublishing: false, variableIds: [] },
      },
      // Listed deleted first; its collection is left out of the response.
      variables: {
        "VariableID:9:3": variable("VariableID:9:3", "VariableCollectionId:1:9", { deletedButReferenced: true }),
        "VariableID:k2/5:5": variable("VariableID:k2/5:5", "VariableCollectionId:abc/1:2", { key: "k2", remote: true }),
        "VariableID:9:1": variable("VariableID:9:1", "VariableCollectionId:1:1"),
      },
    } as unknown as RestVariables["meta"];
    const ir = toDesignIR(file([]), { variables: meta });
    expect(Object.keys(ir.tokens.tokens).sort()).toEqual(["?/bg", "Lib/bg", "bg"]);
    expect(ir.tokens.tokens.bg).toMatchObject({ collection: "Theme" });
    expect(ir.tokens.tokens["Lib/bg"]).toMatchObject({ collection: "Lib" });
  });

  it("applies modes set on a page or a section to the screens inside it", () => {
    const meta = {
      variableCollections: {
        "VariableCollectionId:1:1": { id: "VariableCollectionId:1:1", name: "Theme", key: "", modes: [{ modeId: "1:0", name: "Light" }, { modeId: "1:1", name: "Dark" }], defaultModeId: "1:0", remote: false, hiddenFromPublishing: false, variableIds: [] },
        "VariableCollectionId:1:2": { id: "VariableCollectionId:1:2", name: "Density", key: "", modes: [{ modeId: "2:0", name: "Compact" }, { modeId: "2:1", name: "Comfy" }], defaultModeId: "2:0", remote: false, hiddenFromPublishing: false, variableIds: [] },
      },
      variables: {},
    } as unknown as RestVariables["meta"];
    const f = file([
      node("1:1", "SECTION", {
        explicitVariableModes: { "VariableCollectionId:1:2": "2:1" },
        children: [
          node("1:2", "FRAME"),
          // The screen's own mode wins.
          node("1:3", "FRAME", { explicitVariableModes: { "VariableCollectionId:1:1": "1:0" } }),
        ],
      }),
      node("1:4", "FRAME"),
    ]);
    (f.document.children[0] as any).explicitVariableModes = { "VariableCollectionId:1:1": "1:1", "VariableCollectionId:1:2": "2:0" };
    const n = index(toDesignIR(f, { variables: meta }));
    expect(n.get("1:2")!.modes).toEqual({ Theme: "Dark", Density: "Comfy" });
    expect(n.get("1:3")!.modes).toEqual({ Theme: "Light", Density: "Comfy" });
    expect(n.get("1:4")!.modes).toEqual({ Theme: "Dark", Density: "Compact" });
  });

  it("carries vertical trim into the text style", () => {
    const style = (leadingTrim: string) => ({ fontFamily: "Inter", fontStyle: "Regular", fontWeight: 400, fontSize: 12, lineHeightPx: 14, leadingTrim });
    const n = index(toDesignIR(file([
      node("1:1", "TEXT", { characters: "x", style: style("CAP_HEIGHT") }),
      node("1:2", "TEXT", { characters: "x", style: style("NONE") }),
    ])));
    expect(n.get("1:1")!.text!.style).toMatchObject({ leadingTrim: "cap" });
    expect(n.get("1:2")!.text!.style).not.toHaveProperty("leadingTrim");
  });

  it("gives runs of Auto text in another font or size their own line height", () => {
    const style = (lineHeightUnit: string) => ({ fontFamily: "Inter", fontStyle: "Regular", fontWeight: 400, fontSize: 20, lineHeightPx: 24.2, lineHeightPercent: 100, lineHeightUnit });
    const text = (id: string, unit: string) => node(id, "TEXT", {
      characters: "abc", style: style(unit), characterStyleOverrides: [0, 1, 2],
      styleOverrideTable: { 1: { fontSize: 30 }, 2: { fontFamily: "Poppins" } },
    });
    const runLineHeights = new Map<string, Record<string, number>>([["1:1", { 1: 36.3, 2: 30 }], ["1:2", { 1: 36.3 }]]);
    const n = index(toDesignIR(file([text("1:1", "INTRINSIC_%"), text("1:2", "PIXELS")]), { runLineHeights }));
    expect(n.get("1:1")!.text!.runs!.map((r) => r.style)).toEqual([undefined, { fontSize: 30, lineHeight: 36.3 }, { fontFamily: "Poppins", lineHeight: 30 }]);
    // A fixed line height holds for every run.
    expect(n.get("1:2")!.text!.runs![1].style).toEqual({ fontSize: 30 });
  });

  it("gives Figma's lines of a text from the file", () => {
    const doc = parseFig(new Uint8Array(readFileSync(join(__dirname, "..", "..", "test-fixtures", "instances", "medium-complex.fig"))));
    const textLines = new Map();
    const n = index(toDesignIR(toRestDocument(doc, { textLines }), { textLines }));
    // Widths to thousandths (Figma rounds a hair over a whole pixel up), and each line's baseline.
    expect(n.get("1:93")!.text!.measuredLines).toEqual([{ start: 0, width: 208.43, baseline: 24.108 }, { start: 20, width: 268.875, baseline: 57.108 }]);
    // Without the file's layout (from the REST API) there are none.
    expect(index(toDesignIR(toRestDocument(doc))).get("1:93")!.text).not.toHaveProperty("measuredLines");
  });

  it("describes components, variants, their states and instances", () => {
    const hover = (to: string, trigger = "ON_HOVER") => [{ trigger: { type: trigger }, actions: [{ type: "NODE", destinationId: to, navigation: "CHANGE_TO", transition: { type: "SMART_ANIMATE", duration: 200, easing: { type: "EASE_OUT" } } }] }];
    const ir = toDesignIR(file([
      node("2:1", "COMPONENT_SET", {
        name: "Button",
        componentPropertyDefinitions: {
          State: { type: "VARIANT", defaultValue: "Default", variantOptions: ["Default", "Hover"] },
          "Label#3:4": { type: "TEXT", defaultValue: "OK" },
        },
        children: [
          node("2:2", "COMPONENT", { name: "State=Default", interactions: hover("2:3"), children: [node("2:4", "TEXT", { componentPropertyReferences: { characters: "Label#3:4" } })] }),
          node("2:3", "COMPONENT", { name: "State=Hover", interactions: hover("2:2", "MOUSE_LEAVE") }),
        ],
      }),
      node("1:1", "INSTANCE", {
        componentId: "2:3",
        componentProperties: { "Label#3:4": { type: "TEXT", value: "Go" }, State: { type: "VARIANT", value: "Hover" } },
        overrides: [{ id: "1:1", overriddenFields: ["name"] }, { id: "I1:1;2:4", overriddenFields: ["characters", "fontSize"] }],
      }),
      node("1:2", "INSTANCE", { componentId: "7:7" }),
    ], {
      components: {
        "2:2": { key: "", name: "State=Default", description: "", remote: false, componentSetId: "2:1", documentationLinks: [] },
        "2:3": { key: "", name: "State=Hover", description: "", remote: false, componentSetId: "2:1", documentationLinks: [] },
        "7:7": { key: "x", name: "Avatar", description: "A person", remote: true, documentationLinks: [] },
      } as any,
      componentSets: { "2:1": { key: "", name: "Button", description: "Buttons", documentationLinks: [] } } as any,
    }));
    expect(ir.pages[0].screens.map((s) => s.id)).toEqual(["1:1", "1:2"]);
    expect(ir.components["2:1"]).toMatchObject({
      kind: "set", name: "Button", description: "Buttons", page: "0:1",
      props: { State: { type: "variant", default: "Default", options: ["Default", "Hover"] }, Label: { type: "text", default: "OK" } },
      variants: [{ id: "2:2", values: { State: "Default" } }, { id: "2:3", values: { State: "Hover" } }],
      states: { "2:2": { hover: "2:3" } },
    });
    expect(index(ir).get("2:4")!.propRefs).toEqual({ characters: "Label" });
    expect(index(ir).get("1:1")!.component).toEqual({
      id: "2:3", name: "State=Hover", set: "2:1", variant: { State: "Hover" }, props: { Label: "Go" },
      overrides: [{ id: "I1:1;2:4", fields: ["characters", "textStyle"] }],
    });
    expect(ir.components["7:7"]).toEqual({ id: "7:7", name: "Avatar", kind: "component", remote: true, description: "A person" });
    expect(index(ir).get("2:2")!.interactions).toEqual([{
      trigger: "hover", actions: [{ type: "change-to", target: "2:3", targetName: "State=Hover", transition: { type: "smart-animate", duration: 200, easing: "ease-out" } }],
    }]);
  });

  it("marks clickable nodes, repeated instances and the variants that are states", () => {
    const change = (trigger: string, to: string) => [{ trigger: { type: trigger }, actions: [{ type: "NODE", destinationId: to, navigation: "CHANGE_TO" }] }];
    const text = (id: string, characters: string) => node(id, "TEXT", { name: "Label", characters, style: {} });
    const item = (id: string, variant: string, label: string) => node(id, "INSTANCE", {
      componentId: variant === "Default" ? "2:2" : "2:3",
      componentProperties: { State: { type: "VARIANT", value: variant } },
      children: [text(`I${id};2:4`, label)],
    });
    const ir = toDesignIR(file([
      node("2:1", "COMPONENT_SET", {
        name: "Nav button",
        componentPropertyDefinitions: { State: { type: "VARIANT", defaultValue: "Default", variantOptions: ["Default", "Hovered", "Disabled", "Active"] } },
        children: [
          node("2:2", "COMPONENT", { name: "State=Default", interactions: change("ON_HOVER", "2:3"), children: [text("2:4", "Item")] }),
          node("2:3", "COMPONENT", { name: "State=Hovered", interactions: change("ON_CLICK", "2:5") }),
          node("2:5", "COMPONENT", { name: "State=Disabled" }),
          node("2:6", "COMPONENT", { name: "State=Active" }),
        ],
      }),
      node("2:9", "COMPONENT", { name: "Button Group" }),
      node("1:1", "FRAME", { layoutMode: "VERTICAL", children: [
        item("1:2", "Default", "Home"),
        item("1:3", "Hovered", "About"),
        item("1:4", "Default", "Blog"),
        node("1:5", "TEXT", { characters: "Docs", style: { hyperlink: { type: "URL", url: "https://example.com" } } }),
        node("1:6", "INSTANCE", { componentId: "2:9" }),
        node("1:7", "INSTANCE", { componentId: "2:9" }),
        node("1:8", "INSTANCE", { componentId: "2:9", layoutPositioning: "ABSOLUTE" }),
        node("1:9", "RECTANGLE", { interactions: [{ trigger: { type: "ON_CLICK" }, actions: [{ type: "BACK" }] }] }),
      ] }),
      // Not laid out: no list is read from the order of its children.
      node("1:20", "FRAME", { children: [item("1:21", "Default", "A"), item("1:22", "Default", "B")] }),
    ], {
      components: {
        "2:2": { key: "", name: "State=Default", description: "", remote: false, componentSetId: "2:1", documentationLinks: [] },
        "2:3": { key: "", name: "State=Hovered", description: "", remote: false, componentSetId: "2:1", documentationLinks: [] },
        "2:9": { key: "", name: "Button Group", description: "", remote: false, documentationLinks: [] },
      } as any,
      componentSets: { "2:1": { key: "", name: "Nav button", description: "", documentationLinks: [] } } as any,
    }));
    const n = index(ir);
    expect(n.get("1:1")!.repeats).toEqual([
      { component: "2:1", name: "Nav button", items: ["1:2", "1:3", "1:4"], props: ["State"], texts: ["Label"] },
      { component: "2:9", name: "Button Group", items: ["1:6", "1:7"] },
    ]);
    expect(n.get("1:20")).not.toHaveProperty("repeats");
    // The name says button; the Hovered variant's definition has a click.
    expect(n.get("1:2")!.clickable).toEqual({ name: { word: "button", in: "Nav button" } });
    expect(n.get("1:3")!.clickable).toEqual({ component: true, name: { word: "button", in: "Nav button" } });
    expect(n.get("1:5")!.clickable).toEqual({ link: true });
    expect(n.get("1:6")).not.toHaveProperty("clickable");
    expect(n.get("1:9")!.clickable).toEqual({ interaction: true });
    expect(n.get("2:3")!.clickable).toEqual({ interaction: true });
    expect(ir.components["2:1"].stateProps).toEqual({
      State: {
        Default: { state: "default", variants: ["2:2"] },
        Hovered: { state: "hover", variants: ["2:3"], prototype: ["hover"] },
        Disabled: { state: "disabled", variants: ["2:5"], prototype: ["click"] },
        Active: { variants: ["2:6"] },
      },
    });
    // Kept in one screen's IR.
    const one = screenIR(ir, "1:1");
    expect(index(one).get("1:1")!.repeats).toHaveLength(2);
    expect(one.components["2:1"].stateProps).toBeDefined();
  });

  it("draws vector-only layers as shared SVG artwork", () => {
    const path = (d: string) => [{ path: d, windingRule: "NONZERO" }];
    const icon = (id: string, x: number) => node(id, "FRAME", {
      name: "Icon / Star", size: { x: 24, y: 24 }, relativeTransform: at(x, 0), clipsContent: false, fillGeometry: [], strokeGeometry: [],
      children: [node(`${id}0`, "VECTOR", {
        size: { x: 20, y: 20 }, relativeTransform: at(2, 2), fills: [solid(1, 0, 0)],
        fillGeometry: path("M0 0L20 0L20 20Z"), strokeGeometry: [],
      })],
    });
    const ir = toDesignIR(file([
      node("1:1", "FRAME", { layoutMode: "HORIZONTAL", fillGeometry: [], strokeGeometry: [], children: [icon("3:1", 0), icon("3:2", 30)] }),
    ]));
    const n = index(ir);
    expect(n.get("3:1")).toMatchObject({ type: "svg", asset: "icon-star", width: 24, height: 24 });
    expect(n.get("3:1")).not.toHaveProperty("children");
    expect(n.get("3:2")!.asset).toBe("icon-star");
    expect(Object.keys(ir.assets.svgs)).toEqual(["icon-star"]);
    expect(ir.assets.svgs["icon-star"].svg).toBe(
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" overflow="visible">` +
      `<g transform="translate(2 2)"><path d="M0 0L20 0L20 20Z" fill="#ff0000"/></g></svg>`,
    );
    // Auto layout is kept as layout, not drawn.
    expect(n.get("1:1")!.type).toBe("frame");
  });

  it("keeps the stroke of artwork where its parent's layout counts strokes", () => {
    const icon = (id: string) => node(id, "VECTOR", {
      name: "Icon", size: { x: 16, y: 16 }, strokes: [solid(0, 0, 0)], strokeWeight: 2, strokeAlign: "CENTER",
      fillGeometry: [], strokeGeometry: [{ path: "M0 0L16 0L16 16Z", windingRule: "NONZERO" }],
    });
    const n = index(toDesignIR(file([
      node("1:1", "FRAME", { layoutMode: "HORIZONTAL", strokesIncludedInLayout: true, fillGeometry: [], strokeGeometry: [], children: [icon("1:2")] }),
      node("2:1", "FRAME", { layoutMode: "HORIZONTAL", fillGeometry: [], strokeGeometry: [], children: [icon("2:2")] }),
    ])));
    // The artwork draws it; the stroke still takes space in the layout.
    expect(n.get("1:2")).toMatchObject({ type: "svg", stroke: { weight: 2, align: "center" } });
    expect(n.get("2:2")!.type).toBe("svg");
    expect(n.get("2:2")).not.toHaveProperty("stroke");
  });

  it("grows SVG artwork to take in paint outside the node's box", () => {
    const ir = toDesignIR(file([
      node("1:1", "FRAME", { children: [
        // A line of no height with an arrowhead past its end.
        node("1:2", "VECTOR", {
          name: "Arrow", size: { x: 20, y: 0 }, strokes: [solid(0, 0, 0)], fillGeometry: [],
          strokeGeometry: [{ path: "M22 0L15 -7L15 7Z M0 1L20 1L20 -1L0 -1Z", windingRule: "NONZERO" }],
        }),
        // A curve bulging past the box between its end points.
        node("1:3", "VECTOR", {
          name: "Bump", size: { x: 10, y: 10 }, fills: [solid(0, 0, 0)], strokeGeometry: [],
          fillGeometry: [{ path: "M0 10C0 -10 10 -10 10 10Z", windingRule: "NONZERO" }],
        }),
        node("1:4", "VECTOR", {
          name: "Square", size: { x: 10, y: 10 }, fills: [solid(0, 0, 0)], strokeGeometry: [],
          fillGeometry: [{ path: "M0 0L10 0L10 10L0 10Z", windingRule: "NONZERO" }],
        }),
      ] }),
    ]));
    expect(ir.assets.svgs.arrow.svg).toMatch(/^<svg [^>]*width="22" height="14" viewBox="0 -7 22 14"/);
    expect(ir.assets.svgs.arrow).toMatchObject({ width: 20, height: 0 });
    expect(ir.assets.svgs.bump.svg).toMatch(/viewBox="0 -5 10 15"/);
    expect(ir.assets.svgs.square.svg).toMatch(/width="10" height="10" viewBox="0 0 10 10"/);
  });

  it("keeps a shape filled with an image out of SVG artwork", () => {
    const ir = toDesignIR(file([
      node("1:1", "FRAME", { children: [
        node("1:2", "VECTOR", {
          fills: [{ type: "IMAGE", blendMode: "NORMAL", scaleMode: "FILL", imageRef: "abc" }],
          fillGeometry: [{ path: "M0 0L100 0L100 100L0 100Z", windingRule: "NONZERO" }], strokeGeometry: [],
        }),
      ] }),
    ]));
    expect(index(ir).get("1:2")).toMatchObject({ type: "vector", fills: [{ type: "image", image: "abc" }] });
    expect(index(ir).get("1:2")).not.toHaveProperty("asset");
    expect(ir.assets.svgs).toEqual({});
  });

  it("drops hidden layers unless a property can show them, and recognises images", () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47], 0);
    png.set([0, 0, 2, 0, 0, 0, 1, 0], 16);
    const ir = toDesignIR(file([
      node("1:1", "FRAME", { children: [
        node("1:2", "RECTANGLE", { visible: false }),
        node("1:3", "TEXT", { visible: false, componentPropertyReferences: { visible: "Show#1:9" }, characters: "x", style: {} }),
        node("1:4", "RECTANGLE", { fills: [{ type: "IMAGE", blendMode: "NORMAL", scaleMode: "FILL", imageRef: "abc" }] }),
      ] }),
    ]), { images: new Map([["abc", png]]) });
    const n = index(ir);
    expect(n.has("1:2")).toBe(false);
    expect(n.get("1:3")).toMatchObject({ visible: false, propRefs: { visible: "Show" } });
    expect(n.get("1:4")).toMatchObject({ type: "image", fills: [{ type: "image", image: "abc", fit: "cover" }] });
    expect(ir.assets.images).toEqual({ abc: { nodes: 1, mime: "image/png", width: 512, height: 256 } });
  });

  it("cuts the IR down to one screen and what it uses", () => {
    const collection = { id: "VariableCollectionId:1:1", name: "Theme", key: "", modes: [{ modeId: "1:0", name: "Light" }], defaultModeId: "1:0", remote: false, hiddenFromPublishing: false, variableIds: [] };
    const variable = (id: string, name: string, value: unknown) => ({
      id, name, key: "", variableCollectionId: collection.id, resolvedType: "COLOR", valuesByMode: { "1:0": value },
      remote: false, description: "", hiddenFromPublishing: false, scopes: ["ALL_SCOPES"], codeSyntax: {},
    });
    const meta = {
      variableCollections: { [collection.id]: collection, "VariableCollectionId:1:2": { ...collection, id: "VariableCollectionId:1:2", name: "Other" } },
      variables: {
        "VariableID:9:1": variable("VariableID:9:1", "bg", { type: "VARIABLE_ALIAS", id: "VariableID:9:2" }),
        "VariableID:9:2": variable("VariableID:9:2", "white", { r: 1, g: 1, b: 1, a: 1 }),
        "VariableID:9:3": variable("VariableID:9:3", "unused", { r: 0, g: 0, b: 0, a: 1 }),
      },
    } as unknown as RestVariables["meta"];
    const image = (ref: string) => ({ type: "IMAGE", blendMode: "NORMAL", scaleMode: "FILL", imageRef: ref });
    const text = (id: string, family: string) => node(id, "TEXT", { characters: "x", style: { fontFamily: family, fontStyle: "Regular", fontWeight: 400, fontSize: 12, lineHeightPx: 14 } });
    const ir = toDesignIR(file([
      node("2:1", "COMPONENT", { name: "Button", children: [text("2:2", "Inter")] }),
      node("2:5", "COMPONENT", { name: "Badge" }),
      node("1:1", "FRAME", { children: [
        node("1:2", "INSTANCE", { componentId: "2:1", children: [text("I1:2;2:2", "Inter")] }),
        node("1:3", "RECTANGLE", { fills: [image("abc")], styles: { fill: "5:1" } }),
        node("1:4", "RECTANGLE", { fills: [image("abc"), solid(1, 1, 1, { boundVariables: { color: { type: "VARIABLE_ALIAS", id: "VariableID:9:1" } } })] }),
      ] }),
      node("1:9", "FRAME", { children: [
        node("1:10", "INSTANCE", { componentId: "2:5" }),
        node("1:11", "RECTANGLE", { fills: [image("abc"), image("def")], styles: { fill: "5:2" } }),
        text("1:12", "Roboto"),
      ] }),
    ], { styles: { "5:1": { key: "", name: "Photo", styleType: "FILL", description: "" }, "5:2": { key: "", name: "Other", styleType: "FILL", description: "" } } as any }),
    { variables: meta });
    expect(ir.assets.images.abc.nodes).toBe(3);
    const one = screenIR(ir, "1:1");
    expect(one.pages[0].screens.map((s) => s.id)).toEqual(["1:1"]);
    expect(Object.keys(one.components)).toEqual(["2:1"]);
    expect(Object.keys(one.styles)).toEqual(["5:1"]);
    // The token used, and the one it aliases; only their collection.
    expect(Object.keys(one.tokens.tokens).sort()).toEqual(["bg", "white"]);
    expect(one.tokens.collections.map((c) => c.name)).toEqual(["Theme"]);
    // Counted in the screen and the Button definition: one Inter text each.
    expect(one.assets.images).toEqual({ abc: { nodes: 2 } });
    expect(one.assets.fonts).toEqual([{ family: "Inter", style: "Regular", weight: 400, nodes: 2 }]);
    // The whole IR is left as it was.
    expect(Object.keys(ir.components).sort()).toEqual(["2:1", "2:5"]);
    expect(index(one).get("1:3")).not.toHaveProperty("bounds");
  });

  it("can leave out the layers of plain instances", () => {
    const rest = file([
      node("2:1", "COMPONENT", { children: [node("2:2", "RECTANGLE")] }),
      node("1:1", "INSTANCE", { componentId: "2:1", overrides: [], children: [node("I1:1;2:2", "RECTANGLE")] }),
      node("1:2", "INSTANCE", { componentId: "2:1", overrides: [{ id: "I1:2;2:2", overriddenFields: ["fills"] }], children: [node("I1:2;2:2", "RECTANGLE")] }),
    ]);
    const n = index(toDesignIR(rest, { instances: "reference" }));
    expect(n.get("1:1")).not.toHaveProperty("children");
    expect(n.get("1:2")!.children).toHaveLength(1);
    expect(index(toDesignIR(rest)).get("1:1")!.children).toHaveLength(1);
  });
});

/**
 * The IR built from Figma's own REST JSON and from `toRestDocument` should be
 * the same. Runs when OPENFIG_REST_PAIRS names a folder of `<name>.fig` files
 * next to `<name>/document.json`.
 */
const pairs = process.env.OPENFIG_REST_PAIRS;
describe.skipIf(!pairs || !existsSync(pairs))("toDesignIR against REST archives", () => {
  const names = pairs && existsSync(pairs)
    ? readdirSync(pairs).filter((f) => f.endsWith(".fig") && existsSync(join(pairs, f.slice(0, -4), "document.json"))).map((f) => f.slice(0, -4))
    : [];
  for (const name of names) {
    it(`gives the same IR as Figma's REST JSON for ${name}`, () => {
      const doc = parseFig(new Uint8Array(readFileSync(join(pairs!, `${name}.fig`))));
      const truth = JSON.parse(readFileSync(join(pairs!, name, "document.json"), "utf8"));
      const variables = toRestVariables(doc);
      const a = index(toDesignIR(truth, { variables }));
      const b = index(toDesignIR(toRestDocument(doc, { geometry: true }), { variables }));
      expect(b.size).toBe(a.size);
      let same = 0;
      for (const [id, x] of a) {
        const y = b.get(id);
        const strip = (n: any) => JSON.stringify({ ...n, children: undefined });
        if (y && strip(x) === strip(y)) same++;
      }
      expect(same / a.size).toBeGreaterThan(0.995);
    });
  }
});
