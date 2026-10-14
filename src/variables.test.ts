import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  explicitModes,
  findVariable,
  nodeId,
  parseFig,
  resolveBoundVariables,
  resolvePaint,
  resolvePaintColor,
  resolveVariable,
  resolveVariableData,
  variableModes,
} from "./index.js";
import type { FigDocument, FigGuid, FigNode } from "./index.js";

const fixture = join(__dirname, "..", "test-fixtures", "variables", "just-fonts.deck");

const G = (localID: number): FigGuid => ({ sessionID: 1, localID });
const M = (localID: number): FigGuid => ({ sessionID: 7, localID }); // mode ids
const alias = (guid: FigGuid, resolvedDataType = "COLOR") => ({ dataType: "ALIAS", resolvedDataType, value: { alias: { guid } } });
const color = (r: number) => ({ dataType: "COLOR", resolvedDataType: "COLOR", value: { colorValue: { r, g: 0, b: 0, a: 1 } } });

function docOf(nodes: Array<Partial<FigNode> & { id: number; parent?: number }>): FigDocument {
  const built = nodes.map(({ id, parent, ...rest }) => ({
    name: `n${id}`, type: "FRAME", ...rest, guid: G(id),
    ...(parent !== undefined ? { parentIndex: { guid: G(parent), position: "!" } } : {}),
  }) as FigNode);
  const nodeMap = new Map(built.map((n) => [nodeId(n)!, n]));
  return { nodes: built, nodeMap, childrenMap: new Map(), images: new Map() } as unknown as FigDocument;
}

describe("variables", () => {
  // Set 1 has modes Light ("!") and Dark ('"'), listed out of order.
  // Variable 2 "brand" is red 0.1 in Light and 0.9 in Dark; variable 3 aliases it.
  // A library set and variable are referenced by asset key.
  const nodes = () => [
    { id: 1, type: "VARIABLE_SET", variableSetModes: [
      { id: M(2), name: "Dark", sortPosition: '"' },
      { id: M(1), name: "Light", sortPosition: "!" },
    ] },
    { id: 2, type: "VARIABLE", name: "brand", variableSetID: { guid: G(1) }, variableDataValues: { entries: [
      { modeID: M(1), variableData: color(0.1) },
      { modeID: M(2), variableData: color(0.9) },
    ] } },
    { id: 3, type: "VARIABLE", name: "accent", variableSetID: { guid: G(1) }, variableDataValues: { entries: [
      { modeID: M(1), variableData: alias(G(2)) },
    ] } },
    { id: 4, type: "VARIABLE_SET", key: "libset", variableSetModes: [{ id: M(9), name: "Only", sortPosition: "!" }] },
    { id: 5, type: "VARIABLE", name: "gap", key: "libvar", variableSetID: { assetRef: { key: "libset" } }, variableDataValues: { entries: [
      { modeID: M(9), variableData: { dataType: "FLOAT", resolvedDataType: "FLOAT", value: { floatValue: 24 } } },
    ] } },
    { id: 10, type: "FRAME", name: "dark-frame", variableModeBySetMap: { entries: [{ variableSetID: { guid: G(1) }, variableModeID: M(2) }] } },
    { id: 11, parent: 10, type: "RECTANGLE", name: "inside" },
    { id: 12, type: "VARIABLE", name: "loop-a", variableSetID: { guid: G(1) }, variableDataValues: { entries: [{ modeID: M(1), variableData: alias(G(13)) }] } },
    { id: 13, type: "VARIABLE", name: "loop-b", variableSetID: { guid: G(1) }, variableDataValues: { entries: [{ modeID: M(1), variableData: alias(G(12)) }] } },
  ];

  it("reads the set's first mode by default, ordered by sortPosition", () => {
    const doc = docOf(nodes());
    expect(variableModes(doc.nodeMap.get("1:1")!).map((m) => m.name)).toEqual(["Light", "Dark"]);
    const r = resolveVariable(doc, { guid: G(2) })!;
    expect(r).toMatchObject({ type: "COLOR", value: { r: 0.1 }, modeID: M(1) });
    expect(r.variable?.name).toBe("brand");
  });

  it("takes the mode from the nearest variableModeBySetMap, or an explicit one", () => {
    const doc = docOf(nodes());
    const inside = doc.nodeMap.get("1:11")!;
    expect(explicitModes(doc, inside).get("1:1")).toEqual(M(2));
    expect(resolveVariable(doc, { guid: G(2) }, { node: inside })!.value).toMatchObject({ r: 0.9 });
    expect(resolveVariable(doc, { guid: G(2) }, { node: inside, modes: new Map([["1:1", M(1)]]) })!.value).toMatchObject({ r: 0.1 });
  });

  it("follows aliases, falls back to the default mode, and resolves library references by key", () => {
    const doc = docOf(nodes());
    // accent has no Dark value: its default-mode alias is followed, into brand's Dark value.
    const r = resolveVariable(doc, { guid: G(3) }, { node: doc.nodeMap.get("1:11")! })!;
    expect(r.variable?.name).toBe("brand");
    expect(r.value).toMatchObject({ r: 0.9 });
    expect(resolveVariable(doc, { assetRef: { key: "libvar" } })).toMatchObject({ type: "FLOAT", value: 24 });
    expect(findVariable(doc, { assetRef: { key: "nope" } })).toBeUndefined();
  });

  it("returns undefined for a missing variable or an alias loop, and passes literals through", () => {
    const doc = docOf(nodes());
    expect(resolveVariable(doc, { guid: G(99) })).toBeUndefined();
    expect(resolveVariable(doc, { guid: G(12) })).toBeUndefined();
    expect(resolveVariableData(doc, color(0.5))).toEqual({ type: "COLOR", value: { r: 0.5, g: 0, b: 0, a: 1 }, variable: undefined, modeID: undefined });
  });

  it("falls back to a paint's cached colour when its variable is missing", () => {
    const doc = docOf(nodes());
    const cached = { r: 0.3, g: 0.3, b: 0.3, a: 1 };
    expect(resolvePaintColor(doc, { type: "SOLID", color: cached, colorVar: alias(G(99)) })).toBe(cached);
    expect(resolvePaintColor(doc, { type: "SOLID", color: cached, colorVar: alias(G(2)) })).toMatchObject({ r: 0.1 });
  });

  it("moves a bound variable's alpha into the paint's opacity, as Figma caches it", () => {
    const list: any[] = nodes();
    list[1].variableDataValues.entries[0].variableData.value.colorValue.a = 0.5;
    const doc = docOf(list);
    // Figma stores this paint as color.a = 1, opacity = 0.5; drawing color.a * opacity must give 0.5, not 0.25.
    const paint = { type: "SOLID", color: { r: 0.1, g: 0, b: 0, a: 1 }, opacity: 0.5, colorVar: alias(G(2)) };
    expect(resolvePaint(doc, paint)).toEqual({ color: { r: 0.1, g: 0, b: 0, a: 1 }, opacity: 0.5 });
    // Another mode's alpha replaces the cached opacity rather than multiplying it.
    expect(resolvePaint(doc, { ...paint, opacity: 0.2 }).opacity).toBe(0.5);
  });

  it("treats a literal colorVar as no binding", () => {
    const doc = docOf(nodes());
    const paint = { type: "SOLID", color: { r: 0.3, g: 0.3, b: 0.3, a: 1 }, opacity: 0.8, colorVar: color(0.31) };
    expect(resolvePaint(doc, paint)).toEqual({ color: paint.color, opacity: 0.8 });
  });
});

describe("variables on a reference file", () => {
  // A paint bound to a variable stores Figma's resolved value in `color`.
  it("resolves every bound paint to the colour Figma cached", () => {
    const doc = parseFig(new Uint8Array(readFileSync(fixture)));
    let checked = 0;
    for (const node of doc.nodes) {
      for (const paint of [...(node.fillPaints ?? []), ...(node.strokePaints ?? [])] as any[]) {
        if (!paint.colorVar) continue;
        const resolved = resolveVariableData(doc, paint.colorVar, { node });
        expect(resolved?.type, node.name).toBe("COLOR");
        const c = resolved!.value as any;
        for (const k of ["r", "g", "b", "a"]) expect(c[k], `${node.name} ${k}`).toBeCloseTo(paint.color[k], 6);
        const { color: drawn, opacity } = resolvePaint(doc, paint, { node });
        expect(drawn!.a * opacity, node.name).toBeCloseTo(paint.color.a * (paint.opacity ?? 1), 6);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("resolves bound auto-layout padding to the values stored on the node", () => {
    const doc = parseFig(new Uint8Array(readFileSync(fixture)));
    const slide = doc.nodes.find((n) => n.variableConsumptionMap?.entries?.length)!;
    const bound = resolveBoundVariables(doc, slide);
    expect(bound.get("STACK_PADDING_LEFT")?.value).toBe(slide.stackHorizontalPadding);
    expect(bound.get("STACK_PADDING_TOP")?.value).toBe(slide.stackVerticalPadding);
    expect(bound.get("STACK_PADDING_RIGHT")?.value).toBe(slide.stackPaddingRight);
    expect(bound.get("STACK_PADDING_BOTTOM")?.value).toBe(slide.stackPaddingBottom);
  });
});
