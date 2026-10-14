/**
 * Tree traversal and coordinate helpers over a parsed FigDocument.
 *
 * The node tree is stored flat: each node names its parent in
 * `parentIndex.guid`, and `childrenMap` lists children in layer order. These
 * helpers walk that structure without assuming it is well formed — a parent
 * reference can dangle, and a malformed file can contain a cycle.
 */

import type { FigDocument, FigNode, FigTransform } from "./types.js";
import { nodeId } from "./utils.js";

export const IDENTITY_TRANSFORM: Readonly<FigTransform> = Object.freeze({
  m00: 1,
  m01: 0,
  m02: 0,
  m10: 0,
  m11: 1,
  m12: 0,
});

/** The node's parent, or `undefined` for the root or a dangling reference. */
export function parentOf(doc: FigDocument, node: FigNode): FigNode | undefined {
  const guid = node.parentIndex?.guid;
  return guid ? doc.nodeMap.get(`${guid.sessionID}:${guid.localID}`) : undefined;
}

/** The node's ancestors, nearest first. Stops at a missing parent or a cycle. */
export function ancestors(doc: FigDocument, node: FigNode): FigNode[] {
  const out: FigNode[] = [];
  const seen = new Set<string | null>([nodeId(node)]);
  let parent = parentOf(doc, node);
  while (parent && !seen.has(nodeId(parent))) {
    seen.add(nodeId(parent));
    out.push(parent);
    parent = parentOf(doc, parent);
  }
  return out;
}

/** The CANVAS (page) the node sits on, if any. */
export function pageOf(doc: FigDocument, node: FigNode): FigNode | undefined {
  if (node.type === "CANVAS") return node;
  return ancestors(doc, node).find((a) => a.type === "CANVAS");
}

export interface WalkOptions {
  /** Visit nodes whose `phase` is `REMOVED`, and their subtrees. Default `false`. */
  includeRemoved?: boolean;
}

/**
 * Return `false` from the visitor to skip the node's children.
 * `depth` is 0 for the root.
 */
export type WalkVisitor = (node: FigNode, depth: number, parent: FigNode | undefined) => void | boolean;

/**
 * Visit `root` and its descendants depth-first, parents before children,
 * siblings in layer order (back to front).
 *
 * Instances are not expanded — an INSTANCE has no children of its own in the
 * file; use `resolveInstance` for its content. A node reached twice through a
 * malformed parent chain is visited once.
 */
export function walk(
  doc: FigDocument,
  root: FigNode | string,
  visit: WalkVisitor,
  { includeRemoved = false }: WalkOptions = {},
): void {
  const start = typeof root === "string" ? doc.nodeMap.get(root) : root;
  if (!start) return;

  const seen = new Set<string | null>();
  // Explicit stack: real files nest deeper than is comfortable for recursion.
  const stack: Array<{ node: FigNode; depth: number; parent: FigNode | undefined }> = [
    { node: start, depth: 0, parent: undefined },
  ];
  while (stack.length > 0) {
    const { node, depth, parent } = stack.pop()!;
    const id = nodeId(node);
    if (seen.has(id)) continue;
    seen.add(id);
    if (!includeRemoved && node.phase === "REMOVED") continue;
    if (visit(node, depth, parent) === false) continue;
    const children = id ? doc.childrenMap.get(id) ?? [] : [];
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push({ node: children[i], depth: depth + 1, parent: node });
    }
  }
}

/** Every node under `root` (inclusive) that `predicate` accepts, in walk order. */
export function findAll(
  doc: FigDocument,
  root: FigNode | string,
  predicate: (node: FigNode) => boolean,
  options?: WalkOptions,
): FigNode[] {
  const out: FigNode[] = [];
  walk(doc, root, (node) => { if (predicate(node)) out.push(node); }, options);
  return out;
}

/** `a × b`: the transform that applies `b`, then `a`. */
export function multiplyTransform(a: FigTransform, b: FigTransform): FigTransform {
  return {
    m00: a.m00 * b.m00 + a.m01 * b.m10,
    m01: a.m00 * b.m01 + a.m01 * b.m11,
    m02: a.m00 * b.m02 + a.m01 * b.m12 + a.m02,
    m10: a.m10 * b.m00 + a.m11 * b.m10,
    m11: a.m10 * b.m01 + a.m11 * b.m11,
    m12: a.m10 * b.m02 + a.m11 * b.m12 + a.m12,
  };
}

/** Map a point through a transform. */
export function applyTransform(t: FigTransform, x: number, y: number): { x: number; y: number } {
  return { x: t.m00 * x + t.m01 * y + t.m02, y: t.m10 * x + t.m11 * y + t.m12 };
}

/**
 * The node's transform in page coordinates — Figma's `absoluteTransform`.
 *
 * A node's `transform` is relative to its parent; this composes them from the
 * node up to, but not including, its CANVAS. A node with no `transform`
 * contributes identity. For a node that is not on a page, the chain runs to
 * the root.
 */
export function getAbsoluteTransform(doc: FigDocument, node: FigNode): FigTransform {
  if (node.type === "CANVAS" || node.type === "DOCUMENT") return { ...IDENTITY_TRANSFORM };
  let result: FigTransform = node.transform ?? IDENTITY_TRANSFORM;
  for (const ancestor of ancestors(doc, node)) {
    if (ancestor.type === "CANVAS" || ancestor.type === "DOCUMENT") break;
    if (ancestor.transform) result = multiplyTransform(ancestor.transform, result);
  }
  return { ...result };
}

export interface FigRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The axis-aligned box, in page coordinates, around the node's own
 * `size` rectangle once transformed. It is not a render bound: strokes,
 * effects and content outside a non-clipping frame are not included.
 */
export function getAbsoluteBoundingBox(doc: FigDocument, node: FigNode): FigRect {
  const t = getAbsoluteTransform(doc, node);
  const w = node.size?.x ?? 0;
  const h = node.size?.y ?? 0;
  const corners = [
    applyTransform(t, 0, 0),
    applyTransform(t, w, 0),
    applyTransform(t, 0, h),
    applyTransform(t, w, h),
  ];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
