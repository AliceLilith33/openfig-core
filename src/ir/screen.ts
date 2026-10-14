/**
 * One screen of a design IR, with only the components, styles, tokens and
 * assets it uses.
 */
import type { DesignIR, IRAssets, IREffect, IRNode, IRPaint, IRScreen, IRTextStyle } from "./types.js";

/**
 * The IR cut down to one screen (by id, or the screen itself): its page with
 * only that screen and its flows, the components its instances use (and those
 * their definitions use in turn), the styles and tokens it refers to (with
 * the tokens those alias), and its assets. Image and font `nodes` count the
 * uses in what is kept: the screen and those component definitions.
 */
export function screenIR(ir: DesignIR, screen: string | IRScreen): DesignIR {
  const id = typeof screen === "string" ? screen : screen.id;
  const page = ir.pages.find((p) => p.screens.some((s) => s.id === id));
  if (!page) throw new Error(`no screen ${id}`);
  const kept = page.screens.find((s) => s.id === id)!;

  const components = new Set<string>();
  const styles = new Set<string>();
  const tokens = new Set<string>();
  const collections = new Set<string>();
  const svgs = new Set<string>();
  const images = new Map<string, number>();
  const fonts = new Map<string, number>();

  const font = (s: Partial<IRTextStyle>) => {
    const k = `${s.fontFamily}|${s.fontStyle}|${s.fontWeight}|${!!s.italic}`;
    fonts.set(k, (fonts.get(k) ?? 0) + 1);
  };
  const paints = (list: IRPaint[] | undefined, count: boolean) => {
    for (const p of list ?? []) {
      if (p.type === "solid" && p.token) tokens.add(p.token);
      if ("stops" in p) for (const s of p.stops) if (s.token) tokens.add(s.token);
      if (p.type === "image" && p.image && count) images.set(p.image, (images.get(p.image) ?? 0) + 1);
    }
  };
  const effects = (list: IREffect[] | undefined) => {
    for (const e of list ?? []) if ("token" in e && e.token) tokens.add(e.token);
  };
  const component = (cid: string | undefined) => {
    if (!cid || components.has(cid) || !ir.components[cid]) return;
    components.add(cid);
    const root = ir.components[cid].root;
    if (root) walk(root);
  };
  const walk = (n: IRNode) => {
    paints(n.fills, true);
    paints(n.stroke?.paints, true);
    effects(n.effects);
    for (const t of Object.values(n.tokens ?? {})) tokens.add(t);
    for (const c of Object.keys(n.modes ?? {})) collections.add(c);
    for (const s of Object.values(n.styles ?? {})) styles.add(s);
    if (n.asset) svgs.add(n.asset);
    if (n.text) {
      font(n.text.style);
      for (const r of n.text.runs ?? []) {
        if (r.style) font({ ...n.text.style, ...r.style });
        paints(r.fills, false);
      }
    }
    if (n.component) {
      component(n.component.id);
      component(n.component.set);
      // Instance swap properties name a component.
      for (const v of Object.values(n.component.props ?? {})) if (typeof v === "string") component(v);
    }
    for (const c of n.children ?? []) walk(c);
  };
  walk(kept.root);

  for (const s of styles) {
    const style = ir.styles[s];
    if (style?.type === "fill") paints(style.paints, false);
    if (style?.type === "effect") effects(style.effects);
  }

  // Tokens, and the tokens their values alias, in the file's order.
  const queue = [...tokens];
  while (queue.length) {
    const t = ir.tokens.tokens[queue.pop()!];
    for (const v of Object.values(t?.values ?? {})) {
      if (v && typeof v === "object" && !tokens.has(v.token)) {
        tokens.add(v.token);
        queue.push(v.token);
      }
    }
  }
  const pickTokens = Object.fromEntries(Object.entries(ir.tokens.tokens).filter(([k]) => tokens.has(k)));
  for (const t of Object.values(pickTokens)) collections.add(t.collection);

  const assets: IRAssets = {
    images: Object.fromEntries(Object.entries(ir.assets.images).filter(([k]) => images.has(k)).map(([k, v]) => [k, { ...v, nodes: images.get(k)! }])),
    svgs: Object.fromEntries(Object.entries(ir.assets.svgs).filter(([k]) => svgs.has(k))),
    fonts: ir.assets.fonts
      .map((f) => ({ ...f, nodes: fonts.get(`${f.family}|${f.style}|${f.weight}|${!!f.italic}`) ?? 0 }))
      .filter((f) => f.nodes > 0)
      .sort((a, b) => b.nodes - a.nodes),
  };

  return {
    ...ir,
    pages: [{ ...page, screens: [kept], flows: page.flows.filter((f) => f.screen === id) }],
    components: Object.fromEntries(Object.entries(ir.components).filter(([k]) => components.has(k))),
    tokens: { collections: ir.tokens.collections.filter((c) => collections.has(c.name)), tokens: pickTokens },
    styles: Object.fromEntries(Object.entries(ir.styles).filter(([k]) => styles.has(k))),
    assets,
  };
}
