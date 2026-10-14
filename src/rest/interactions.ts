import type * as Rest from "@figma/rest-api-spec";
import { guidString } from "./paint.js";

const SENTINEL = 0xffffffff;

const SIMPLE_TRIGGERS: Record<string, string> = {
  ON_CLICK: "ON_CLICK",
  ON_HOVER: "ON_HOVER",
  ON_PRESS: "ON_PRESS",
  DRAG: "ON_DRAG",
  ON_MEDIA_END: "ON_MEDIA_END",
};

const MOUSE_TRIGGERS: Record<string, string> = {
  MOUSE_ENTER: "MOUSE_ENTER",
  MOUSE_IN: "MOUSE_ENTER",
  MOUSE_LEAVE: "MOUSE_LEAVE",
  MOUSE_OUT: "MOUSE_LEAVE",
  MOUSE_UP: "MOUSE_UP",
  MOUSE_DOWN: "MOUSE_DOWN",
};

function trigger(event: any): Rest.Trigger | null {
  const type = event?.interactionType;
  if (!type) return null;
  if (SIMPLE_TRIGGERS[type]) return { type: SIMPLE_TRIGGERS[type] } as Rest.Trigger;
  if (MOUSE_TRIGGERS[type]) return { type: MOUSE_TRIGGERS[type], delay: event.interactionDuration ?? 0 } as Rest.Trigger;
  if (type === "AFTER_TIMEOUT") return { type: "AFTER_TIMEOUT", timeout: event.transitionTimeout ?? 0 };
  if (type === "ON_KEY_DOWN") {
    return { type: "ON_KEY_DOWN", device: event.keyTrigger?.triggerDevice ?? "KEYBOARD", keyCodes: event.keyTrigger?.keyCodes ?? [] };
  }
  if (type === "ON_MEDIA_HIT") return { type: "ON_MEDIA_HIT", mediaHitTime: event.mediaHitTime ?? 0 };
  return null;
}

const EASINGS: Record<string, Rest.EasingType> = {
  IN_CUBIC: "EASE_IN",
  OUT_CUBIC: "EASE_OUT",
  INOUT_CUBIC: "EASE_IN_AND_OUT",
  LINEAR: "LINEAR",
  IN_BACK_CUBIC: "EASE_IN_BACK",
  OUT_BACK_CUBIC: "EASE_OUT_BACK",
  INOUT_BACK_CUBIC: "EASE_IN_AND_OUT_BACK",
  CUSTOM_CUBIC: "CUSTOM_CUBIC_BEZIER",
  GENTLE_SPRING: "GENTLE",
  QUICK_SPRING: "QUICK",
  BOUNCY_SPRING: "BOUNCY",
  SLOW_SPRING: "SLOW",
  CUSTOM_SPRING: "CUSTOM_SPRING",
};

function easing(a: any): Rest.Easing {
  const type = EASINGS[a.easingType] ?? "EASE_OUT";
  const out: Rest.Easing = { type };
  const f: number[] | undefined = a.easingFunction;
  if (type === "CUSTOM_CUBIC_BEZIER" && f?.length === 4) {
    out.easingFunctionCubicBezier = { x1: f[0], y1: f[1], x2: f[2], y2: f[3] };
  }
  if (type === "CUSTOM_SPRING" && f?.length === 3) {
    out.easingFunctionSpring = { mass: f[0], stiffness: f[1], damping: f[2] };
  }
  return out;
}

const SIDES: Record<string, "LEFT" | "RIGHT" | "TOP" | "BOTTOM"> = { LEFT: "LEFT", RIGHT: "RIGHT", TOP: "TOP", BOTTOM: "BOTTOM" };
const OPPOSITE = { LEFT: "RIGHT", RIGHT: "LEFT", TOP: "BOTTOM", BOTTOM: "TOP" } as const;

/**
 * kiwi names a directional transition by the side it comes from or goes to —
 * `MOVE_FROM_RIGHT`, `SLIDE_OUT_TO_LEFT` — and REST by the direction of motion:
 * a layer moving in from the right travels LEFT.
 */
function transition(a: any): Rest.Transition | null {
  const t: string | undefined = a.transitionType;
  if (!t || t === "INSTANT_TRANSITION") return null;
  const duration = a.transitionDuration ?? 0.3;
  if (t === "DISSOLVE" || t === "SMART_ANIMATE" || t === "SCROLL_ANIMATE") return { type: t, duration, easing: easing(a) };
  const m = /^(MOVE|PUSH|SLIDE)_(FROM|OUT_TO)_(LEFT|RIGHT|TOP|BOTTOM)$/.exec(t);
  if (!m) return { type: "DISSOLVE", duration, easing: easing(a) };
  const [, kind, way, side] = m;
  const from = way === "FROM";
  const type = kind === "PUSH" ? "PUSH" : `${kind}_${from ? "IN" : "OUT"}` as "MOVE_IN" | "MOVE_OUT" | "SLIDE_IN" | "SLIDE_OUT";
  const direction = from ? OPPOSITE[SIDES[side]] : SIDES[side];
  const out: Rest.DirectionalTransition = { type, direction, duration, easing: easing(a) };
  if (a.transitionShouldSmartAnimate) out.matchLayers = true;
  return out;
}

const NAVIGATION: Record<string, Rest.Navigation> = {
  NAVIGATE: "NAVIGATE",
  SWAP: "SWAP",
  OVERLAY: "OVERLAY",
  SCROLL_TO: "SCROLL_TO",
  SWAP_STATE: "CHANGE_TO",
};

function action(a: any): Rest.Action | undefined {
  switch (a?.connectionType) {
    case "BACK": return { type: "BACK" };
    case "CLOSE": return { type: "CLOSE" };
    case "URL": return { type: "URL", url: a.connectionURL ?? "", openInNewTab: a.openUrlInNewTab ?? true } as Rest.Action;
    case "INTERNAL_NODE": {
      const id = a.transitionNodeID;
      const out: any = {
        type: "NODE",
        destinationId: id && !(id.sessionID === SENTINEL && id.localID === SENTINEL) ? guidString(id) : null,
        navigation: NAVIGATION[a.navigationType] ?? "NAVIGATE",
        transition: transition(a),
      };
      if (a.transitionPreserveScroll !== undefined) out.preserveScrollPosition = a.transitionPreserveScroll;
      if (a.overlayRelativePosition) out.overlayRelativePosition = { x: a.overlayRelativePosition.x, y: a.overlayRelativePosition.y };
      if (a.transitionResetVideoPosition !== undefined) out.resetVideoPosition = a.transitionResetVideoPosition;
      if (a.transitionResetScrollPosition !== undefined) out.resetScrollPosition = a.transitionResetScrollPosition;
      if (a.transitionResetInteractiveComponents !== undefined) out.resetInteractiveComponents = a.transitionResetInteractiveComponents;
      return out;
    }
  }
  return undefined;
}

/** REST `interactions` from kiwi `prototypeInteractions`. */
export function interactions(list: any[] | undefined): Rest.Interaction[] {
  const out: Rest.Interaction[] = [];
  for (const i of list ?? []) {
    if (!i || i.isDeleted) continue;
    const actions = (i.actions ?? []).map(action).filter((a: Rest.Action | undefined): a is Rest.Action => !!a);
    out.push({ trigger: trigger(i.event), actions });
  }
  return out;
}
