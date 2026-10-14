import type * as Rest from "@figma/rest-api-spec";
import type { IREffect, IRGradient, IRImagePaint, IRPaint, IRStroke } from "./types.js";

/** Resolves a REST variable id to a token name. */
export type TokenOf = (variableId: string | undefined) => string | undefined;

const round = (v: number, places = 2) => {
  const f = 10 ** places;
  const r = Math.round(v * f) / f;
  return Object.is(r, -0) ? 0 : r;
};

const byte = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, "0");

/** `#rrggbb`, or `#rrggbbaa` when not opaque. */
export function hex(c: { r: number; g: number; b: number; a?: number } | undefined, opacity = 1): string {
  if (!c) return "#000000";
  const a = (c.a ?? 1) * opacity;
  const rgb = `#${byte(c.r)}${byte(c.g)}${byte(c.b)}`;
  return a >= 0.999 ? rgb : `${rgb}${byte(a)}`;
}

/** A hex colour from `hex` as CSS `rgba()`, for places that want one. */
export function rgba(h: string): string {
  const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
  const a = h.length > 7 ? round(n(7) / 255, 3) : 1;
  return a === 1 ? h : `rgba(${n(1)}, ${n(3)}, ${n(5)}, ${a})`;
}

const BLEND: Record<string, string> = {
  MULTIPLY: "multiply", SCREEN: "screen", OVERLAY: "overlay", DARKEN: "darken", LIGHTEN: "lighten",
  COLOR_DODGE: "color-dodge", COLOR_BURN: "color-burn", HARD_LIGHT: "hard-light", SOFT_LIGHT: "soft-light",
  DIFFERENCE: "difference", EXCLUSION: "exclusion", HUE: "hue", SATURATION: "saturation", COLOR: "color",
  LUMINOSITY: "luminosity", LINEAR_BURN: "plus-darker", LINEAR_DODGE: "plus-lighter",
};

/** The CSS blend mode of a REST one, or undefined for normal and pass-through. */
export function blendMode(mode: string | undefined): string | undefined {
  return mode ? BLEND[mode] : undefined;
}

const deg = (rad: number) => (rad * 180) / Math.PI;

/** CSS angle of a direction in screen space: 0deg points up, 90deg right. */
function cssAngle(dx: number, dy: number): number {
  const a = deg(Math.atan2(dx, -dy));
  return round(((a % 360) + 360) % 360, 2);
}

function pct(v: number): string {
  return `${round(v * 100, 2)}%`;
}

/**
 * A REST gradient as CSS for a `width` × `height` box. Figma's handles are in
 * the box's 0..1 space: the start, the end, and the second axis.
 */
export function gradient(p: Rest.GradientPaint, width: number, height: number, tokenOf: TokenOf): IRGradient {
  const kind = ({
    GRADIENT_LINEAR: "linear", GRADIENT_RADIAL: "radial", GRADIENT_ANGULAR: "angular", GRADIENT_DIAMOND: "diamond",
  } as const)[p.type as string] ?? "linear";
  const opacity = p.opacity ?? 1;
  const stops = (p.gradientStops ?? []).map((s) => {
    const out: IRGradient["stops"][number] = { color: hex(s.color, opacity), position: round(s.position, 4) };
    const token = tokenOf((s as any).boundVariables?.color?.id);
    if (token) out.token = token;
    return out;
  });
  const h = p.gradientHandlePositions ?? [];
  const handles = h.map((v) => ({ x: round(v.x, 4), y: round(v.y, 4) }));
  const [p0 = { x: 0, y: 0.5 }, p1 = { x: 1, y: 0.5 }, p2 = { x: 0, y: 1 }] = h;
  const w = width || 1;
  const ht = height || 1;
  let css: string;
  if (kind === "linear") {
    const dx = (p1.x - p0.x) * w;
    const dy = (p1.y - p0.y) * ht;
    const angle = cssAngle(dx, dy);
    // CSS's gradient line runs through the centre and spans the box's
    // projection on it; place each stop by projecting Figma's stop point.
    const rad = (angle * Math.PI) / 180;
    const ux = Math.sin(rad);
    const uy = -Math.cos(rad);
    const length = Math.abs(w * ux) + Math.abs(ht * uy) || 1;
    const at = (t: number) => {
      const x = (p0.x + (p1.x - p0.x) * t) * w - w / 2;
      const y = (p0.y + (p1.y - p0.y) * t) * ht - ht / 2;
      return (x * ux + y * uy) / length + 0.5;
    };
    css = `linear-gradient(${angle}deg, ${stops.map((s) => `${rgba(s.color)} ${pct(at(s.position))}`).join(", ")})`;
  } else if (kind === "angular") {
    const angle = cssAngle((p1.x - p0.x) * w, (p1.y - p0.y) * ht);
    css = `conic-gradient(from ${angle}deg at ${pct(p0.x)} ${pct(p0.y)}, ${stops.map((s) => `${rgba(s.color)} ${round(s.position * 360, 2)}deg`).join(", ")})`;
  } else {
    const rx = Math.hypot((p1.x - p0.x) * w, (p1.y - p0.y) * ht);
    const ry = Math.hypot((p2.x - p0.x) * w, (p2.y - p0.y) * ht);
    css = `radial-gradient(${round(rx)}px ${round(ry)}px at ${pct(p0.x)} ${pct(p0.y)}, ${stops.map((s) => `${rgba(s.color)} ${pct(s.position)}`).join(", ")})`;
  }
  const out: IRGradient = { type: kind, stops, css, handles };
  const blend = blendMode(p.blendMode);
  if (blend) out.blendMode = blend;
  return out;
}

const FITS: Record<string, IRImagePaint["fit"]> = { FILL: "cover", FIT: "contain", STRETCH: "crop", TILE: "tile" };

function image(p: Rest.ImagePaint): IRImagePaint {
  const out: IRImagePaint = { type: "image", image: p.imageRef ?? "", fit: FITS[p.scaleMode] ?? "cover" };
  if (p.opacity !== undefined && p.opacity < 1) out.opacity = round(p.opacity, 3);
  if (out.fit === "crop") {
    const t = p.imageTransform;
    if (t) {
      // imageTransform maps the node's 0..1 box into the image's 0..1 space.
      out.crop = { x: round(t[0][2], 4), y: round(t[1][2], 4), width: round(t[0][0], 4), height: round(t[1][1], 4) };
      if (out.crop.x === 0 && out.crop.y === 0 && out.crop.width === 1 && out.crop.height === 1) {
        delete out.crop;
        out.fit = "cover";
      }
    } else out.fit = "cover";
  }
  if (out.fit === "tile" && p.scalingFactor && p.scalingFactor !== 1) out.scale = round(p.scalingFactor, 4);
  if (p.rotation) out.rotation = round(p.rotation, 2);
  const filters = Object.fromEntries(Object.entries(p.filters ?? {}).filter(([, v]) => typeof v === "number" && v !== 0));
  if (Object.keys(filters).length) out.filters = filters as Record<string, number>;
  const blend = blendMode(p.blendMode);
  if (blend) out.blendMode = blend;
  return out;
}

/** Visible REST paints as IR paints, bottom first. */
export function irPaints(list: Rest.Paint[] | undefined, width: number, height: number, tokenOf: TokenOf): IRPaint[] {
  const out: IRPaint[] = [];
  for (const p of list ?? []) {
    if (p.visible === false) continue;
    switch (p.type as string) {
      case "SOLID": {
        const s: IRPaint = { type: "solid", color: hex((p as Rest.SolidPaint).color, p.opacity ?? 1) };
        const token = tokenOf((p as any).boundVariables?.color?.id);
        if (token) s.token = token;
        const blend = blendMode(p.blendMode);
        if (blend) s.blendMode = blend;
        out.push(s);
        break;
      }
      case "GRADIENT_LINEAR":
      case "GRADIENT_RADIAL":
      case "GRADIENT_ANGULAR":
      case "GRADIENT_DIAMOND":
        out.push(gradient(p as Rest.GradientPaint, width, height, tokenOf));
        break;
      case "IMAGE":
        out.push(image(p as Rest.ImagePaint));
        break;
      case "VIDEO":
        out.push({ type: "video" });
        break;
      case "PATTERN":
        out.push({ type: "pattern" });
        break;
      default:
        out.push({ type: "other" });
    }
  }
  return out;
}

const ALIGN: Record<string, IRStroke["align"]> = { INSIDE: "inside", OUTSIDE: "outside", CENTER: "center" };

/** The stroke of a REST node, or undefined when it draws none. */
export function irStroke(n: any, tokenOf: TokenOf): IRStroke | undefined {
  const paints = irPaints(n.strokes, n.size?.x ?? 0, n.size?.y ?? 0, tokenOf);
  if (!paints.length) return undefined;
  const sides = n.individualStrokeWeights;
  const weight = sides ? { top: sides.top, right: sides.right, bottom: sides.bottom, left: sides.left } : n.strokeWeight ?? 1;
  if (typeof weight === "number" ? weight <= 0 : !(weight.top || weight.right || weight.bottom || weight.left)) return undefined;
  const out: IRStroke = { paints, weight, align: ALIGN[n.strokeAlign] ?? "inside" };
  if (n.strokeDashes?.length) out.dashes = n.strokeDashes;
  if (n.strokeCap && n.strokeCap !== "NONE") out.cap = String(n.strokeCap).toLowerCase();
  if (n.strokeJoin && n.strokeJoin !== "MITER") out.join = String(n.strokeJoin).toLowerCase();
  return out;
}

/** Visible REST effects as IR effects. Figma's blur radius is twice CSS's blur(). */
export function irEffects(list: Rest.Effect[] | undefined, tokenOf: TokenOf): IREffect[] {
  const out: IREffect[] = [];
  for (const e of list ?? []) {
    if (e.visible === false) continue;
    if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") {
      const s: IREffect = {
        type: e.type === "DROP_SHADOW" ? "drop-shadow" : "inner-shadow",
        x: round(e.offset?.x ?? 0),
        y: round(e.offset?.y ?? 0),
        blur: round(e.radius ?? 0),
        color: hex(e.color),
      };
      if (e.spread) s.spread = round(e.spread);
      const token = tokenOf((e as any).boundVariables?.color?.id);
      if (token) s.token = token;
      if ((e as any).showShadowBehindNode) s.showBehindNode = true;
      out.push(s);
    } else if (e.type === "LAYER_BLUR" || e.type === "BACKGROUND_BLUR") {
      out.push({ type: e.type === "LAYER_BLUR" ? "layer-blur" : "background-blur", radius: round(e.radius ?? 0) });
    }
  }
  return out;
}

export { round };
