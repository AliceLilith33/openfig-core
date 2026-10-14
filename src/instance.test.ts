import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { nodeId, overrideKeyOf, parseFig, resolveInstance, resolveTree, walkResolved } from "./index.js";
import type { FigDocument, FigGuid, FigNode, ResolvedNode } from "./index.js";

const fixture = join(__dirname, "..", "test-fixtures", "instances", "medium-complex.fig");

const G = (localID: number): FigGuid => ({ sessionID: 1, localID });
const K = (localID: number): FigGuid => ({ sessionID: 9, localID }); // override keys
const key = (g: FigGuid) => `${g.sessionID}:${g.localID}`;

/** Build a document from nodes that name their parent by localID. */
function docOf(nodes: Array<Partial<FigNode> & { id: number; parent?: number }>): FigDocument {
  const built: FigNode[] = nodes.map(({ id, parent, ...rest }, i) => ({
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

const override = (path: FigGuid[], fields: Record<string, any>) => ({ guidPath: { guids: path }, ...fields });

function flat(r: ResolvedNode): ResolvedNode[] {
  const out: ResolvedNode[] = [];
  walkResolved(r, (x) => { out.push(x); });
  return out;
}

describe("resolveInstance", () => {
  // Symbol 10 "Card": a title TEXT (key K1) and a nested instance (key K2) of
  // symbol 20 "Badge", whose one TEXT has key K3. Symbol 30 is a swap target
  // with one TEXT keyed K4.
  const base = () => [
    { id: 10, type: "SYMBOL", name: "Card", overrideKey: K(10) },
    { id: 11, parent: 10, type: "TEXT", name: "title", overrideKey: K(1), textData: { characters: "Title" }, derivedTextData: { stale: true } },
    { id: 12, parent: 10, type: "INSTANCE", name: "badge", overrideKey: K(2), symbolData: { symbolID: G(20), symbolOverrides: [] } },
    { id: 20, type: "SYMBOL", name: "Badge", overrideKey: K(20) },
    { id: 21, parent: 20, type: "TEXT", name: "label", overrideKey: K(3), textData: { characters: "New" } },
    { id: 30, type: "SYMBOL", name: "Pill", overrideKey: K(30) },
    { id: 31, parent: 30, type: "TEXT", name: "pill-label", overrideKey: K(4), textData: { characters: "Pill" } },
  ];

  it("expands the symbol's content and records each node's guidPath", () => {
    const doc = docOf([...base(), { id: 1, type: "INSTANCE", name: "card", symbolData: { symbolID: G(10) } }]);
    const r = resolveInstance(doc, doc.nodeMap.get("1:1")!);
    expect(r.symbol?.name).toBe("Card");
    expect(flat(r).map((x) => `${x.node.name}@${x.path.map((g) => g.localID).join("/")}`)).toEqual([
      "card@", "title@1", "badge@2", "label@2/3",
    ]);
    // The symbol's own nodes are untouched.
    expect(doc.nodeMap.get("1:11")!.textData?.characters).toBe("Title");
  });

  it("applies every overridden field, not a fixed list", () => {
    const doc = docOf([...base(), {
      id: 1, type: "INSTANCE", symbolData: { symbolID: G(10), symbolOverrides: [
        override([K(1)], { visible: false, name: "renamed", size: { x: 5, y: 6 }, textData: { characters: "Hello" } }),
      ] },
    }]);
    const title = resolveInstance(doc, doc.nodeMap.get("1:1")!).children[0].node;
    expect(title).toMatchObject({ visible: false, name: "renamed", size: { x: 5, y: 6 }, textData: { characters: "Hello" } });
    // New text invalidates the cached glyph layout.
    expect(title.derivedTextData).toBeUndefined();
  });

  it("applies an entry addressed to the symbol root to the instance itself", () => {
    const doc = docOf([...base(), {
      id: 1, type: "INSTANCE", name: "card", symbolData: { symbolID: G(10), symbolOverrides: [override([K(10)], { name: "Hero card" })] },
      derivedSymbolData: [override([K(10)], { size: { x: 300, y: 200 } })],
    }]);
    const r = resolveInstance(doc, doc.nodeMap.get("1:1")!);
    expect(r.node.name).toBe("Hero card");
    expect(r.node.size).toEqual({ x: 300, y: 200 });
  });

  it("keeps the scaled lengths a scaled instance stores over an entry for its root", () => {
    const doc = docOf([...base(), {
      id: 1, type: "INSTANCE", strokeWeight: 2, cornerRadius: 16, stackSpacing: 8,
      symbolData: { symbolID: G(10), uniformScaleFactor: 2, symbolOverrides: [
        // Entries from before the scaling, beside fields the instance does not store.
        override([K(10)], { strokeWeight: 1, cornerRadius: 8, stackSpacing: 4, stackHorizontalPadding: 6, name: "Big card" }),
      ] },
    }]);
    const r = resolveInstance(doc, doc.nodeMap.get("1:1")!);
    expect(r.node).toMatchObject({ strokeWeight: 2, cornerRadius: 16, stackSpacing: 8, stackHorizontalPadding: 6, name: "Big card" });
  });

  it("follows two-segment paths into the swapped-in symbol", () => {
    const doc = docOf([...base(), {
      id: 1, type: "INSTANCE", symbolData: { symbolID: G(10), symbolOverrides: [
        override([K(2)], { overriddenSymbolID: G(30) }),
        override([K(2), K(4)], { textData: { characters: "Swapped" } }),
      ] },
    }]);
    const badge = resolveInstance(doc, doc.nodeMap.get("1:1")!).children[1];
    expect(badge.symbol?.name).toBe("Pill");
    expect(badge.node.symbolData.symbolID).toEqual(G(30));
    expect(badge.children.map((c) => c.node.textData?.characters)).toEqual(["Swapped"]);
  });

  it("lays a swapped instance out as the symbol it now shows", () => {
    const doc = docOf([
      ...base().map((n) => n.id === 12 ? { ...n, stackMode: "HORIZONTAL", stackSpacing: 16, stackPrimaryAlignItems: "MAX" } : n.id === 30 ? { ...n, stackMode: "VERTICAL", stackSpacing: 8 } : n),
      { id: 1, type: "INSTANCE", symbolData: { symbolID: G(10), symbolOverrides: [override([K(2)], { overriddenSymbolID: G(30) })] } },
      { id: 2, type: "INSTANCE", symbolData: { symbolID: G(10), symbolOverrides: [override([K(2)], { overriddenSymbolID: G(30), stackSpacing: 4 })] } },
      { id: 3, type: "INSTANCE", symbolData: { symbolID: G(10) } },
    ]);
    const badge = (id: string) => resolveInstance(doc, doc.nodeMap.get(id)!).children[1].node;
    expect(badge("1:1")).toMatchObject({ stackMode: "VERTICAL", stackSpacing: 8 });
    expect(badge("1:1")).not.toHaveProperty("stackPrimaryAlignItems");
    // An override for the swapped instance still wins.
    expect(badge("1:2")).toMatchObject({ stackMode: "VERTICAL", stackSpacing: 4 });
    // Not swapped: the instance keeps its own.
    expect(badge("1:3")).toMatchObject({ stackMode: "HORIZONTAL", stackSpacing: 16 });
  });

  it("names a node whose override key is all ones by its guid", () => {
    const none = { sessionID: 0xffffffff, localID: 0xffffffff };
    const doc = docOf([
      { id: 40, type: "SYMBOL", name: "Text" },
      { id: 41, parent: 40, type: "TEXT", name: "label", overrideKey: none, textData: { characters: "Text" } },
      { id: 1, type: "INSTANCE", symbolData: { symbolID: G(40) }, derivedSymbolData: [override([G(41)], { size: { x: 74, y: 22 } })] },
    ]);
    expect(overrideKeyOf(doc.nodeMap.get("1:41")!)).toEqual(G(41));
    expect(resolveInstance(doc, doc.nodeMap.get("1:1")!).children[0].node.size).toEqual({ x: 74, y: 22 });
  });

  it("lets outer overrides win over the nested instance's own", () => {
    const doc = docOf([
      ...base().map((n) => n.id === 12
        ? { ...n, symbolData: { symbolID: G(20), symbolOverrides: [override([K(3)], { textData: { characters: "inner" } })] } }
        : n),
      { id: 1, type: "INSTANCE", symbolData: { symbolID: G(10), symbolOverrides: [override([K(2), K(3)], { textData: { characters: "outer" } })] } },
    ]);
    const label = resolveInstance(doc, doc.nodeMap.get("1:1")!).children[1].children[0];
    expect(label.node.textData?.characters).toBe("outer");
  });

  it("drops the nested instance's own entries when an outer override swaps it, even to the same symbol", () => {
    const doc = docOf([
      ...base().map((n) => n.id === 12
        ? { ...n, symbolData: { symbolID: G(20), symbolOverrides: [override([K(3)], { textData: { characters: "inner" } })] } }
        : n),
      { id: 1, type: "INSTANCE", symbolData: { symbolID: G(10), symbolOverrides: [override([K(2)], { overriddenSymbolID: G(20) })] } },
      { id: 2, type: "INSTANCE", symbolData: { symbolID: G(10) } },
    ]);
    const label = (id: string) => resolveInstance(doc, doc.nodeMap.get(id)!).children[1].children[0].node;
    expect(label("1:1").textData?.characters).toBe("New");
    // Without the swap, the nested instance's own override still applies.
    expect(label("1:2").textData?.characters).toBe("inner");
  });

  it("applies derived data after overrides", () => {
    const doc = docOf([...base(), {
      id: 1, type: "INSTANCE", symbolData: { symbolID: G(10), symbolOverrides: [override([K(1)], { size: { x: 1, y: 1 } })] },
      derivedSymbolData: [override([K(1)], { size: { x: 42, y: 7 }, transform: { m00: 1, m01: 0, m02: 3, m10: 0, m11: 1, m12: 4 } })],
    }]);
    const title = resolveInstance(doc, doc.nodeMap.get("1:1")!).children[0].node;
    expect(title.size).toEqual({ x: 42, y: 7 });
    expect(title.transform?.m02).toBe(3);
    const raw = resolveInstance(doc, doc.nodeMap.get("1:1")!, { applyDerived: false }).children[0].node;
    expect(raw.size).toEqual({ x: 1, y: 1 });
  });

  it("applies component property assignments through componentPropRefs", () => {
    const show = { sessionID: 5, localID: 1 };
    const text = { sessionID: 5, localID: 2 };
    const swap = { sessionID: 5, localID: 3 };
    const doc = docOf([
      ...base().map((n) => {
        if (n.id === 11) return { ...n, componentPropRefs: [
          { defID: show, componentPropNodeField: "VISIBLE" },
          { defID: text, componentPropNodeField: "TEXT_DATA" },
        ] };
        if (n.id === 12) return { ...n, componentPropRefs: [{ defID: swap, componentPropNodeField: "OVERRIDDEN_SYMBOL_ID" }] };
        return n;
      }),
      { id: 1, type: "INSTANCE", symbolData: { symbolID: G(10) }, componentPropAssignments: [
        { defID: show, value: { boolValue: false } },
        { defID: text, value: { textValue: { characters: "From prop" } } },
        { defID: swap, value: { guidValue: G(30) } },
      ] },
    ]);
    const [title, badge] = resolveInstance(doc, doc.nodeMap.get("1:1")!).children;
    expect(title.node.visible).toBe(false);
    expect(title.node.textData?.characters).toBe("From prop");
    expect(title.node.derivedTextData).toBeUndefined();
    expect(badge.symbol?.name).toBe("Pill");
  });

  it("stops at a symbol that contains itself", () => {
    const doc = docOf([
      { id: 10, type: "SYMBOL" },
      { id: 11, parent: 10, type: "INSTANCE", overrideKey: K(1), symbolData: { symbolID: G(10) } },
      { id: 1, type: "INSTANCE", symbolData: { symbolID: G(10) } },
    ]);
    const r = resolveInstance(doc, doc.nodeMap.get("1:1")!);
    expect(flat(r).length).toBe(2);
    expect(r.children[0].children).toEqual([]);
  });

  it("rejects a node that is not an instance, while resolveTree accepts any node", () => {
    const doc = docOf([...base(), { id: 2, type: "FRAME" }, { id: 1, parent: 2, type: "INSTANCE", symbolData: { symbolID: G(10) } }]);
    expect(() => resolveInstance(doc, doc.nodeMap.get("1:2")!)).toThrow(/expected an INSTANCE/);
    expect(flat(resolveTree(doc, doc.nodeMap.get("1:2")!)).map((x) => x.node.name)).toEqual(["n2", "n1", "title", "badge", "label"]);
  });
});

describe("resolveInstance on a reference file", () => {
  // Figma wrote each instance's override and derived paths against what the
  // instance displays: each must name exactly one resolved node, and the derived
  // size and transform must be what that node ends up with.
  it("places every override and derived entry on exactly one node, with Figma's derived layout", () => {
    const doc = parseFig(new Uint8Array(readFileSync(fixture)));
    const pathKey = (p: FigGuid[]) => p.map(key).join("/");
    let entries = 0;
    let values = 0;

    for (const instance of doc.nodes) {
      if (instance.type !== "INSTANCE" || instance.phase === "REMOVED") continue;
      const r = resolveInstance(doc, instance);
      const byPath = new Map<string, ResolvedNode[]>();
      walkResolved(r, (x) => { byPath.set(pathKey(x.path), [...(byPath.get(pathKey(x.path)) ?? []), x]); });
      const selfKey = r.symbol ? key(overrideKeyOf(r.symbol)) : "";
      const at = (p: FigGuid[]) => (pathKey(p) === selfKey ? [r] : byPath.get(pathKey(p)) ?? []);

      const all = [...(instance.symbolData?.symbolOverrides ?? []), ...(instance.derivedSymbolData ?? [])];
      for (const e of all) {
        expect(at(e.guidPath.guids), `${instance.name} ${pathKey(e.guidPath.guids)}`).toHaveLength(1);
        entries++;
      }
      const lastDerived = new Map<string, any>();
      for (const e of instance.derivedSymbolData ?? []) lastDerived.set(pathKey(e.guidPath.guids), e);
      for (const e of lastDerived.values()) {
        const [hit] = at(e.guidPath.guids);
        for (const field of ["size", "transform"]) {
          if (!e[field]) continue;
          expect(hit.node[field], `${instance.name} ${field}`).toEqual(e[field]);
          values++;
        }
      }
    }
    // Two-segment paths through swapped instances are among them.
    expect(entries).toBeGreaterThan(200);
    expect(values).toBeGreaterThan(200);
  });
});
