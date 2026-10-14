import type { FigDocument, FigNode, FigGuid } from "./types.js";
import { positionAt, sortByPosition } from "./utils.js";

export interface ConvertOptions {
  title?: string;
  layout?: "row" | "grid";
  gap?: number;
  wrap?: number;
}

/** Nested instances deeper than this are not expanded (guards malformed or cyclic symbols). */
const MAX_INSTANCE_DEPTH = 32;

function guidToString(guid: FigGuid): string {
  return `${guid.sessionID}:${guid.localID}`;
}

function sameGuid(a: FigGuid | undefined, b: FigGuid | undefined): boolean {
  return !!a && !!b && a.sessionID === b.sessionID && a.localID === b.localID;
}

function safeDeepClone<T>(val: T): T {
  if (val === null || val === undefined) return val;
  if (val instanceof Uint8Array) {
    return new Uint8Array(val) as any;
  }
  // Object.keys() sees no entries on a Map or Set, so the generic object branch
  // would turn `images` into `{}` and drop every image.
  if (val instanceof Map) {
    return new Map([...val].map(([k, v]) => [k, safeDeepClone(v)])) as any;
  }
  if (val instanceof Set) {
    return new Set([...val].map(safeDeepClone)) as any;
  }
  if (Array.isArray(val)) {
    return val.map(safeDeepClone) as any;
  }
  if (typeof val === "object") {
    const copy: any = {};
    for (const k of Object.keys(val)) {
      copy[k] = safeDeepClone((val as any)[k]);
    }
    return copy;
  }
  return val;
}

/** Children of `id` in layer order, without relying on how the map was built. */
function orderedChildren(doc: FigDocument, id: string): FigNode[] {
  return sortByPosition([...(doc.childrenMap.get(id) ?? [])]);
}

function hasAncestorOfType(doc: FigDocument, node: FigNode, type: string): boolean {
  const seen = new Set<string>();
  let parentGuid = node.parentIndex?.guid;
  while (parentGuid) {
    const pid = guidToString(parentGuid);
    if (seen.has(pid)) return false;
    seen.add(pid);
    const parent = doc.nodeMap.get(pid);
    if (!parent) return false;
    if (parent.type === type) return true;
    parentGuid = parent.parentIndex?.guid;
  }
  return false;
}

/**
 * Live slides in presentation order.
 *
 * Positions only order siblings, so slides are collected by walking
 * SLIDE_GRID → SLIDE_ROW → (MODULE) → SLIDE in position order. Comparing
 * positions across parents is meaningless: in a deck where every slide sits in
 * its own MODULE, every slide's position is `!`.
 */
function collectSlidesInOrder(doc: FigDocument): FigNode[] {
  const ordered: FigNode[] = [];
  const seen = new Set<string>();

  const visit = (id: string) => {
    for (const child of orderedChildren(doc, id)) {
      if (child.phase === "REMOVED") continue;
      const childId = guidToString(child.guid);
      if (child.type === "SLIDE") {
        if (!seen.has(childId)) {
          seen.add(childId);
          ordered.push(child);
        }
      } else if (child.type === "SLIDE_ROW" || child.type === "MODULE") {
        visit(childId);
      }
    }
  };

  for (const grid of doc.nodes) {
    if (grid.type === "SLIDE_GRID" && grid.phase !== "REMOVED") visit(guidToString(grid.guid));
  }

  // Slides outside any grid have no presentation order to recover; keep them in
  // file order after the ordered ones. Slides under a grid that the walk did not
  // reach sit below a removed row or module and are dropped.
  for (const node of doc.nodes) {
    if (node.type !== "SLIDE" || node.phase === "REMOVED") continue;
    if (seen.has(guidToString(node.guid))) continue;
    if (hasAncestorOfType(doc, node, "SLIDE_GRID")) continue;
    seen.add(guidToString(node.guid));
    ordered.push(node);
  }

  return ordered;
}

/** A symbol override whose `path` is relative to the symbol scope being baked. */
interface ScopedOverride {
  path: FigGuid[];
  data: any;
}

function overridesOf(instance: FigNode): ScopedOverride[] {
  const overrides: any[] = instance.symbolData?.symbolOverrides ?? [];
  return overrides
    .filter((o) => o?.guidPath?.guids?.length)
    .map((o) => ({ path: o.guidPath.guids as FigGuid[], data: o }));
}

function applyOverride(clone: FigNode, override: any): void {
  if (override.textData && clone.textData) {
    let chars = override.textData.characters || "";
    if (chars === "") chars = " "; // Prevent Figma silent crashes
    clone.textData.characters = chars;
  }
  if (override.fillPaints) {
    clone.fillPaints = safeDeepClone(override.fillPaints);
  }
  if (override.strokePaints) {
    clone.strokePaints = safeDeepClone(override.strokePaints);
  }
}

export function convertDeckToFig(
  deckDoc: FigDocument,
  options: ConvertOptions = {}
): FigDocument {
  const {
    title,
    layout = "row",
    gap = 200,
    wrap = 5,
  } = options;

  // 1. Find all active slide nodes, in presentation order
  const activeSlides = collectSlidesInOrder(deckDoc);

  // Calculate maximum local ID in the source document
  let maxLocalId = 0;
  for (const node of deckDoc.nodes) {
    if (node.guid?.localID > maxLocalId) {
      maxLocalId = node.guid.localID;
    }
  }
  let nextLocalId = maxLocalId + 1;
  const sessionId = 1;

  function generateGuid(): FigGuid {
    return { sessionID: sessionId, localID: nextLocalId++ };
  }

  // 2. Create the output FigDocument skeleton
  const documentNode = deckDoc.nodes.find((n) => n.type === "DOCUMENT");
  const docGuid = documentNode?.guid ?? { sessionID: 0, localID: 0 };

  const canvasGuid = generateGuid();
  const canvasName = title || deckDoc.meta?.file_name || "Page 1";

  const newCanvasNode: FigNode = {
    guid: canvasGuid,
    type: "CANVAS",
    name: canvasName,
    phase: "CREATED",
    parentIndex: {
      guid: docGuid,
      position: "!",
    },
    visible: true,
  };

  const outputNodes: FigNode[] = [];
  // Keep the DOCUMENT node
  if (documentNode) {
    outputNodes.push(safeDeepClone(documentNode));
  }
  outputNodes.push(newCanvasNode);

  const outputBlobs: any[] = [];
  const blobRemap = new Map<number, number>();

  function copyBlob(sourceIdx: number | undefined | null): number | undefined {
    if (sourceIdx === undefined || sourceIdx === null || sourceIdx < 0) return undefined;
    if (!deckDoc.message?.blobs || sourceIdx >= deckDoc.message.blobs.length) return sourceIdx;

    if (blobRemap.has(sourceIdx)) {
      return blobRemap.get(sourceIdx)!;
    }

    const newIdx = outputBlobs.length;
    outputBlobs.push(safeDeepClone(deckDoc.message.blobs[sourceIdx]));
    blobRemap.set(sourceIdx, newIdx);
    return newIdx;
  }

  /**
   * Clone `node` and its live descendants under `parentGuid`, giving every clone
   * a fresh GUID, and push them in pre-order (parents before children).
   *
   * `overrides` carry paths relative to the symbol scope `node` belongs to; a
   * path segment names a node by its `overrideKey`, falling back to its `guid`
   * for nodes that have none. A nested INSTANCE opens a new scope: it is
   * detached into a FRAME, and its symbol's children are baked under it with
   * the instance's own overrides followed by the outer ones addressed through
   * it — later entries win, so the outer override takes precedence.
   *
   * `symbolStack` lists the symbols being expanded; it is non-empty exactly when
   * `node` comes from a symbol rather than from the slide itself.
   */
  function bakeNode(
    node: FigNode,
    parentGuid: FigGuid,
    overrides: ScopedOverride[],
    symbolStack: string[],
    position?: string,
  ): void {
    if (node.phase === "REMOVED") return;

    const clone = safeDeepClone(node);
    clone.guid = generateGuid();
    clone.phase = "CREATED";
    clone.parentIndex = {
      ...(clone.parentIndex ?? {}),
      guid: parentGuid,
      position: position ?? clone.parentIndex?.position ?? "!",
    };

    if (symbolStack.length > 0) {
      // Remove slide-scaffolding parameters
      delete clone.slideThumbnailHash;
      delete clone.editInfo;
      delete clone.prototypeInteractions;
    }

    const key: FigGuid = node.overrideKey ?? node.guid;
    const direct = overrides.filter((o) => o.path.length === 1 && sameGuid(o.path[0], key));

    if (node.type === "INSTANCE") {
      let symbolGuid: FigGuid | undefined = node.symbolData?.symbolID;
      for (const o of direct) {
        if (o.data.overriddenSymbolID) symbolGuid = o.data.overriddenSymbolID; // instance swap
      }

      // Detach: the symbol is not carried into the output, so a live INSTANCE
      // would reference nothing.
      clone.type = "FRAME";
      delete clone.symbolData;
      delete clone.derivedSymbolData;
      delete clone.overriddenSymbolID;
      for (const o of direct) applyOverride(clone, o.data);
      outputNodes.push(clone);

      const throughThis = overrides
        .filter((o) => o.path.length > 1 && sameGuid(o.path[0], key))
        .map((o) => ({ path: o.path.slice(1), data: o.data }));
      bakeSymbolChildren(symbolGuid, clone.guid, [...overridesOf(node), ...throughThis], symbolStack);
      return;
    }

    for (const o of direct) applyOverride(clone, o.data);
    outputNodes.push(clone);

    for (const child of orderedChildren(deckDoc, guidToString(node.guid))) {
      bakeNode(child, clone.guid, overrides, symbolStack);
    }
  }

  function bakeSymbolChildren(
    symbolGuid: FigGuid | undefined,
    parentGuid: FigGuid,
    overrides: ScopedOverride[],
    symbolStack: string[],
  ): void {
    for (const { node, overrides: o, symbolStack: s } of symbolChildEntries(symbolGuid, overrides, symbolStack)) {
      bakeNode(node, parentGuid, o, s);
    }
  }

  function symbolChildEntries(
    symbolGuid: FigGuid | undefined,
    overrides: ScopedOverride[],
    symbolStack: string[],
  ): Array<{ node: FigNode; overrides: ScopedOverride[]; symbolStack: string[] }> {
    if (!symbolGuid) return [];
    const symId = guidToString(symbolGuid);
    if (symbolStack.includes(symId) || symbolStack.length >= MAX_INSTANCE_DEPTH) return [];
    if (!deckDoc.nodeMap.has(symId)) return [];
    const stack = [...symbolStack, symId];
    return orderedChildren(deckDoc, symId).map((node) => ({ node, overrides, symbolStack: stack }));
  }

  // 3. Process each slide
  const totalSlides = activeSlides.length;
  const paddingWidth = Math.max(2, String(totalSlides).length);

  activeSlides.forEach((slide, index) => {
    const slideId = guidToString(slide.guid);

    // Determine frame size - standard is 1920x1080
    const slideSize = slide.size ?? { x: 1920, y: 1080 };
    const width = slideSize.x;
    const height = slideSize.y;

    // Calculate layout position
    let x = 0;
    let y = 0;
    if (layout === "grid") {
      const col = index % wrap;
      const row = Math.floor(index / wrap);
      x = col * (width + gap);
      y = row * (height + gap);
    } else {
      x = index * (width + gap);
      y = 0;
    }

    // Create the slide FRAME
    const frameGuid = generateGuid();
    const frameNode: FigNode = {
      guid: frameGuid,
      type: "FRAME",
      name: "",
      phase: "CREATED",
      parentIndex: {
        guid: canvasGuid,
        position: positionAt(index),
      },
      size: { x: width, y: height },
      transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
      visible: true,
      opacity: 1,
      frameMaskDisabled: false,
      // Inherit fill paints and geometry from the SLIDE node
      fillPaints: slide.fillPaints ? safeDeepClone(slide.fillPaints) : [],
      fillGeometry: slide.fillGeometry ? safeDeepClone(slide.fillGeometry) : [],
      strokePaints: slide.strokePaints ? safeDeepClone(slide.strokePaints) : [],
      strokeWeight: slide.strokeWeight ?? 0,
      strokeAlign: slide.strokeAlign ?? "INSIDE",
    };

    outputNodes.push(frameNode);

    // 4. Bake the slide's children into the frame. A slide-level INSTANCE is
    // flattened: its symbol's children land directly in the frame, in the
    // instance's place. Positions are reassigned across the combined list —
    // flattened children and slide children come from different sibling scopes,
    // so their original positions do not interleave meaningfully.
    const slideChildren = orderedChildren(deckDoc, slideId).filter((c) => c.phase !== "REMOVED");
    const titleInstance = slideChildren.find((c) => c.type === "INSTANCE");
    const entries: Array<{
      node: FigNode;
      overrides: ScopedOverride[];
      symbolStack: string[];
      owner: FigNode;
    }> = [];
    for (const child of slideChildren) {
      if (child.type === "INSTANCE" && child.symbolData?.symbolID && deckDoc.nodeMap.has(guidToString(child.symbolData.symbolID))) {
        for (const entry of symbolChildEntries(child.symbolData.symbolID, overridesOf(child), [])) {
          entries.push({ ...entry, owner: child });
        }
      } else {
        entries.push({ node: child, overrides: [], symbolStack: [], owner: child });
      }
    }

    // The frame is named after the first text in the first slide-level instance,
    // as it reads once overrides are applied.
    let slideTitle = "";
    entries.forEach((entry, i) => {
      const start = outputNodes.length;
      bakeNode(entry.node, frameGuid, entry.overrides, entry.symbolStack, positionAt(i));
      if (!slideTitle && entry.owner === titleInstance) {
        const firstText = outputNodes
          .slice(start)
          .find((n) => n.type === "TEXT" && n.textData?.characters);
        slideTitle = firstText?.textData?.characters?.trim() ?? "";
      }
    });

    const frameIndexStr = String(index + 1).padStart(paddingWidth, "0");
    frameNode.name = slideTitle ? `${frameIndexStr} · ${slideTitle}` : `${frameIndexStr} · Slide ${frameIndexStr}`;
  });

  // 5. Keep global variables or theme metadata if present
  const globalSupportTypes = new Set([
    "VARIABLE",
    "VARIABLE_SET",
    "VARIABLE_COLLECTION",
    "PUBLISHED_VARIABLE_COLLECTION",
  ]);
  const supportNodes = deckDoc.nodes.filter((n) =>
    globalSupportTypes.has(n.type) && n.phase !== "REMOVED"
  );
  for (const sNode of supportNodes) {
    outputNodes.push(safeDeepClone(sNode));
  }

  // Build target childrenMap and nodeMap
  const nodeMap = new Map<string, FigNode>();
  const childrenMap = new Map<string, FigNode[]>();

  for (const node of outputNodes) {
    const id = guidToString(node.guid);
    nodeMap.set(id, node);
  }

  for (const node of outputNodes) {
    if (!node.parentIndex?.guid) continue;
    const pid = guidToString(node.parentIndex.guid);
    if (!childrenMap.has(pid)) {
      childrenMap.set(pid, []);
    }
    childrenMap.get(pid)!.push(node);
  }
  for (const children of childrenMap.values()) sortByPosition(children);

  // Carry over meta and images
  const targetMeta = safeDeepClone(deckDoc.meta) || {};
  targetMeta.file_name = canvasName;

  // Build the new FigDocument
  // Every blob reference, not a hand-picked three.
  //
  // This used to re-index `fillGeometry`, `strokeGeometry` and
  // `vectorNetworkBlob` at the sites that build them, which missed
  // `derivedTextData.glyphs[].commandsBlob` — the cached glyph outlines, and by
  // far the most numerous reference in a text-heavy deck. The output table came
  // out smaller than the source's while nodes still held source indices: one
  // fixture went from 73 blobs to 1 with references up to 72, another from 245
  // to 36 with references up to 244. A reference that still fell in range
  // resolved to the wrong blob; the rest pointed at nothing, which Figma
  // reports as "Internal error during import" while naming nothing about it.
  //
  // Running once over the finished nodes is what makes this exhaustive instead
  // of a longer list that the next schema addition breaks again. It also has to
  // be the *only* pass: remapping a field twice would read an output index as a
  // source index.
  const remapBlobRefs = (value: any): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) remapBlobRefs(item);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (/Blob$/.test(key) && typeof child === "number") {
        value[key] = copyBlob(child);
      } else {
        remapBlobRefs(child);
      }
    }
  };
  for (const node of outputNodes) remapBlobRefs(node);

  const newDoc: FigDocument = {
    header: { prelude: "fig-kiwi", version: deckDoc.header.version },
    nodes: outputNodes,
    nodeMap,
    childrenMap,
    schema: safeDeepClone(deckDoc.schema),
    compiledSchema: deckDoc.compiledSchema,
    rawChunks: [
      deckDoc.rawChunks[0], // Schema chunk (will be re-deflated or kept as-is)
      new Uint8Array(0),    // Placeholder for chunk 1 (pre-compressed canvas message)
      ...deckDoc.rawChunks.slice(2), // Remaining passthrough chunks
    ],
    message: {
      ...safeDeepClone(deckDoc.message),
      nodeChanges: outputNodes,
      blobs: outputBlobs,
    },
    meta: targetMeta,
    thumbnail: safeDeepClone(deckDoc.thumbnail),
    images: safeDeepClone(deckDoc.images),
  };

  return newDoc;
}

