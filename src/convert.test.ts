import { describe, it, expect } from "vitest";
import { convertDeckToFig } from "./convert.js";
import { createFigZip } from "./encoder.js";
import { positionAt } from "./utils.js";
import type { FigDocument, FigNode } from "./types.js";

describe("convertDeckToFig", () => {
  it("converts slide scaffolding and bakes components and overrides", () => {
    // 1. Setup a mocked Figma Slides FigDocument
    const documentNode: FigNode = {
      guid: { sessionID: 0, localID: 0 },
      type: "DOCUMENT",
      name: "Document",
    };

    const sourceCanvas: FigNode = {
      guid: { sessionID: 1, localID: 1 },
      type: "CANVAS",
      name: "Page 1",
      parentIndex: { guid: { sessionID: 0, localID: 0 }, position: "!" },
    };

    const slideGrid: FigNode = {
      guid: { sessionID: 1, localID: 2 },
      type: "SLIDE_GRID",
      name: "Presentation",
      parentIndex: { guid: { sessionID: 1, localID: 1 }, position: "!" },
    };

    const slideRow: FigNode = {
      guid: { sessionID: 1, localID: 3 },
      type: "SLIDE_ROW",
      name: "Row",
      parentIndex: { guid: { sessionID: 1, localID: 2 }, position: "!" },
    };

    // Active Slide 1
    const slide1: FigNode = {
      guid: { sessionID: 1, localID: 10 },
      type: "SLIDE",
      name: "Slide 1",
      parentIndex: { guid: { sessionID: 1, localID: 3 }, position: "a" },
    };

    // Instance on Slide 1 referencing Symbol 100
    const instance1: FigNode = {
      guid: { sessionID: 1, localID: 11 },
      type: "INSTANCE",
      name: "SlideInstance",
      parentIndex: { guid: { sessionID: 1, localID: 10 }, position: "!" },
      symbolData: {
        symbolID: { sessionID: 1, localID: 100 },
        symbolOverrides: [
          {
            guidPath: {
              guids: [{ sessionID: 1, localID: 101 }],
            },
            textData: { characters: "Bake My Text Overrides" },
          },
        ],
      },
    };

    // Sibling shape node on Slide 1 (should be preserved and reparented)
    const siblingShape: FigNode = {
      guid: { sessionID: 1, localID: 12 },
      type: "RECTANGLE",
      name: "Custom Logo Box",
      parentIndex: { guid: { sessionID: 1, localID: 10 }, position: "b" },
    };

    // Active Slide 2 (with no overrides, should use defaults)
    const slide2: FigNode = {
      guid: { sessionID: 1, localID: 20 },
      type: "SLIDE",
      name: "Slide 2",
      parentIndex: { guid: { sessionID: 1, localID: 3 }, position: "b" },
    };

    const instance2: FigNode = {
      guid: { sessionID: 1, localID: 21 },
      type: "INSTANCE",
      name: "SlideInstance2",
      parentIndex: { guid: { sessionID: 1, localID: 20 }, position: "!" },
      symbolData: {
        symbolID: { sessionID: 1, localID: 100 },
        symbolOverrides: [],
      },
    };

    // Symbol definition (external components to be baked)
    const symbolNode: FigNode = {
      guid: { sessionID: 1, localID: 100 },
      type: "SYMBOL",
      name: "Slide Template Component",
    };

    const templateText: FigNode = {
      guid: { sessionID: 1, localID: 101 },
      type: "TEXT",
      name: "Title Layer",
      parentIndex: { guid: { sessionID: 1, localID: 100 }, position: "a" },
      textData: { characters: "Default Title characters" },
    };

    const templateVector: FigNode = {
      guid: { sessionID: 1, localID: 102 },
      type: "VECTOR",
      name: "Decoration Line",
      parentIndex: { guid: { sessionID: 1, localID: 100 }, position: "b" },
      fillGeometry: [{ windingRule: "NONZERO", commandsBlob: 0 }],
    };

    const sourceNodes = [
      documentNode,
      sourceCanvas,
      slideGrid,
      slideRow,
      slide1,
      instance1,
      siblingShape,
      slide2,
      instance2,
      symbolNode,
      templateText,
      templateVector,
    ];

    const nodeMap = new Map<string, FigNode>();
    const childrenMap = new Map<string, FigNode[]>();

    for (const node of sourceNodes) {
      const id = `${node.guid.sessionID}:${node.guid.localID}`;
      nodeMap.set(id, node);
    }

    for (const node of sourceNodes) {
      if (!node.parentIndex?.guid) continue;
      const pid = `${node.parentIndex.guid.sessionID}:${node.parentIndex.guid.localID}`;
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid)!.push(node);
    }

    const mockDeck: FigDocument = {
      header: { prelude: "fig-deck", version: 23 },
      nodes: sourceNodes,
      nodeMap,
      childrenMap,
      schema: {},
      compiledSchema: {
        encodeMessage: () => new Uint8Array(),
        decodeMessage: () => ({}),
      },
      rawChunks: [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])],
      message: {
        nodeChanges: sourceNodes,
        blobs: [{ bytes: new Uint8Array([9, 9, 9]) }],
      },
      images: new Map(),
      meta: { file_name: "Original Deck Title" },
    };

    // 2. Perform the conversion
    const designFig = convertDeckToFig(mockDeck, {
      title: "My Custom Design Canvas",
      layout: "grid",
      gap: 100,
      wrap: 2,
    });

    // 3. Assertions
    expect(designFig.header.prelude).toBe("fig-kiwi");
    expect(designFig.header.version).toBe(23);

    // Verify Scaffolding Removal: No SLIDE_GRID, SLIDE_ROW, SLIDE, MODULE, SYMBOL, INSTANCE
    const outputTypes = designFig.nodes.map((n) => n.type);
    expect(outputTypes).not.toContain("SLIDE_GRID");
    expect(outputTypes).not.toContain("SLIDE_ROW");
    expect(outputTypes).not.toContain("SLIDE");
    expect(outputTypes).not.toContain("MODULE");

    // We should have DOCUMENT, CANVAS, and FRAMEs
    const docNodes = designFig.nodes.filter((n) => n.type === "DOCUMENT");
    expect(docNodes.length).toBe(1);

    const canvasNodes = designFig.nodes.filter((n) => n.type === "CANVAS");
    expect(canvasNodes.length).toBe(1);
    expect(canvasNodes[0].name).toBe("My Custom Design Canvas");

    const frameNodes = designFig.nodes.filter((n) => n.type === "FRAME");
    expect(frameNodes.length).toBe(2);

    // Slide 1 Frame assertions
    const frame1 = frameNodes[0];
    expect(frame1.name).toBe("01 · Bake My Text Overrides");
    expect(frame1.transform?.m02).toBe(0); // Col 0
    expect(frame1.transform?.m12).toBe(0); // Row 0

    // Slide 2 Frame assertions
    const frame2 = frameNodes[1];
    expect(frame2.name).toBe("02 · Default Title characters");
    expect(frame2.transform?.m02).toBe(1920 + 100); // Col 1
    expect(frame2.transform?.m12).toBe(0); // Row 0

    // Check sibling custom logo box is preserved and parented to Frame 1
    const logoBoxes = designFig.nodes.filter((n) => n.name === "Custom Logo Box");
    expect(logoBoxes.length).toBe(1);
    expect(logoBoxes[0].parentIndex?.guid).toEqual(frame1.guid);

    // Check baked text layer under Frame 1 has overrides
    const bakedTextLayers = designFig.nodes.filter(
      (n) => n.type === "TEXT" && n.parentIndex?.guid.localID === frame1.guid.localID
    );
    expect(bakedTextLayers.length).toBe(1);
    expect(bakedTextLayers[0].textData?.characters).toBe("Bake My Text Overrides");

    // Check baked text layer under Frame 2 uses defaults
    const bakedText2 = designFig.nodes.filter(
      (n) => n.type === "TEXT" && n.parentIndex?.guid.localID === frame2.guid.localID
    );
    expect(bakedText2.length).toBe(1);
    expect(bakedText2[0].textData?.characters).toBe("Default Title characters");

    // Check vector line blobs are re-indexed correctly
    const lines1 = designFig.nodes.filter(
      (n) => n.name === "Decoration Line" && n.parentIndex?.guid.localID === frame1.guid.localID
    );
    expect(lines1.length).toBe(1);
    expect(lines1[0].fillGeometry?.[0].commandsBlob).toBeDefined();

    // Check all parentIndex mappings are intact
    for (const node of designFig.nodes) {
      if (node.type === "DOCUMENT") continue;
      expect(node.parentIndex).toBeDefined();
      const pidStr = `${node.parentIndex!.guid.sessionID}:${node.parentIndex!.guid.localID}`;
      expect(designFig.nodeMap.has(pidStr)).toBe(true);
    }
  });
});

// ─── Builders for the regression tests below ────────────────────────────────

const gid = (localID: number, sessionID = 1) => ({ sessionID, localID });
const key = (g: { sessionID: number; localID: number }) => `${g.sessionID}:${g.localID}`;

function child(localID: number, type: string, parent: number, position: string, extra: Partial<FigNode> = {}): FigNode {
  return { guid: gid(localID), type, name: `${type} ${localID}`, parentIndex: { guid: gid(parent), position }, ...extra };
}

function mockDoc(nodes: FigNode[], extra: Partial<FigDocument> = {}): FigDocument {
  const nodeMap = new Map<string, FigNode>();
  const childrenMap = new Map<string, FigNode[]>();
  for (const node of nodes) nodeMap.set(key(node.guid), node);
  for (const node of nodes) {
    if (!node.parentIndex?.guid) continue;
    const pid = key(node.parentIndex.guid);
    if (!childrenMap.has(pid)) childrenMap.set(pid, []);
    childrenMap.get(pid)!.push(node);
  }
  return {
    header: { prelude: "fig-deck", version: 101 },
    nodes,
    nodeMap,
    childrenMap,
    schema: {},
    compiledSchema: {},
    rawChunks: [new Uint8Array([1]), new Uint8Array([2])],
    message: { nodeChanges: nodes, blobs: [] },
    images: new Map(),
    ...extra,
  };
}

/** DOCUMENT 0 > CANVAS 1 > SLIDE_GRID 2 > SLIDE_ROW 3 */
const scaffold = (): FigNode[] => [
  { guid: gid(0), type: "DOCUMENT", name: "Document" },
  child(1, "CANVAS", 0, "!"),
  child(2, "SLIDE_GRID", 1, "!"),
  child(3, "SLIDE_ROW", 2, "!"),
];

const textUnder = (doc: FigDocument, frame: FigNode) => {
  const out: FigNode[] = [];
  const walk = (id: string) => {
    for (const c of doc.childrenMap.get(id) ?? []) {
      if (c.type === "TEXT") out.push(c);
      walk(key(c.guid));
    }
  };
  walk(key(frame.guid));
  return out.map((n) => n.textData?.characters);
};

describe("convertDeckToFig regressions", () => {
  it("keeps images as a Map that createFigZip can package", () => {
    const images = new Map([["abc", new Uint8Array([1, 2, 3])]]);
    const out = convertDeckToFig(mockDoc([...scaffold(), child(10, "SLIDE", 3, "!")], { images }));

    expect(out.images).toBeInstanceOf(Map);
    expect([...out.images.keys()]).toEqual(["abc"]);
    expect(out.images.get("abc")).not.toBe(images.get("abc")); // cloned, not shared
    expect(() => createFigZip({ canvasFig: new Uint8Array(4), images: out.images })).not.toThrow();
  });

  it("keeps frame positions within ! to ~ and in slide order past 94 slides", () => {
    const slides = Array.from({ length: 200 }, (_, i) => child(1000 + i, "SLIDE", 3, positionAt(i)));
    const out = convertDeckToFig(mockDoc([...scaffold(), ...slides]));

    const frames = out.nodes.filter((n) => n.type === "FRAME");
    expect(frames).toHaveLength(200);
    for (const frame of frames) expect(frame.parentIndex!.position).toMatch(/^[!-~]+$/);
    const canvas = out.nodes.find((n) => n.type === "CANVAS")!;
    const ordered = out.childrenMap.get(key(canvas.guid))!;
    expect(ordered.map((f) => f.name)).toEqual(frames.map((f) => f.name));
  });

  it("orders slides by walking the grid, not by comparing positions across parents", () => {
    // Every slide sits alone in a MODULE at position "!"; only the MODULE
    // positions carry the order, and the array lists them backwards.
    const nodes = [
      ...scaffold(),
      child(23, "SLIDE", 13, "!", { name: "third" }),
      child(13, "MODULE", 3, "~"),
      child(22, "SLIDE", 12, "!", { name: "second" }),
      child(12, "MODULE", 3, "_"),
      child(21, "SLIDE", 11, "!", { name: "first" }),
      child(11, "MODULE", 3, "A"),
      child(24, "SLIDE", 14, "!", { name: "removed" }),
      child(14, "MODULE", 3, "B", { phase: "REMOVED" }),
    ];
    for (const [slide, text] of [[21, "one"], [22, "two"], [23, "three"]] as const) {
      nodes.push(child(slide * 10, "TEXT", slide, "!", { textData: { characters: text } }));
    }

    const out = convertDeckToFig(mockDoc(nodes));
    const frames = out.nodes.filter((n) => n.type === "FRAME");
    expect(frames.map((f) => textUnder(out, f))).toEqual([["one"], ["two"], ["three"]]);
  });

  it("matches overrides by overrideKey, including through nested instances", () => {
    const nodes = [
      ...scaffold(),
      // Symbol 200: a TEXT. Its overrideKey differs from its guid, as in real files.
      { guid: gid(200), type: "SYMBOL", name: "Inner" },
      child(201, "TEXT", 200, "!", { overrideKey: gid(1, 9), textData: { characters: "inner default" } }),
      // Symbol 100: a title TEXT and a nested instance of 200.
      { guid: gid(100), type: "SYMBOL", name: "Outer" },
      child(101, "TEXT", 100, "!", { overrideKey: gid(2, 9), textData: { characters: "title default" } }),
      child(102, "INSTANCE", 100, '"', {
        overrideKey: gid(3, 9),
        symbolData: {
          symbolID: gid(200),
          symbolOverrides: [{ guidPath: { guids: [gid(1, 9)] }, textData: { characters: "set by nested" } }],
        },
      }),
      // Slide 10 overrides the title and, through 3:9, the nested text.
      child(10, "SLIDE", 3, "!"),
      child(11, "INSTANCE", 10, "!", {
        symbolData: {
          symbolID: gid(100),
          symbolOverrides: [
            { guidPath: { guids: [gid(2, 9)] }, textData: { characters: "Slide title" } },
            { guidPath: { guids: [gid(3, 9), gid(1, 9)] }, textData: { characters: "set by slide" } },
          ],
        },
      }),
      // Slide 20 overrides nothing: the nested instance's own override applies.
      child(20, "SLIDE", 3, '"'),
      child(21, "INSTANCE", 20, "!", { symbolData: { symbolID: gid(100), symbolOverrides: [] } }),
    ];

    const out = convertDeckToFig(mockDoc(nodes));
    const [frame1, frame2] = out.nodes.filter((n) => n.type === "FRAME" && key(n.parentIndex!.guid) === key(out.nodes[1].guid));

    expect(frame1.name).toBe("01 · Slide title");
    expect(textUnder(out, frame1)).toEqual(["Slide title", "set by slide"]);
    expect(frame2.name).toBe("02 · title default");
    expect(textUnder(out, frame2)).toEqual(["title default", "set by nested"]);

    // Nested instances are detached: nothing references a symbol that was not carried over.
    expect(out.nodes.filter((n) => n.type === "INSTANCE" || n.type === "SYMBOL")).toHaveLength(0);
    for (const node of out.nodes) {
      if (node.parentIndex) expect(out.nodeMap.has(key(node.parentIndex.guid))).toBe(true);
    }
  });

  it("carries the internal-only canvas so variables keep their parent", () => {
    const nodes = [
      ...scaffold(),
      child(5, "CANVAS", 0, "~", { name: "Internal Only Canvas", internalOnly: true, visible: false }),
      child(6, "VARIABLE_SET", 5, "!"),
      child(7, "VARIABLE", 5, "\""),
      child(10, "SLIDE", 3, "!"),
    ];
    const out = convertDeckToFig(mockDoc(nodes));

    const internal = out.nodes.filter((n) => n.type === "CANVAS" && n.internalOnly);
    expect(internal).toHaveLength(1);
    expect(internal[0].guid).toEqual(gid(5));
    expect(internal[0].parentIndex).toEqual({ guid: gid(0), position: "~" });
    for (const id of [6, 7]) {
      expect(out.nodeMap.get(key(gid(id)))!.parentIndex!.guid).toEqual(gid(5));
    }
    expect(out.childrenMap.get(key(gid(5)))!.map((n) => n.type)).toEqual(["VARIABLE_SET", "VARIABLE"]);
  });

  it("creates an internal-only canvas for variables whose parent is not carried over", () => {
    const nodes = [
      ...scaffold(),
      child(6, "VARIABLE_SET", 1, "!"), // on the slides canvas, which is replaced
      child(7, "VARIABLE", 6, "!"), // under the set, which is carried
      child(10, "SLIDE", 3, "!"),
    ];
    const out = convertDeckToFig(mockDoc(nodes));

    const internal = out.nodes.filter((n) => n.type === "CANVAS" && n.internalOnly);
    expect(internal).toHaveLength(1);
    expect(out.nodeMap.get(key(gid(6)))!.parentIndex!.guid).toEqual(internal[0].guid);
    expect(out.nodeMap.get(key(gid(7)))!.parentIndex!.guid).toEqual(gid(6));
    for (const node of out.nodes) {
      if (node.parentIndex) expect(out.nodeMap.has(key(node.parentIndex.guid))).toBe(true);
    }
  });

  it("adds no internal-only canvas when there are no variables", () => {
    const out = convertDeckToFig(mockDoc([...scaffold(), child(10, "SLIDE", 3, "!")]));
    expect(out.nodes.filter((n) => n.type === "CANVAS")).toHaveLength(1);
  });

  it("stops expanding a symbol that contains an instance of itself", () => {
    const nodes = [
      ...scaffold(),
      { guid: gid(100), type: "SYMBOL", name: "Loop" },
      child(101, "INSTANCE", 100, "!", { symbolData: { symbolID: gid(100) } }),
      child(10, "SLIDE", 3, "!"),
      child(11, "INSTANCE", 10, "!", { symbolData: { symbolID: gid(100) } }),
    ];
    const out = convertDeckToFig(mockDoc(nodes));
    // The slide instance flattens to 100's child; that child's expansion of 100 is cut off.
    expect(out.nodes.filter((n) => n.name === "INSTANCE 101")).toHaveLength(1);
  });
});
