import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import {
  ancestors,
  applyTransform,
  findAll,
  getAbsoluteBoundingBox,
  getAbsoluteTransform,
  multiplyTransform,
  nodeId,
  pageOf,
  parentOf,
  parseFig,
  walk,
} from "./index.js";
import type { FigDocument, FigNode, FigTransform } from "./index.js";

const fixturesDir = join(__dirname, "..", "test-fixtures");

/** A document built from nodes listed parent-first; `parent` names a node by its `name`. */
function docOf(specs: Array<Partial<FigNode> & { name: string; parent?: string }>): FigDocument {
  const nodes: FigNode[] = specs.map((spec, i) => ({ type: "FRAME", ...spec, guid: { sessionID: 1, localID: i } }) as FigNode);
  const byName = new Map(nodes.map((n) => [n.name, n]));
  for (const node of nodes) {
    const parentName = (node as any).parent;
    delete (node as any).parent;
    if (parentName) node.parentIndex = { guid: byName.get(parentName)!.guid, position: node.parentIndex?.position ?? "!" };
  }
  const nodeMap = new Map(nodes.map((n) => [nodeId(n)!, n]));
  const childrenMap = new Map<string, FigNode[]>();
  for (const n of nodes) {
    if (!n.parentIndex) continue;
    const pid = nodeId({ guid: n.parentIndex.guid } as FigNode)!;
    childrenMap.set(pid, [...(childrenMap.get(pid) ?? []), n]);
  }
  return { nodes, nodeMap, childrenMap, images: new Map() } as unknown as FigDocument;
}

const translate = (x: number, y: number): FigTransform => ({ m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y });
const rotate90 = (x: number, y: number): FigTransform => ({ m00: 0, m01: -1, m02: x, m10: 1, m11: 0, m12: y });
const close = (t: FigTransform, expected: FigTransform) => {
  for (const k of Object.keys(expected) as (keyof FigTransform)[]) expect(t[k], k).toBeCloseTo(expected[k], 9);
};

describe("tree navigation", () => {
  const doc = docOf([
    { name: "doc", type: "DOCUMENT" },
    { name: "page", type: "CANVAS", parent: "doc", transform: translate(999, 999) },
    { name: "frame", parent: "page", transform: translate(100, 50) },
    { name: "b", parent: "frame", parentIndex: { position: "B" } as any },
    { name: "a", parent: "frame", parentIndex: { position: "A" } as any },
    { name: "gone", parent: "frame", phase: "REMOVED", parentIndex: { position: "C" } as any },
    { name: "a1", parent: "a" },
  ]);
  for (const list of doc.childrenMap.values()) list.sort((x, y) => (x.parentIndex!.position < y.parentIndex!.position ? -1 : 1));
  const n = (name: string) => doc.nodes.find((x) => x.name === name)!;

  it("finds parents, ancestors and the page", () => {
    expect(parentOf(doc, n("a1"))?.name).toBe("a");
    expect(parentOf(doc, n("doc"))).toBeUndefined();
    expect(ancestors(doc, n("a1")).map((x) => x.name)).toEqual(["a", "frame", "page", "doc"]);
    expect(pageOf(doc, n("a1"))?.name).toBe("page");
    expect(pageOf(doc, n("doc"))).toBeUndefined();
  });

  it("walks parents first, siblings in layer order, skipping REMOVED", () => {
    const seen: string[] = [];
    walk(doc, n("doc"), (node, depth) => { seen.push(`${depth}${node.name}`); });
    expect(seen).toEqual(["0doc", "1page", "2frame", "3a", "4a1", "3b"]);

    const all: string[] = [];
    walk(doc, nodeId(n("frame"))!, (node) => { all.push(node.name); }, { includeRemoved: true });
    expect(all).toEqual(["frame", "a", "a1", "b", "gone"]);
  });

  it("skips a subtree when the visitor returns false", () => {
    const seen: string[] = [];
    walk(doc, n("frame"), (node) => { seen.push(node.name); return node.name !== "a"; });
    expect(seen).toEqual(["frame", "a", "b"]);
    expect(findAll(doc, n("doc"), (x) => x.name.length === 1).map((x) => x.name)).toEqual(["a", "b"]);
  });

  it("survives a parent cycle", () => {
    const cyc = docOf([{ name: "x" }, { name: "y", parent: "x" }]);
    const [x, y] = cyc.nodes;
    x.parentIndex = { guid: y.guid, position: "!" };
    cyc.childrenMap.set(nodeId(y)!, [x]);
    expect(ancestors(cyc, y).map((a) => a.name)).toEqual(["x"]);
    const seen: string[] = [];
    walk(cyc, x, (node) => { seen.push(node.name); });
    expect(seen).toEqual(["x", "y"]);
  });
});

describe("absolute transform", () => {
  it("composes parent transforms up to the page, excluding the page's own", () => {
    const doc = docOf([
      { name: "page", type: "CANVAS", transform: translate(1000, 1000) },
      { name: "outer", parent: "page", transform: translate(100, 50) },
      { name: "rotated", parent: "outer", transform: rotate90(10, 0) },
      { name: "leaf", parent: "rotated", transform: translate(5, 0), size: { x: 20, y: 4 } },
    ]);
    const leaf = doc.nodes[3];
    // (5, 0) in the rotated frame is (0, 5) rotated, then shifted by (10, 0) and (100, 50).
    close(getAbsoluteTransform(doc, leaf), { m00: 0, m01: -1, m02: 110, m10: 1, m11: 0, m12: 55 });
    expect(applyTransform(getAbsoluteTransform(doc, leaf), 20, 0)).toEqual({ x: 110, y: 75 });
    // The 20×4 rectangle, rotated 90°, spans x 106–110 and y 55–75.
    expect(getAbsoluteBoundingBox(doc, leaf)).toEqual({ x: 106, y: 55, width: 4, height: 20 });
    close(getAbsoluteTransform(doc, doc.nodes[0]), translate(0, 0));
  });

  it("multiplies in application order", () => {
    // Scale by 2, then translate by (3, 0): (1, 1) → (2, 2) → (5, 2).
    const scale: FigTransform = { m00: 2, m01: 0, m02: 0, m10: 0, m11: 2, m12: 0 };
    expect(applyTransform(multiplyTransform(translate(3, 0), scale), 1, 1)).toEqual({ x: 5, y: 2 });
  });

  it("gives finite page coordinates for every node in the reference files, whose pages sit at identity", () => {
    const files = readdirSync(fixturesDir).filter((f) => f.endsWith(".fig"));
    let checked = 0;
    for (const file of files) {
      const doc = parseFig(new Uint8Array(readFileSync(join(fixturesDir, file))));
      for (const node of doc.nodes) {
        if (node.type === "CANVAS" && node.transform) close(node.transform, translate(0, 0));
        const t = getAbsoluteTransform(doc, node);
        expect(Object.values(t).every(Number.isFinite), `${file} ${node.name}`).toBe(true);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
