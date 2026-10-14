import { describe, it, expect } from "vitest";
import { nodeId, toRestDocument } from "../index.js";
import type { FigDocument, FigGuid, FigNode } from "../index.js";
import { intersect, union, withEffects } from "./bounds.js";

const G = (localID: number): FigGuid => ({ sessionID: 1, localID });
const key = (g: FigGuid) => `${g.sessionID}:${g.localID}`;
const at = (x: number, y: number) => ({ m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y });
const red = [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } }];

/** A document under DOCUMENT 0 / CANVAS 100 from nodes that name their parent by localID; `blobs` become message blobs. */
function docOf(nodes: Array<Partial<FigNode> & { id: number; parent?: number }>, blobs: Uint8Array[] = []): FigDocument {
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
  return { nodes: built, nodeMap, childrenMap, images: new Map(), message: { blobs } } as unknown as FigDocument;
}

function index(root: any): Map<string, any> {
  const out = new Map<string, any>();
  const walk = (n: any) => { out.set(n.id, n); (n.children ?? []).forEach(walk); };
  walk(root);
  return out;
}

/** A commandsBlob tracing the rectangle (x, y, w, h): move, three lines, close. */
function rectBlob(x: number, y: number, w: number, h: number): Uint8Array {
  const bytes = new Uint8Array(1 + 4 * 9 + 1);
  const view = new DataView(bytes.buffer);
  let at = 0;
  const point = (op: number, px: number, py: number) => {
    bytes[at++] = op;
    view.setFloat32(at, px, true);
    view.setFloat32(at + 4, py, true);
    at += 8;
  };
  point(1, x, y);
  point(2, x + w, y);
  point(2, x + w, y + h);
  point(2, x, y + h);
  bytes[at] = 0;
  return bytes;
}

const rect = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

describe("absoluteRenderBounds", () => {
  it("covers the fill outline and a centred stroke, and keeps an inside stroke within the fill", () => {
    // Blob 0: the 100 × 50 fill; blob 1: the stroke outline 2 px around it.
    const blobs = [rectBlob(0, 0, 100, 50), rectBlob(-2, -2, 104, 54)];
    const shape = (id: number, extra: object) => ({
      id, parent: 100, type: "ROUNDED_RECTANGLE", size: { x: 100, y: 50 }, transform: at(10, 20),
      fillPaints: red, fillGeometry: [{ commandsBlob: 0 }], strokeGeometry: [{ commandsBlob: 1 }], strokeWeight: 2, ...extra,
    });
    const rest = index(toRestDocument(docOf([
      shape(1, {}),
      shape(2, { strokePaints: red, strokeAlign: "CENTER" }),
      shape(3, { strokePaints: red, strokeAlign: "INSIDE" }),
      // Only the stroke shows.
      shape(4, { fillPaints: [{ ...red[0], visible: false }], strokePaints: red }),
    ] as any, blobs)).document);
    expect(rest.get("1:1").absoluteRenderBounds).toEqual(rect(10, 20, 100, 50));
    expect(rest.get("1:2").absoluteRenderBounds).toEqual(rect(8, 18, 104, 54));
    expect(rest.get("1:3").absoluteRenderBounds).toEqual(rect(10, 20, 100, 50));
    expect(rest.get("1:4").absoluteRenderBounds).toEqual(rect(8, 18, 104, 54));
  });

  it("covers text's glyph outlines up to the truncation, not its box", () => {
    // A glyph 0.5 em wide and 0.75 em tall above the baseline, at 10 px.
    const blobs = [rectBlob(0, 0, 0.5, 0.75)];
    const glyphs = [
      { commandsBlob: 0, fontSize: 10, position: { x: 0, y: 8 }, firstCharacter: 0 },
      { commandsBlob: 0, fontSize: 10, position: { x: 6, y: 8 }, firstCharacter: 1 },
    ];
    const text = (id: number, derived: object) => ({
      id, parent: 100, type: "TEXT", size: { x: 40, y: 10 }, transform: at(100, 200), textData: { characters: "ab" }, derivedTextData: derived,
    });
    const rest = index(toRestDocument(docOf([
      text(1, { glyphs }),
      text(2, { glyphs, truncationStartIndex: 1 }),
      // No saved layout: the box.
      text(3, undefined as any),
    ] as any, blobs)).document);
    expect(rest.get("1:1").absoluteRenderBounds).toEqual(rect(100, 200.5, 11, 7.5));
    expect(rest.get("1:2").absoluteRenderBounds).toEqual(rect(100, 200.5, 5, 7.5));
    expect(rest.get("1:3").absoluteRenderBounds).toEqual(rect(100, 200, 40, 10));
  });

  it("grows by drop shadows and layer blur", () => {
    const blobs = [rectBlob(0, 0, 10, 10)];
    const shape = (id: number, effects: any[]) => ({
      id, parent: 100, type: "ROUNDED_RECTANGLE", size: { x: 10, y: 10 }, fillPaints: red, fillGeometry: [{ commandsBlob: 0 }], effects,
    });
    const rest = index(toRestDocument(docOf([
      shape(1, [{ type: "DROP_SHADOW", offset: { x: 4, y: 4 }, radius: 2, spread: 1, color: { r: 0, g: 0, b: 0, a: 0.25 } }]),
      shape(2, [{ type: "FOREGROUND_BLUR", radius: 3 }]),
      shape(3, [{ type: "DROP_SHADOW", visible: false, offset: { x: 4, y: 4 }, radius: 2 }, { type: "INNER_SHADOW", offset: { x: 4, y: 4 }, radius: 2 }]),
    ] as any, blobs)).document);
    expect(rest.get("1:1").absoluteRenderBounds).toEqual(rect(0, 0, 17, 17));
    expect(rest.get("1:2").absoluteRenderBounds).toEqual(rect(-3, -3, 16, 16));
    expect(rest.get("1:3").absoluteRenderBounds).toEqual(rect(0, 0, 10, 10));
  });

  it("cuts children by a clipping frame, and a frame counts its own box and its children", () => {
    const blobs = [rectBlob(0, 0, 40, 40)];
    const child = (id: number, parent: number) => ({
      id, parent, type: "ROUNDED_RECTANGLE", size: { x: 40, y: 40 }, transform: at(30, 30), fillPaints: red, fillGeometry: [{ commandsBlob: 0 }],
    });
    const rest = index(toRestDocument(docOf([
      { id: 1, parent: 100, type: "FRAME", size: { x: 50, y: 50 } },
      child(2, 1),
      { id: 3, parent: 100, type: "FRAME", size: { x: 50, y: 50 }, transform: at(100, 0), frameMaskDisabled: true },
      child(4, 3),
    ] as any, blobs)).document);
    expect(rest.get("1:1").absoluteRenderBounds).toEqual(rect(0, 0, 50, 50));
    expect(rest.get("1:2").absoluteRenderBounds).toEqual(rect(30, 30, 20, 20));
    expect(rest.get("1:3").absoluteRenderBounds).toEqual(rect(100, 0, 70, 70));
    expect(rest.get("1:4").absoluteRenderBounds).toEqual(rect(130, 30, 40, 40));
  });

  it("cuts the siblings above a mask by it, and gives the mask itself none", () => {
    const blobs = [rectBlob(0, 0, 20, 20)];
    const shape = (id: number, x: number, extra: object = {}) => ({
      id, parent: 1, type: "ROUNDED_RECTANGLE", size: { x: 20, y: 20 }, transform: at(x, x), fillPaints: red, fillGeometry: [{ commandsBlob: 0 }], ...extra,
    });
    const rest = index(toRestDocument(docOf([
      { id: 1, parent: 100, type: "FRAME", resizeToFit: true, frameMaskDisabled: false, size: { x: 30, y: 30 } },
      shape(2, 0, { mask: true }),
      shape(3, 10),
    ] as any, blobs)).document);
    expect(rest.get("1:2")).toMatchObject({ isMask: true, absoluteRenderBounds: null });
    expect(rest.get("1:3").absoluteRenderBounds).toEqual(rect(10, 10, 10, 10));
    // The mask paints nothing but still counts for its group.
    expect(rest.get("1:1")).toMatchObject({ type: "GROUP", absoluteRenderBounds: rect(0, 0, 20, 20) });
  });

  it("gives a boolean operation its own outline and its operands none", () => {
    const blobs = [rectBlob(0, 0, 30, 30), rectBlob(0, 0, 100, 100)];
    const rest = index(toRestDocument(docOf([
      { id: 1, parent: 100, type: "BOOLEAN_OPERATION", size: { x: 30, y: 30 }, fillPaints: red, fillGeometry: [{ commandsBlob: 0 }] },
      // An operand larger than the result does not widen it.
      { id: 2, parent: 1, type: "ROUNDED_RECTANGLE", size: { x: 100, y: 100 }, fillPaints: red, fillGeometry: [{ commandsBlob: 1 }] },
    ] as any, blobs)).document);
    expect(rest.get("1:1").absoluteRenderBounds).toEqual(rect(0, 0, 30, 30));
    expect(rest.get("1:2").absoluteRenderBounds).toBeNull();
  });

  it("counts a group's text by its layout box as well as its glyphs", () => {
    const blobs = [rectBlob(0, 0, 0.5, 0.75)];
    const rest = index(toRestDocument(docOf([
      { id: 1, parent: 100, type: "FRAME", resizeToFit: true, frameMaskDisabled: false, size: { x: 40, y: 10 } },
      {
        id: 2, parent: 1, type: "TEXT", size: { x: 40, y: 10 }, textData: { characters: "a" },
        derivedTextData: { glyphs: [{ commandsBlob: 0, fontSize: 10, position: { x: 0, y: 8 }, firstCharacter: 0 }] },
      },
    ] as any, blobs)).document);
    expect(rest.get("1:2").absoluteRenderBounds).toEqual(rect(0, 0.5, 5, 7.5));
    expect(rest.get("1:1").absoluteRenderBounds).toEqual(rect(0, 0, 40, 10));
  });
});

describe("bounds helpers", () => {
  it("unions, intersects and grows rectangles", () => {
    expect(union(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toEqual(rect(0, 0, 15, 15));
    expect(union(null, rect(1, 2, 3, 4))).toEqual(rect(1, 2, 3, 4));
    expect(intersect(rect(0, 0, 10, 10), rect(5, 5, 10, 10))).toEqual(rect(5, 5, 5, 5));
    // No limit, and no overlap.
    expect(intersect(rect(0, 0, 10, 10), undefined)).toEqual(rect(0, 0, 10, 10));
    expect(intersect(rect(0, 0, 10, 10), rect(20, 20, 5, 5))).toBeNull();
    expect(intersect(rect(0, 0, 10, 10), null)).toBeNull();
    expect(withEffects(rect(0, 0, 10, 10), [{ type: "DROP_SHADOW", offset: { x: -2, y: 0 }, radius: 1 }])).toEqual(rect(-3, -1, 13, 12));
    expect(withEffects(null, [{ type: "LAYER_BLUR", radius: 4 }])).toBeNull();
  });
});
