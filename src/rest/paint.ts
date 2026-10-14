import type * as Rest from "@figma/rest-api-spec";
import type { FigColor, FigTransform } from "../types.js";

/** A guid as REST writes node ids: `sessionID:localID`. */
export function guidString(guid: { sessionID: number; localID: number } | undefined): string {
  return guid ? `${guid.sessionID}:${guid.localID}` : "";
}

/**
 * The REST id of a variable reference: `VariableID:s:l` for a variable in this
 * file, `VariableID:<key>/<version>` for a library variable.
 */
export function variableId(ref: any): string | undefined {
  if (ref?.guid) return `VariableID:${guidString(ref.guid)}`;
  if (ref?.assetRef?.key) return `VariableID:${ref.assetRef.key}/${ref.assetRef.version ?? ""}`;
  return undefined;
}

/** `{ type: "VARIABLE_ALIAS", id }` for an ALIAS `VariableData`, else undefined. */
export function variableAlias(data: any): Rest.VariableAlias | undefined {
  if (data?.dataType !== "ALIAS") return undefined;
  const id = variableId(data.value?.alias);
  return id ? { type: "VARIABLE_ALIAS", id } : undefined;
}

export function color(c: FigColor | undefined): Rest.RGBA {
  return { r: c?.r ?? 0, g: c?.g ?? 0, b: c?.b ?? 0, a: c?.a ?? 1 };
}

function hex(bytes: Uint8Array | number[] | undefined): string | null {
  if (!bytes) return null;
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function invert(t: FigTransform): FigTransform | undefined {
  const det = t.m00 * t.m11 - t.m01 * t.m10;
  if (Math.abs(det) < 1e-12) return undefined;
  return {
    m00: t.m11 / det,
    m01: -t.m01 / det,
    m02: (t.m01 * t.m12 - t.m11 * t.m02) / det,
    m10: -t.m10 / det,
    m11: t.m00 / det,
    m12: (t.m10 * t.m02 - t.m00 * t.m12) / det,
  };
}

/**
 * REST `gradientHandlePositions`, in the node's normalised space: the
 * gradient's start, end and width handles. Figma stores the inverse — a
 * transform from node space into gradient space, where the gradient runs from
 * (0, 0.5) to (1, 0.5).
 */
function gradientHandles(transform: FigTransform | undefined): Rest.Vector[] {
  const inv = invert(transform ?? { m00: 1, m01: 0, m02: 0, m10: 0, m11: 1, m12: 0 });
  if (!inv) return [];
  const at = (x: number, y: number) => ({ x: inv.m00 * x + inv.m01 * y + inv.m02, y: inv.m10 * x + inv.m11 * y + inv.m12 });
  return [at(0, 0.5), at(1, 0.5), at(0, 1)];
}

function imageTransform(t: FigTransform | undefined): Rest.Transform | undefined {
  if (!t) return undefined;
  return [
    [t.m00, t.m01, t.m02],
    [t.m10, t.m11, t.m12],
  ];
}

const SCALE_MODES: Record<string, Rest.ImagePaint["scaleMode"]> = {
  FILL: "FILL",
  FIT: "FIT",
  TILE: "TILE",
  STRETCH: "STRETCH",
};

/** Resolves a bound colour variable to its value in the current modes. */
export type ColorResolver = (colorVar: any) => FigColor | undefined;

export function paint(p: any, resolve?: ColorResolver): Rest.Paint | undefined {
  if (!p?.type) return undefined;
  const out: any = { blendMode: p.blendMode ?? "NORMAL", type: p.type };
  if (p.visible === false) out.visible = false;
  if (p.opacity !== undefined && p.opacity !== 1) out.opacity = p.opacity;
  switch (p.type) {
    case "SOLID": {
      out.color = color(p.color);
      const alias = variableAlias(p.colorVar);
      if (alias) {
        out.boundVariables = { color: alias };
        const value = resolve?.(p.colorVar);
        if (value) out.color = { r: value.r, g: value.g, b: value.b, a: out.color.a };
      }
      break;
    }
    case "GRADIENT_LINEAR":
    case "GRADIENT_RADIAL":
    case "GRADIENT_ANGULAR":
    case "GRADIENT_DIAMOND": {
      out.gradientHandlePositions = gradientHandles(p.transform);
      const stops: any[] = p.stopsVar?.length ? p.stopsVar : p.stops ?? [];
      out.gradientStops = stops.map((s) => {
        const stop: any = { color: color(s.color), position: s.position };
        const alias = variableAlias(s.colorVar);
        if (alias) {
          stop.boundVariables = { color: alias };
          const value = resolve?.(s.colorVar);
          if (value) stop.color = color(value);
        }
        return stop;
      });
      break;
    }
    case "IMAGE": {
      out.scaleMode = SCALE_MODES[p.imageScaleMode ?? "STRETCH"] ?? "FILL";
      out.imageRef = hex(p.image?.hash);
      if (out.scaleMode === "STRETCH") out.imageTransform = imageTransform(p.transform);
      if (out.scaleMode === "TILE") out.scalingFactor = p.scale ?? 1;
      if (p.rotation) out.rotation = p.rotation;
      if (p.paintFilter) out.filters = { ...p.paintFilter };
      break;
    }
  }
  return out;
}

export function paints(list: any[] | undefined, resolve?: ColorResolver): Rest.Paint[] {
  return (list ?? []).map((p) => paint(p, resolve)).filter((p): p is Rest.Paint => !!p);
}

const EFFECT_TYPES: Record<string, Rest.Effect["type"]> = {
  DROP_SHADOW: "DROP_SHADOW",
  INNER_SHADOW: "INNER_SHADOW",
  FOREGROUND_BLUR: "LAYER_BLUR",
  BACKGROUND_BLUR: "BACKGROUND_BLUR",
};

export function effects(list: any[] | undefined, resolve?: ColorResolver): Rest.Effect[] {
  const out: Rest.Effect[] = [];
  for (const e of list ?? []) {
    const type = EFFECT_TYPES[e?.type];
    if (!type) continue;
    const effect: any = { type, visible: e.visible !== false, radius: e.radius ?? 0 };
    if (type === "DROP_SHADOW" || type === "INNER_SHADOW") {
      effect.color = color(resolve && e.colorVar?.dataType === "ALIAS" ? resolve(e.colorVar) ?? e.color : e.color);
      effect.blendMode = e.blendMode ?? "NORMAL";
      effect.offset = { x: e.offset?.x ?? 0, y: e.offset?.y ?? 0 };
      if (e.spread) effect.spread = e.spread;
      if (type === "DROP_SHADOW") effect.showShadowBehindNode = e.showShadowBehindNode ?? false;
    }
    const alias = variableAlias(e.colorVar);
    if (alias) effect.boundVariables = { color: alias };
    out.push(effect);
  }
  return out;
}
