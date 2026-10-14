/**
 * `absoluteRenderBounds`: the area a node paints, as REST reports it.
 *
 * Measured against REST responses for the same files: the tight bounds of the
 * filled and stroked outlines (an inside stroke stays within the fill), glyph
 * outlines for text, a frame's own box, drop shadows and layer blur, the
 * children's bounds, all clipped by clipping frames and masks above the node.
 * Masks and the operands of a boolean operation paint nothing themselves.
 */
import type { FigDocument, FigTransform } from "../types.js";
import { getBlobBytes } from "../vector.js";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function union(a: Rect | null, b: Rect | null): Rect | null {
  if (!a) return b;
  if (!b) return a;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.max(a.x + a.width, b.x + b.width) - x, height: Math.max(a.y + a.height, b.y + b.height) - y };
}

/** The overlap of `a` and `b`; null when they do not overlap. `undefined` stands for no limit. */
export function intersect(a: Rect | null, b: Rect | null | undefined): Rect | null {
  if (b === undefined) return a;
  if (!a || !b) return null;
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return right > x && bottom > y ? { x, y, width: right - x, height: bottom - y } : null;
}

/** Tracks the bounding box of points in absolute coordinates. */
class Extent {
  x0 = Infinity;
  y0 = Infinity;
  x1 = -Infinity;
  y1 = -Infinity;
  add(x: number, y: number): void {
    if (x < this.x0) this.x0 = x;
    if (x > this.x1) this.x1 = x;
    if (y < this.y0) this.y0 = y;
    if (y > this.y1) this.y1 = y;
  }
  rect(): Rect | null {
    return this.x0 <= this.x1 ? { x: this.x0, y: this.y0, width: this.x1 - this.x0, height: this.y1 - this.y0 } : null;
  }
}

/** Parameters in (0, 1) where a quadratic or cubic Bézier in one coordinate turns. */
function turns(p: number[]): number[] {
  let a: number, b: number, c: number;
  if (p.length === 3) {
    const d = p[0] - 2 * p[1] + p[2];
    return Math.abs(d) < 1e-12 ? [] : [(p[0] - p[1]) / d].filter((t) => t > 0 && t < 1);
  }
  a = -p[0] + 3 * p[1] - 3 * p[2] + p[3];
  b = 2 * (p[0] - 2 * p[1] + p[2]);
  c = p[1] - p[0];
  if (Math.abs(a) < 1e-12) return Math.abs(b) < 1e-12 ? [] : [-c / b].filter((t) => t > 0 && t < 1);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return [];
  const s = Math.sqrt(disc);
  return [(-b + s) / (2 * a), (-b - s) / (2 * a)].filter((t) => t > 0 && t < 1);
}

function bezier(p: number[], t: number): number {
  const u = 1 - t;
  return p.length === 3 ? u * u * p[0] + 2 * u * t * p[1] + t * t * p[2]
    : u * u * u * p[0] + 3 * u * u * t * p[1] + 3 * u * t * t * p[2] + t * t * t * p[3];
}

/**
 * Add the outline in a `commandsBlob` to `ext`, mapped by `m` (a point
 * `(x, y)` of the blob goes to `m(x, y)`). Glyph outlines use quadratic
 * segments (opcode 3), which geometry blobs do not.
 */
function addBlob(ext: Extent, bytes: Uint8Array, m: (x: number, y: number) => [number, number]): void {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const f = (at: number) => view.getFloat32(at, true);
  let cur: [number, number] = m(0, 0);
  const curve = (pts: Array<[number, number]>) => {
    const all = [cur, ...pts];
    for (const k of [0, 1]) {
      const p = all.map((q) => q[k]);
      for (const t of turns(p)) ext.add(bezier(all.map((q) => q[0]), t), bezier(all.map((q) => q[1]), t));
    }
    cur = pts[pts.length - 1];
    ext.add(cur[0], cur[1]);
  };
  for (let at = 0; at < bytes.length;) {
    const op = bytes[at++];
    if (op === 0) continue;
    if (op === 1 || op === 2) {
      if (at + 8 > bytes.length) return;
      cur = m(f(at), f(at + 4));
      ext.add(cur[0], cur[1]);
      at += 8;
    } else if (op === 3) {
      if (at + 16 > bytes.length) return;
      curve([m(f(at), f(at + 4)), m(f(at + 8), f(at + 12))]);
      at += 16;
    } else if (op === 4) {
      if (at + 24 > bytes.length) return;
      curve([m(f(at), f(at + 4)), m(f(at + 8), f(at + 12)), m(f(at + 16), f(at + 20))]);
      at += 24;
    } else return;
  }
}

/** Bounds of geometry entries (`fillGeometry` or `strokeGeometry`) in absolute coordinates. */
export function geometryBounds(doc: FigDocument, list: any[] | undefined, abs: FigTransform): Rect | null {
  const ext = new Extent();
  const m = (x: number, y: number): [number, number] => [abs.m00 * x + abs.m01 * y + abs.m02, abs.m10 * x + abs.m11 * y + abs.m12];
  for (const g of list ?? []) {
    const bytes = g?.commandsBlob !== undefined ? getBlobBytes(doc, g.commandsBlob) : null;
    if (bytes) addBlob(ext, bytes, m);
  }
  return ext.rect();
}

/**
 * Bounds of a text node's glyph outlines, from the layout Figma saved
 * (`derivedTextData`); `undefined` when there is none. Glyphs past a
 * truncation are not drawn.
 */
export function glyphBounds(doc: FigDocument, derived: any, abs: FigTransform): Rect | null | undefined {
  if (!derived?.glyphs) return undefined;
  const cut = derived.truncationStartIndex >= 0 ? derived.truncationStartIndex : Infinity;
  const ext = new Extent();
  for (const g of derived.glyphs) {
    if (g.commandsBlob === undefined || (g.firstCharacter ?? 0) >= cut) continue;
    const bytes = getBlobBytes(doc, g.commandsBlob);
    if (!bytes) continue;
    const s = g.fontSize ?? 0;
    const px = g.position?.x ?? 0;
    const py = g.position?.y ?? 0;
    // Glyph outlines are in ems with y up, placed at the glyph's baseline position.
    addBlob(ext, bytes, (x, y) => {
      const lx = px + x * s;
      const ly = py - y * s;
      return [abs.m00 * lx + abs.m01 * ly + abs.m02, abs.m10 * lx + abs.m11 * ly + abs.m12];
    });
  }
  // Underlines and strike-throughs, as rectangles in the node's space.
  for (const d of derived.decorations ?? []) {
    for (const r of d.rects ?? []) {
      for (const [lx, ly] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]) {
        ext.add(abs.m00 * lx + abs.m01 * ly + abs.m02, abs.m10 * lx + abs.m11 * ly + abs.m12);
      }
    }
  }
  return ext.rect();
}

/** `r` grown by the node's drop shadows and layer blur (REST effects). */
export function withEffects(r: Rect | null, effects: any[]): Rect | null {
  if (!r) return r;
  let out = r;
  for (const e of effects) {
    if (e.visible === false) continue;
    if (e.type === "DROP_SHADOW") {
      const grow = (e.spread ?? 0) + (e.radius ?? 0);
      out = union(out, { x: r.x + e.offset.x - grow, y: r.y + e.offset.y - grow, width: r.width + 2 * grow, height: r.height + 2 * grow })!;
    } else if (e.type === "LAYER_BLUR") {
      const g = e.radius ?? 0;
      out = { x: out.x - g, y: out.y - g, width: out.width + 2 * g, height: out.height + 2 * g };
    }
  }
  return out;
}
