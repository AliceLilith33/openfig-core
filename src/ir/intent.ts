/**
 * What a design means for a page beyond how it looks, read from signs the
 * file holds: which nodes are clickable, which children repeat as a list, and
 * which variants of a set are its interaction states. Each sign is reported
 * with where it came from; nothing is guessed from layer names or text.
 */
import type { DesignIR, IRComponent, IRInteraction, IRNode, IRRepeat, IRStateValue } from "./types.js";

/** Triggers that make a node clickable: on click, while pressing, mouse down and up. */
const CLICK_TRIGGERS = new Set<IRInteraction["trigger"]>(["click", "press", "mouse-down", "mouse-up"]);

function clicks(n: IRNode | undefined): boolean {
  return !!n?.interactions?.some((i) => CLICK_TRIGGERS.has(i.trigger));
}

/** The words of a name: split at anything not a letter or digit, and between camel-case words. */
function words(name: string): string[] {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

/** Words that make a name about something else that holds or draws a button or link: a group of them, an icon of one. */
const NOT_ONE = new Set(["group", "groups", "section", "icon", "icons", "glyph", "keyboard", "keyboards", "field", "input"]);

/**
 * `button` or `link` when the name has that word (`btn` counts as `button`).
 * Plurals name a group and do not count, nor does a name with a word of
 * `NOT_ONE` or a `+` (`Field + button` holds a button).
 */
function namedAs(name: string): "button" | "link" | undefined {
  const w = words(name);
  if (name.includes("+") || w.some((x) => NOT_ONE.has(x))) return undefined;
  if (w.includes("button") || w.includes("btn")) return "button";
  if (w.includes("link")) return "link";
  return undefined;
}

/** What a variant value says about interaction state, from its words. */
function stateOf(value: string): IRStateValue["state"] {
  const w = words(value);
  const has = (...list: string[]) => list.some((x) => w.includes(x));
  if (has("disabled", "disable")) return "disabled";
  if (has("pressed", "pressing", "press")) return "press";
  if (has("hover", "hovered", "hovering")) return "hover";
  if (has("focus", "focused", "focussed")) return "focus";
  if (has("default", "enabled", "normal", "rest", "idle")) return "default";
  return undefined;
}

function stateProps(c: IRComponent): IRComponent["stateProps"] {
  const variants = c.variants ?? [];
  // Variant id → the prototype triggers that lead to it.
  const reached = new Map<string, Set<NonNullable<IRStateValue["prototype"]>[number]>>();
  for (const s of Object.values(c.states ?? {})) {
    for (const [trigger, target] of Object.entries(s) as Array<[NonNullable<IRStateValue["prototype"]>[number], string]>) {
      let set = reached.get(target);
      if (!set) reached.set(target, (set = new Set()));
      set.add(trigger);
    }
  }
  const out: NonNullable<IRComponent["stateProps"]> = {};
  const props = new Set(variants.flatMap((v) => Object.keys(v.values)));
  for (const prop of props) {
    const values: Record<string, IRStateValue> = {};
    for (const v of variants) {
      const value = v.values[prop];
      if (value === undefined) continue;
      let entry = values[value];
      if (!entry) {
        entry = { variants: [] };
        const state = stateOf(value);
        if (state) entry.state = state;
        values[value] = entry;
      }
      entry.variants.push(v.id);
      const triggers = reached.get(v.id);
      if (triggers) entry.prototype = [...new Set([...(entry.prototype ?? []), ...triggers])].sort();
    }
    if (Object.values(values).some((e) => e.state && e.state !== "default")) out[prop] = values;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Texts inside an instance by their id within it, so the same layer of two instances matches. */
function texts(item: IRNode): Map<string, IRNode> {
  const prefix = `${item.id.startsWith("I") ? item.id : `I${item.id}`};`;
  const out = new Map<string, IRNode>();
  const walk = (n: IRNode) => {
    if (n.text && n.id.startsWith(prefix)) out.set(n.id.slice(prefix.length), n);
    n.children?.forEach(walk);
  };
  item.children?.forEach(walk);
  return out;
}

function repeat(run: IRNode[]): IRRepeat {
  const first = run[0].component!;
  const out: IRRepeat = { component: first.set ?? first.id, name: first.name, items: run.map((n) => n.id) };
  const props = new Set<string>();
  const keys = new Set(run.flatMap((n) => [...Object.keys(n.component!.variant ?? {}), ...Object.keys(n.component!.props ?? {})]));
  for (const k of keys) {
    const values = new Set(run.map((n) => JSON.stringify(n.component!.variant?.[k] ?? n.component!.props?.[k])));
    if (values.size > 1) props.add(k);
  }
  if (props.size) out.props = [...props].sort();
  const all = run.map(texts);
  const names = new Set<string>();
  for (const key of new Set(all.flatMap((m) => [...m.keys()]))) {
    const found = all.map((m) => m.get(key)).filter((n): n is IRNode => !!n);
    if (found.length > 1 && new Set(found.map((n) => n.text!.content)).size > 1) names.add(found[0].name);
  }
  if (names.size) out.texts = [...names];
  // A set's name is the list's name; a variant's own name only says its values.
  if (first.set) out.name = "";
  return out;
}

/** Runs of two or more consecutive in-flow instances of one component among a layout's children. */
function repeats(n: IRNode): IRRepeat[] | undefined {
  if (!n.layout) return undefined;
  const key = (c: IRNode) => (c.type === "instance" && c.component && !c.absolute && c.visible !== false ? c.component.set ?? c.component.id : undefined);
  const out: IRRepeat[] = [];
  const kids = n.children ?? [];
  for (let i = 0; i < kids.length;) {
    const k = key(kids[i]);
    let j = i + 1;
    if (k) while (j < kids.length && key(kids[j]) === k) j++;
    if (k && j - i >= 2) out.push(repeat(kids.slice(i, j)));
    i = j;
  }
  return out.length ? out : undefined;
}

/**
 * Adds `clickable` and `repeats` to the nodes of screens and component
 * definitions, and `stateProps` to component sets.
 */
export function addIntent(ir: DesignIR): void {
  // The definition of each component and variant, for what its instances inherit.
  const definition = new Map<string, IRNode>();
  for (const c of Object.values(ir.components)) {
    if (!c.root) continue;
    if (c.kind === "component") definition.set(c.id, c.root);
    else for (const v of c.root.children ?? []) definition.set(v.id, v);
  }
  const setName = (id: string | undefined) => (id ? ir.components[id]?.name : undefined);

  const walk = (n: IRNode, inClickable: boolean) => {
    const sign: NonNullable<IRNode["clickable"]> = {};
    if (clicks(n)) sign.interaction = true;
    if (n.component) {
      if (clicks(definition.get(n.component.id))) sign.component = true;
      const name = n.component.set ? setName(n.component.set) ?? "" : n.component.name;
      const word = inClickable ? undefined : namedAs(name);
      if (word) sign.name = { word, in: name };
    }
    if (n.text?.link) sign.link = true;
    if (Object.keys(sign).length) n.clickable = sign;
    const list = repeats(n);
    if (list) {
      for (const r of list) if (!r.name) r.name = setName(r.component) ?? "";
      n.repeats = list;
    }
    for (const c of n.children ?? []) walk(c, inClickable || !!n.clickable);
  };
  for (const p of ir.pages) for (const s of p.screens) walk(s.root, false);
  for (const c of Object.values(ir.components)) {
    if (c.root) walk(c.root, false);
    if (c.kind === "set") {
      const s = stateProps(c);
      if (s) c.stateProps = s;
    }
  }
}
