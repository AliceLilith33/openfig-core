# Design IR (`toDesignIR`, `designFromFig`)

The design IR describes a file the way a front end is built: screens, layout,
design tokens, components and their states, interactions, and the assets a page
needs. It is meant to be read by code generators and by agents that write
front-end code, and is built on top of the [REST view](rest.md):

```ts
import { parseFig, designFromFig, toDesignIR, toRestDocument, toRestVariables } from 'openfig-core';

const ir = designFromFig(parseFig(bytes));

// The same, step by step — or from Figma's REST API instead of a .fig:
const ir2 = toDesignIR(toRestDocument(doc, { geometry: true }), {
  variables: toRestVariables(doc),   // or GET /v1/files/:key/variables/local
  images: doc.images,                // optional: image sizes and types
});
```

Types are exported from the package (`DesignIR`, `IRNode`, ...) and documented
field by field in `src/ir/types.ts`.

## Shape

```
DesignIR
├─ pages[]         id, name, background, flows (prototype starting points)
│  └─ screens[]    top-level frames, and the frames inside top-level sections
│     └─ root      IRNode tree
├─ components{}    component sets and components: props, variants, states, definition tree
├─ tokens          collections (with mode names) and tokens (value per mode, CSS variable name)
├─ styles{}        shared fill, text and effect styles with their values
└─ assets          images (by hash, with pixel size), svgs (artwork), fonts in use
```

## Conventions

- Lengths are CSS pixels; colours are `#rrggbb` or `#rrggbbaa` with the paint's
  opacity folded in; times are milliseconds.
- Defaults are left out. A node without `layout` places its children
  absolutely; without `sizing` both axes are fixed; without `constraints` it is
  pinned left and top.
- `x`, `y`, `width`, `height` are the node's own, untransformed box in its
  parent's box. A rotated or flipped node adds `transform: [a, b, c, d]`, to be
  applied with `transform-origin: 0 0`; `rotation` is for reading.

## How Figma maps to the IR

| Figma | IR |
|---|---|
| Auto layout | `layout: { type: "flex", direction, gap, justify, align, wrap, lineGap, padding }`. Space-between has no `gap`: it is automatic. |
| Grid auto layout | `layout: { type: "grid", rows, columns }` as CSS track lists; children get `gridCell`. |
| Fill / hug | `sizing: { horizontal: "fill" \| "hug", vertical: ... }`, as Figma reports them. |
| Absolute position in auto layout | `absolute: true`, with `constraints`. |
| Constraints | `constraints: { horizontal, vertical }`: `end`, `both` (left and right), `center`, `scale`. |
| Clip content, scrolling, fixed/sticky | `clip`, `scroll: "x" \| "y" \| "both"`, `scrollBehavior: "fixed" \| "sticky"`. |
| Variables | Tokens. A bound colour carries `token` on the paint; other bound fields are listed in the node's `tokens` (`gap`, `padding.top`, `radius.topLeft`, `text.fontSize`, ...). Modes set on a node are in `modes` by collection name — that is where a light/dark switch happens. |
| Shared styles | `styles: { fill, stroke, text, effect }` ids into `DesignIR.styles`, which holds each style's name and value. |
| Components | `components[id]`: `props` (variant, boolean, text, instance swap; with defaults and options), `variants` with their property values, and `states`. |
| Instances | `type: "instance"` with `component: { id, set, variant, props, overrides, scale }`. Their layers stay expanded unless `instances: "reference"` is passed. |
| Prototype | `interactions`: trigger (`click`, `hover`, `press`, `mouse-enter`, `after-delay`, `key`, ...) and actions (`navigate`, `overlay`, `swap-overlay`, `scroll-to`, `change-to`, `back`, `close`, `open-url`) with target, transition and CSS easing. |
| Text | `text: { content, style, runs, lines, autoResize, maxLines, link }`. Runs list only what differs from the base style; Figma indexes their styles by code point, so an emoji counts once. |
| Gradients | `{ type, stops, css, handles }`: `css` is the gradient for the node's box. |
| Images | `{ type: "image", image, fit: "cover" \| "contain" \| "crop" \| "tile", crop }`. A rectangle or empty frame filled by one image is `type: "image"`. |

## Intent the IR adds

The REST view reports what Figma stores; the IR also says what it means for a
page:

- **Screens.** Every top-level node of a page is a screen, and so is every
  node directly inside a top-level section, or a section nested in one (with
  the section names in `section`).
  Component definitions are not screens; they are in `components`.
- **Hover and press states.** A variant with a "while hovering" or "mouse
  enter" interaction that changes to another variant of its set gets
  `states[variant].hover`; "while pressing" and "mouse down" give `press`, and
  "on click" gives `click`. A front end maps them to `:hover`, `:active` and a
  toggled state.
- **Artwork.** Vectors, boolean operations, stars and polygons, and frames,
  groups and instances that hold only vector shapes (at least one path, no
  text, images, effects, interactions or auto layout), are drawn as SVG:
  `asset` names an entry of `assets.svgs`, and the node's children are left out.
  Frames and groups up to 160px (`iconMaxSize`), any instance, and anything
  marked for SVG export qualify. Identical artwork shares one entry.
- **Hidden layers.** A hidden layer is dropped unless a component property can
  show it (`propRefs.visible`); then it is kept with `visible: false`.
- **Tokens.** Token names are the variables' names. A library collection copied
  into the file often has a local collection's name; local variables keep the
  plain name and the others are prefixed by their collection. Each token has a
  CSS custom property name: its web code syntax when set, else one made from
  its name.

## How it was checked

The IR is built from the REST view, so its accuracy rests on that view's
(see [rest.md](rest.md)). For the two community files that exist both as `.fig`
and as Figma's own REST JSON, the IR built from Figma's JSON and the IR built
from the `.fig` give the same nodes with the same ids:

| File | Nodes | Identical | SVG artwork identical |
|---|---|---|---|
| Auto Layout Playground | 7,960 | 7,952 (99.9%) | 194 of 194 |
| Radix Icons | 646 | 646 (100%) | 554 of 554 |

The 8 that differ are layers inside scaled instances (stroke weight and shadow
offsets) and one paragraph spacing. `src/ir/ir.test.ts` repeats the comparison
when `OPENFIG_REST_PAIRS` is set.

Over 179 public files (about 498,000 IR nodes), every file converts, every
token, style, component and SVG a node refers to is defined, and the IR is
about 40% of the size of the REST JSON with SVG artwork included.

## Limits

- Layout is Figma's, not recomputed: sizes are those Figma last laid out. A
  generator still has to reproduce auto layout in CSS.
- Angular and diamond gradients are approximated in SVG artwork (as radial).
  Masks in artwork clip by the mask's outline; alpha and luminance masks
  outside artwork are only flagged (`mask`).
- Rotated children of auto layout take their rotated bounding box in Figma;
  CSS transforms do not affect layout.
