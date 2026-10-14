/**
 * SVG for a REST node with geometry (`toRestDocument(doc, { geometry: true })`):
 * its own paths and those of its visible descendants, painted as Figma paints
 * them, in the node's box.
 */
import type * as Rest from "@figma/rest-api-spec";
import { hex, round } from "./paint.js";

type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function relative(n: any): Matrix {
  const t = n.relativeTransform;
  return t ? [t[0][0], t[1][0], t[0][1], t[1][1], t[0][2], t[1][2]] : IDENTITY;
}

function isIdentity(m: Matrix): boolean {
  return m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;
}

function matrixAttr(m: Matrix): string {
  if (isIdentity(m)) return "";
  if (m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1) return ` transform="translate(${round(m[4], 3)} ${round(m[5], 3)})"`;
  return ` transform="matrix(${m.map((v) => round(v, 5)).join(" ")})"`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const BLEND: Record<string, string> = {
  MULTIPLY: "multiply", SCREEN: "screen", OVERLAY: "overlay", DARKEN: "darken", LIGHTEN: "lighten",
  COLOR_DODGE: "color-dodge", COLOR_BURN: "color-burn", HARD_LIGHT: "hard-light", SOFT_LIGHT: "soft-light",
  DIFFERENCE: "difference", EXCLUSION: "exclusion", HUE: "hue", SATURATION: "saturation", COLOR: "color",
  LUMINOSITY: "luminosity",
};

class Writer {
  defs: string[] = [];
  private n = 0;
  constructor(private prefix: string) {}
  id(kind: string): string {
    return `${this.prefix}-${kind}${this.n++}`;
  }
}

/** The SVG paint for `p` on a node of `size`, adding a gradient to `defs` when needed. */
function paintAttr(w: Writer, p: Rest.Paint, size: { x: number; y: number }): { fill: string; opacity?: number } | undefined {
  if (p.visible === false) return undefined;
  const opacity = p.opacity ?? 1;
  if (p.type === "SOLID") {
    const a = (p.color.a ?? 1) * opacity;
    return { fill: hex({ ...p.color, a: 1 }), opacity: a < 0.999 ? round(a, 3) : undefined };
  }
  if (p.type.startsWith("GRADIENT_")) {
    const g = p as Rest.GradientPaint;
    const [p0 = { x: 0, y: 0.5 }, p1 = { x: 1, y: 0.5 }, p2 = { x: 0, y: 1 }] = g.gradientHandlePositions ?? [];
    const X = (v: number) => round(v * size.x, 3);
    const Y = (v: number) => round(v * size.y, 3);
    const stops = (g.gradientStops ?? [])
      .map((s) => {
        const a = (s.color.a ?? 1) * opacity;
        return `<stop offset="${round(s.position, 4)}" stop-color="${hex({ ...s.color, a: 1 })}"${a < 0.999 ? ` stop-opacity="${round(a, 3)}"` : ""}/>`;
      })
      .join("");
    const id = w.id("g");
    if (g.type === "GRADIENT_LINEAR") {
      w.defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${X(p0.x)}" y1="${Y(p0.y)}" x2="${X(p1.x)}" y2="${Y(p1.y)}">${stops}</linearGradient>`);
    } else {
      // Radial, and angular and diamond approximated by radial: a unit circle
      // mapped onto the ellipse the handles span.
      const m: Matrix = [X(p1.x) - X(p0.x), Y(p1.y) - Y(p0.y), X(p2.x) - X(p0.x), Y(p2.y) - Y(p0.y), X(p0.x), Y(p0.y)];
      w.defs.push(`<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="matrix(${m.map((v) => round(v, 4)).join(" ")})">${stops}</radialGradient>`);
    }
    return { fill: `url(#${id})` };
  }
  // Images, videos and patterns are not drawn in SVG artwork.
  return undefined;
}

function pathEls(w: Writer, paths: Rest.Path[] | undefined, paints: Rest.Paint[], size: { x: number; y: number }, overrides?: Record<string, any>): string {
  let out = "";
  for (const path of paths ?? []) {
    const own = path.overrideID !== undefined ? overrides?.[String(path.overrideID)]?.fills : undefined;
    const list: Rest.Paint[] = own ?? paints;
    for (const p of list) {
      const a = paintAttr(w, p, size);
      if (!a) continue;
      const rule = path.windingRule === "EVENODD" ? ` fill-rule="evenodd"` : "";
      const op = a.opacity !== undefined ? ` fill-opacity="${a.opacity}"` : "";
      const blend = BLEND[p.blendMode as string];
      const style = blend ? ` style="mix-blend-mode:${blend}"` : "";
      out += `<path d="${esc(path.path)}"${rule} fill="${a.fill}"${op}${style}/>`;
    }
  }
  return out;
}

const CONTAINERS = new Set(["FRAME", "GROUP", "COMPONENT", "COMPONENT_SET", "INSTANCE", "SECTION"]);

/** The node's content in its own coordinates. */
function body(w: Writer, n: any): string {
  const size = n.size ?? { x: 0, y: 0 };
  let out = pathEls(w, n.fillGeometry, n.fills ?? [], size, n.fillOverrideTable);
  if (n.type === "BOOLEAN_OPERATION") return out + pathEls(w, n.strokeGeometry, n.strokes ?? [], size);
  let kids = "";
  let clip: string | undefined;
  let clipped = "";
  for (const c of n.children ?? []) {
    if (c.visible === false) continue;
    if (c.isMask) {
      // A mask clips the siblings above it, up to the next mask.
      if (clip) kids += `<g clip-path="url(#${clip})">${clipped}</g>`;
      clipped = "";
      clip = w.id("m");
      const paths = (c.fillGeometry ?? []).map((p: Rest.Path) => `<path d="${esc(p.path)}"${p.windingRule === "EVENODD" ? ` clip-rule="evenodd"` : ""}${matrixAttr(relative(c))}/>`).join("");
      w.defs.push(`<clipPath id="${clip}">${paths}</clipPath>`);
      continue;
    }
    const el = node(w, c);
    if (clip) clipped += el;
    else kids += el;
  }
  if (clip) kids += `<g clip-path="url(#${clip})">${clipped}</g>`;
  if (kids && CONTAINERS.has(n.type) && n.clipsContent) {
    const id = w.id("c");
    w.defs.push(`<clipPath id="${id}"><rect width="${round(size.x, 3)}" height="${round(size.y, 3)}"/></clipPath>`);
    kids = `<g clip-path="url(#${id})">${kids}</g>`;
  }
  out += kids;
  out += pathEls(w, n.strokeGeometry, n.strokes ?? [], size);
  return out;
}

function node(w: Writer, n: any): string {
  const inner = body(w, n);
  if (!inner) return "";
  const attrs = [matrixAttr(relative(n))];
  if (n.opacity !== undefined && n.opacity < 1) attrs.push(` opacity="${round(n.opacity, 3)}"`);
  const blend = BLEND[n.blendMode];
  if (blend) attrs.push(` style="mix-blend-mode:${blend}"`);
  const a = attrs.join("");
  return a ? `<g${a}>${inner}</g>` : inner;
}

/** Whether `n` and its visible descendants have the geometry `nodeSvg` needs. */
export function hasGeometry(n: any): boolean {
  if (n.visible === false) return true;
  if (!Array.isArray(n.fillGeometry) && !Array.isArray(n.strokeGeometry)) return false;
  return n.type === "BOOLEAN_OPERATION" || (n.children ?? []).every(hasGeometry);
}

/**
 * The SVG document for a REST node: `viewBox` is the node's box, and strokes
 * that reach outside it stay visible. The node's own opacity and blend mode
 * are left to the element that shows it. `idPrefix` keeps gradient and clip ids
 * unique when several are inlined in one page.
 */
export function nodeSvg(n: any, idPrefix = "s"): string {
  const w = new Writer(idPrefix.replace(/[^A-Za-z0-9_-]/g, "_"));
  const size = n.size ?? { x: 0, y: 0 };
  const inner = body(w, n);
  const W = round(size.x, 3);
  const H = round(size.y, 3);
  const defs = w.defs.length ? `<defs>${w.defs.join("")}</defs>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" overflow="visible">${defs}${inner}</svg>`;
}
