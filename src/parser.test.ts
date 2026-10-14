import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseFig, parseFigBinary, nodeId, createEmptyFigDoc, encodeFigParts, assembleCanvasFig, liveChildren } from "./index.js";
import { deflateSync, unzipSync } from "fflate";

const fixturesDir = join(__dirname, "..", "test-fixtures");

describe("parseFig", () => {
  it("parses circle.fig ZIP archive", () => {
    const data = new Uint8Array(readFileSync(join(fixturesDir, "circle.fig")));
    const doc = parseFig(data);

    expect(doc.header.prelude).toMatch(/^fig-/);
    expect(doc.nodes.length).toBeGreaterThan(0);
    expect(doc.nodeMap.size).toBeGreaterThan(0);
    expect(doc.childrenMap.size).toBeGreaterThan(0);
  });

  it("finds frame and ellipse nodes in circle.fig", () => {
    const data = new Uint8Array(readFileSync(join(fixturesDir, "circle.fig")));
    const doc = parseFig(data);

    const frames = doc.nodes.filter((n) => n.type === "FRAME");
    expect(frames.length).toBeGreaterThanOrEqual(1);
    expect(frames[0].name).toBe("Frame 1");

    const ellipses = doc.nodes.filter((n) => n.type === "ELLIPSE");
    expect(ellipses.length).toBeGreaterThanOrEqual(1);
  });

  it("builds parent-child relationships", () => {
    const data = new Uint8Array(readFileSync(join(fixturesDir, "circle.fig")));
    const doc = parseFig(data);

    const frames = doc.nodes.filter((n) => n.type === "FRAME");
    const frameId = nodeId(frames[0]);
    expect(frameId).toBeTruthy();

    const children = doc.childrenMap.get(frameId!);
    expect(children).toBeDefined();
    expect(children!.length).toBeGreaterThan(0);
  });

  it("extracts meta.json if present", () => {
    const data = new Uint8Array(readFileSync(join(fixturesDir, "circle.fig")));
    const doc = parseFig(data);
    // meta may or may not exist in test fixture
    if (doc.meta) {
      expect(typeof doc.meta).toBe("object");
    }
  });

  it("returns images map", () => {
    const data = new Uint8Array(readFileSync(join(fixturesDir, "circle.fig")));
    const doc = parseFig(data);
    expect(doc.images).toBeInstanceOf(Map);
  });

  it("exposes schema, compiledSchema, and rawChunks", () => {
    const data = new Uint8Array(readFileSync(join(fixturesDir, "circle.fig")));
    const doc = parseFig(data);

    expect(doc.schema).toBeDefined();
    expect(doc.compiledSchema).toBeDefined();
    expect(typeof doc.compiledSchema.encodeMessage).toBe("function");
    expect(typeof doc.compiledSchema.decodeMessage).toBe("function");
    expect(doc.rawChunks).toBeInstanceOf(Array);
    expect(doc.rawChunks.length).toBeGreaterThanOrEqual(2);
    expect(doc.rawChunks[0]).toBeInstanceOf(Uint8Array);
    expect(doc.message).toBeDefined();
    expect(doc.message.nodeChanges).toBe(doc.nodes);
  });
});

describe("parseFigBinary", () => {
  it("parses extracted canvas.fig binary", () => {
    // Extract canvas.fig from ZIP manually using fflate
    const { unzipSync } = require("fflate");
    const data = new Uint8Array(readFileSync(join(fixturesDir, "circle.fig")));
    const unzipped = unzipSync(data);
    const canvasKey = Object.keys(unzipped).find((k: string) => k.endsWith("canvas.fig"));
    expect(canvasKey).toBeTruthy();

    const doc = parseFigBinary(unzipped[canvasKey!]);
    expect(doc.nodes.length).toBeGreaterThan(0);
    expect(doc.header.prelude).toMatch(/^fig-/);
  });
});

describe("nodeId", () => {
  it("returns sessionID:localID string", () => {
    const node = { guid: { sessionID: 0, localID: 1 } } as any;
    expect(nodeId(node)).toBe("0:1");
  });

  it("returns null for missing guid", () => {
    expect(nodeId({} as any)).toBeNull();
  });
});

describe("childrenMap ordering", () => {
  it("orders siblings by position, not by nodeChanges order", () => {
    const doc = createEmptyFigDoc();
    const page = doc.message.nodeChanges.find((n: any) => n.type === "CANVAS" && n.phase !== "REMOVED");
    const frame = (localID: number, position: string) => ({
      guid: { sessionID: 77, localID },
      phase: "CREATED",
      type: "FRAME",
      name: `pos ${position}`,
      parentIndex: { guid: page.guid, position },
      size: { x: 10, y: 10 },
      transform: { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 },
    });
    // Out of order in the array, and "_" vs "A" is where locale collation disagrees.
    doc.message.nodeChanges.push(frame(1, "_"), frame(2, "!"), frame(3, "A"), frame(4, "~"));

    const parts = encodeFigParts(doc);
    const reparsed = parseFigBinary(
      assembleCanvasFig({ ...parts, messageCompressed: deflateSync(parts.messageRaw) }),
    );

    const names = (reparsed.childrenMap.get(nodeId(page)!) ?? [])
      .filter((n) => n.guid.sessionID === 77)
      .map((n) => n.name);
    expect(names).toEqual(["pos !", "pos A", "pos _", "pos ~"]);
  });
});

describe("parseFig input forms", () => {
  it("accepts a bare canvas binary as well as a ZIP archive", () => {
    const zip = new Uint8Array(readFileSync(join(fixturesDir, "circle.fig")));
    const entries = unzipSync(zip);
    const canvas = entries[Object.keys(entries).find((k) => k.endsWith("canvas.fig"))!];

    const fromZip = parseFig(zip);
    const fromCanvas = parseFig(canvas);

    expect(fromCanvas.header).toEqual(fromZip.header);
    expect(fromCanvas.nodes.map(nodeId)).toEqual(fromZip.nodes.map(nodeId));
    expect(fromCanvas.images.size).toBe(0);
    expect(fromCanvas.meta).toBeUndefined();
  });

  it("names both accepted forms when the input is neither", () => {
    expect(() => parseFig(new Uint8Array([0x3c, 0x73, 0x76, 0x67]))).toThrow(/"PK".*"fig-".*3c 73 76 67/);
    expect(() => parseFig(new Uint8Array(0))).toThrow(/no bytes/);
  });

  it("drops a damaged chunk after the message instead of failing, and still fails inside the message", () => {
    const entries = unzipSync(new Uint8Array(readFileSync(join(fixturesDir, "circle.fig"))));
    const canvas = entries[Object.keys(entries).find((k) => k.endsWith("canvas.fig"))!];
    const whole = parseFig(canvas);
    expect(whole.truncated).toBeUndefined();

    // End of chunk 1: 12-byte header, then two length-prefixed chunks.
    const view = new DataView(canvas.buffer, canvas.byteOffset, canvas.byteLength);
    const len0 = view.getUint32(12, true);
    const end1 = 16 + len0 + 4 + view.getUint32(16 + len0, true);

    // A third chunk that declares 1000 bytes but carries 10.
    const damaged = new Uint8Array(end1 + 14);
    damaged.set(canvas.subarray(0, end1));
    new DataView(damaged.buffer).setUint32(end1, 1000, true);
    const doc = parseFig(damaged);
    expect(doc.nodes.map(nodeId)).toEqual(whole.nodes.map(nodeId));
    expect(doc.rawChunks).toHaveLength(2);
    expect(doc.truncated).toMatchObject({ chunk: 2, offset: end1 });

    expect(() => parseFig(canvas.subarray(0, end1 - 1))).toThrow(/Truncated \.fig binary: chunk 1/);
  });
});

describe("liveChildren", () => {
  it("drops REMOVED children and keeps layer order", () => {
    const doc = parseFig(new Uint8Array(readFileSync(join(fixturesDir, "circle.fig"))));
    // Figma keeps deleted nodes in the file with phase REMOVED; mark one so the
    // fixture has something to drop.
    const [parentId, children] = [...doc.childrenMap].find(([, c]) => c.length > 0)!;
    const victim = children[0];
    victim.phase = "REMOVED";

    const live = liveChildren(doc, parentId);
    expect(live).not.toContain(victim);
    expect(live).toEqual(children.slice(1));
    expect(doc.childrenMap.get(parentId)).toContain(victim);
    expect(liveChildren(doc, "no-such-node")).toEqual([]);
  });
});
