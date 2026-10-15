# Design IR (`toDesignIR`, `designFromFig`)

The design IR describes a file the way a front end is built: screens, layout,
design tokens, components and their states, interactions, and the assets a page
needs. It is meant to be read by code generators and by agents that write
front-end code, and is built on top of the [REST view](rest.md):

```ts
import { parseFig, designFromFig, screenIR, toDesignIR, toRestDocument, toRestVariables } from 'openfig-core';

const ir = designFromFig(parseFig(bytes));

// The same, step by step — or from Figma's REST API instead of a .fig:
const ir2 = toDesignIR(toRestDocument(doc, { geometry: true }), {
  variables: toRestVariables(doc),   // or GET /v1/files/:key/variables/local
  images: doc.images,                // optional: image sizes and types
});

// One screen, with only what it uses:
const home = screenIR(ir, '12:345');
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
  applied with `transform-origin: 0 0`; `rotation` is for reading. See
  [Position and transform](#position-and-transform).

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
| Text | `text: { content, style, runs, lines, autoResize, maxLines, link, measuredLines }`. Runs list only what differs from the base style; Figma indexes their styles by code point, so an emoji counts once. `measuredLines` is how Figma laid the text out when the file was saved: each line's start in `content` (in code points), its width, trailing spaces included, and its baseline from the top of the box, and, when the lines differ in height, each line's height (Figma puts a baseline the line's own height below the one before, so a larger line adds no space under itself; CSS cannot, and a browser can set such a text taller than its `height`, most when the first line is much the tallest). It shows where Figma wrapped, how much wider or narrower a browser's build of the font sets the same line, and where the line sat. It comes from the `.fig` file (`designFromFig`, or `toRestDocument`'s `textLines` passed on as `textLines`); REST has no such field. |
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
- **State variants.** A set's variant property is listed in `stateProps` when
  one of its values names hover, press, focus or disabled. Every value of it
  is listed with the variants that have it, its meaning in `state` when the
  value's words say it (case-insensitive; `default`, `enabled`, `normal`,
  `rest`, `idle` → `default`; `hover`, `hovered` → `hover`; `pressed`,
  `pressing` → `press`; `focus`, `focused` → `focus`; `disabled` →
  `disabled`, which wins in a value like "Disabled Checked"), and in
  `prototype` the triggers of `states` that change another variant to one of
  them. Values that say nothing certain — `Active` (pressed, or the current
  page?), `Selected`, `Checked`, `Error` — are listed without `state`. The
  variant for the hover of `Size=L, State=Default` is the one with
  `State=Hover` and the same other values.
- **Clickable.** `clickable` lists each sign that a node is clickable, so a
  front end can choose a `<button>` or an `<a>` and see why:
  `interaction` — a click, while-pressing, mouse-down or mouse-up
  interaction on the node (hover alone does not count); `component` — the
  definition of an instance's component or variant has one; `link` — the
  whole text is a link; `name` — the name of the instance's component set
  (or component, when not a variant) has the word `button`, `btn` or `link`,
  with the word and the name. Plurals, names with `+` (`Field + button`), and
  names with `group`, `section`, `icon`, `glyph`, `keyboard`, `field` or
  `input` do not count, and `name` is left out inside a node that is already
  clickable. Layer names, shapes and colours are not read: a rectangle and a
  text drawn to look like a button, without an interaction, are not marked.
- **Repeated lists.** In a container with auto layout (flex or grid), two or
  more consecutive children that are instances of one component — of one set,
  for variants — and not placed absolutely are a run in the container's
  `repeats`: the component (or set) id and name, the item ids, the component
  properties whose values differ between the items (`props`), and the names
  of text layers whose content differs (`texts`), matched by their place in
  the instance. These are the item's data; what is the same in all items is
  the template. Instances placed by coordinates in a frame without auto
  layout are not grouped, nor are siblings that share a layer structure
  without being instances.
- **Placeholder content.** Not marked: a .fig file holds no sign that a text
  is sample content rather than the real copy.
- **Artwork.** Vectors, boolean operations, stars and polygons, and frames,
  groups and instances that hold only vector shapes (at least one path, no
  text, images, effects, interactions or auto layout), are drawn as SVG:
  `asset` names an entry of `assets.svgs`, and the node's children are left out.
  So are its fills and stroke, which the artwork draws, except a stroke where
  the parent's auto layout counts strokes (`strokesInLayout`): it stays for
  the space it takes, and is not to be drawn again.
  Frames and groups up to 160px (`iconMaxSize`), any instance, and anything
  marked for SVG export qualify. Identical artwork shares one entry. An
  entry's `width` and `height` are the node's; its `viewBox` grows past them,
  from a negative origin if need be, when strokes or caps are drawn outside
  the node (a line of zero height, an arrow head). A vector filled with an
  image stays a vector node with that fill.
- **Hidden layers.** A hidden layer is dropped unless a component property can
  show it (`propRefs.visible`); then it is kept with `visible: false`.
- **Tokens.** Token names are the variables' names. A library collection copied
  into the file often has a local collection's name; local variables keep the
  plain name and the others are prefixed by their collection. Each token has a
  CSS custom property name: its web code syntax when set, else one made from
  its name.

## One screen (`screenIR`)

`screenIR(ir, screenId)` cuts the IR down to one screen: its page with only
that screen and the flows starting there; the components its instances use
(by `component.id`, `component.set` and instance-swap values), and those the
definitions of these use in turn; the styles and tokens its nodes refer to,
with the tokens their values alias; and the SVG artwork, images and fonts it
uses. Image and font `nodes` count the uses in what is kept: the screen and
the kept component definitions. `openfig-web ir --screen` writes this.

## Reading the IR

### Position and transform

- `x`, `y` is where the node's own top-left corner — its origin before the
  transform — lands in the parent's box. In CSS: `left: x; top: y; width;
  height; transform-origin: 0 0; transform: matrix(a, b, c, d, 0, 0)`. For a
  horizontal flip (`[-1, 0, 0, 1]`) `x` is therefore the right edge of what
  shows; for a 90° turn (`[0, 1, -1, 0]`) of a 48 × 0 line it is the line's top.
- `rotation` is derived from `transform` for reading. Do not apply it on top of
  `transform`, and do not use it alone with CSS's default centre origin.
- `bounds` (only with `transform`) is the transformed box's bounding box in the
  parent's box: where the node shows, and the box Figma's auto layout gives
  a rotated child.
- Transforms nest: a child's `transform` and `bounds` are in its parent's
  untransformed box, inside whatever transform the parent has.
- A screen root's `x`, `y` is its place on the canvas (or in its section); a
  page drawing one screen ignores it.

### Order

- Children are listed bottom first: later children draw on top of earlier
  ones, as elements later in HTML do. With `layout.reverseZ` earlier items are
  on top instead. A `mask` node masks the siblings after it.
- `fills` and `stroke.paints` are also bottom first. CSS `background-image`
  lists its layers top first, so reverse them.

### Auto layout

- `justify` and `align` absent mean start (Figma's "top left"). CSS's default
  `align-items` is `stretch`, so say `flex-start`.
- `sizing` absent on an axis is fixed: use `width` or `height`. `fill` only
  applies inside an auto-layout parent; elsewhere it is the stored size.
- `hug` falls back to the stored size where there is nothing to hug: a node
  with no children or no auto layout (images, shapes, artwork, emptied
  frames), and a frame hugging across a row or column whose children all fill
  that axis. Likewise a child that fills along the axis its parent hugs keeps
  its stored size.
- `repeats` marks repeated lists in auto layout (see
  [Intent the IR adds](#intent-the-ir-adds)). Elsewhere, siblings that are instances of the
  same component (`component.id`, or `component.set` for variants), or that
  share a layer structure, are the best sign of one.

### Text

- The box is the size Figma last laid it out at. A text that hugs its width
  (`autoResize: "width"`) is as wide as its widest measured line rounded up to
  a whole pixel (so in 98% of 10,978 such texts in the public files). Its
  height is the sum of its line heights, but with a fractional line height
  Figma sometimes rounds each line's height, or the total, to whole pixels;
  no single rule was found, so take `height` as given.
- `style.verticalAlign` places the lines in a box taller than them: absent is
  top. It does nothing when the height hugs.
- `style.letterSpacing`, `lineHeight`, `paragraphSpacing`, `paragraphIndent`
  and `listSpacing` are pixels; Figma's percent letter spacing is already
  multiplied by the font size. `lineHeightAuto` marks Figma's "Auto": the
  font's own line height, given in pixels as Figma computes it (from the
  lines Figma laid out where the file keeps no metrics for the font). In
  such text a run in another font or size has its own `lineHeight`, from its
  own font: Figma makes each line as tall as the tallest of its runs' line
  heights, rounded to a whole pixel, and the text's own size sets no
  minimum. With a fixed line height, every line has it.
- `style.textTransform: "capitalize"` is Figma's title case; `small-caps` and
  `all-small-caps` map to `font-variant-caps`. `leadingTrim: "cap"` is CSS's
  `text-box: trim-both cap alphabetic`.
- A text with no `fills` draws no glyphs (it still takes its space), except
  runs that carry `fills` of their own. A run lists `fills` only where they
  differ from the node's.
- A text that uses a text style shows the style's values, also in older files
  that name it by `inheritTextStyleID` and keep stale copies on the node.
  Fill, stroke and effect styles named by the older `inherit*StyleID` fields
  are read the same way (see openfig-core's docs/rest.md).

### Paints and effects

- Image `fit`: `cover`, `contain`, `tile` (at `scale` of the image's pixel
  size), and `crop`, which shows the part of the image given by
  `crop: { x, y, width, height }` as fractions of the image. In CSS:
  `background-size: (100 / width)% (100 / height)%` and
  `background-position: (x / (1 − width) × 100)% (y / (1 − height) × 100)%`.
  A crop Figma also rotates or skews keeps only its scale and offset.
  `rotation` turns the image clockwise in degrees; `filters` are Figma's
  exposure, contrast, saturation, temperature, tint, highlights and shadows,
  -1..1.
- Blurs keep Figma's radius, which is twice CSS's: `layer-blur` is
  `filter: blur(radius / 2)` and `background-blur` is
  `backdrop-filter: blur(radius / 2)`. Shadow `blur` goes into `box-shadow`
  as is, and halved into a `drop-shadow()` filter. (This is the reference
  page's conversion in openfig-web; it was not measured against Figma.)
- `arc` angles are radians, clockwise from 3 o'clock. `end` below `start` is
  the same arc swept the other way: it covers the angles between the two.
  `innerRadius` is a fraction of the radius (a ring).
- An image in `assets.images` without `mime`, `width` and `height` has no bytes
  in the file: it is referenced but not stored.

### Other fields

Every field is described in `src/ir/types.ts`; these are the ones not
covered above:

| Field | Meaning |
|---|---|
| `visible: false` | A hidden layer a component property can show. |
| `minWidth` … `maxHeight` | Auto layout size limits. |
| `gridCell` | Row and column (zero-based), spans, and alignment in a grid parent. |
| `scroll`, `scrollBehavior` | Prototype scrolling: the overflow direction; `fixed` or `sticky` in a scrolling parent. |
| `opacity`, `blendMode` | Layer opacity; CSS `mix-blend-mode` value. Paints have their own `blendMode`. |
| `stroke` | `paints`, `weight` (one, or per side), `align` (`inside`, `outside`, `center`), `dashes` (dash and gap lengths), `cap`, `join`. |
| `radius`, `cornerSmoothing` | One radius or `[top-left, top-right, bottom-right, bottom-left]`; iOS-style smoothing 0..1. |
| `effects` | `drop-shadow` and `inner-shadow` (`x`, `y`, `blur`, `spread`, `color`, `token`, `showBehindNode`: the shadow shows through translucent parts of the node), `layer-blur`, `background-blur`. |
| `mask` | `alpha`, `vector` (by outline) or `luminance`. |
| `layout` (flex) | Also `wrap`, `lineGap` (between wrapped lines), `alignContent`, `strokesInLayout` (borders take up space). |
| `layout` (grid) | `rows`, `columns` as CSS track lists, `rowGap`, `columnGap`, `padding`. |
| `text.lines` | Per line (paragraph): `list` (`ordered`, `unordered`), `indent` level, and `start`, the number an ordered item shows where it restarts the count (from the `.fig` only; REST has no such field). |
| `text.maxLines`, `autoResize: "truncate"` | The text is cut with an ellipsis. |
| `text.link`, `runs[].link` | A URL, or `#<node id>`. |
| `propRefs` | Which component property drives `characters`, `visible` or `mainComponent`. |
| `styles`, `tokens`, `modes` | Shared styles, bound tokens by IR field, and variable modes set on the node. |
| `exports` | The designer's export settings: `format`, `suffix`, `scale`. |
| `component.overrides`, `component.scale` | Layers changed on the instance; a scaled instance's factor. |
| `components[id]` | Also `remote` (from a library), `page`, `variants`, `states`, `stateProps`; props' `preferred` are component keys. |
| `tokens.tokens[name]` | `collection`, `type`, `css`, `values` by mode (`{ token }` for an alias), `scopes`, `description`. |
| `assets` | `images` (`nodes`, `width`, `height`, `mime`), `svgs` (`name`, `width`, `height`, `svg`), `fonts` (`family`, `style`, `weight`, `italic`, `nodes`). |

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

Over the same files' 8,016 screens: 2,932 `repeats` (10,046 items) in 1,414
screens of 25 files; 3,506 `clickable` nodes in 874 screens of 53 files
(2,261 by interaction, 1,279 by name, 263 by component, 23 by link); and
`stateProps` on 349 of 1,057 sets defined in 10 files. Another 965 runs of
instances sit in frames without auto layout and are not marked. A spot check
of 30 `repeats` (from all 25 files), 35 `clickable` nodes and 50 `stateProps` found
one questionable list (two different buttons side by side), one button that
is a drawing of a device's hardware button, and no wrong `state`.

## Limits

- Layout is Figma's, not recomputed: sizes are those Figma last laid out. A
  generator still has to reproduce auto layout in CSS.
- Angular and diamond gradients are approximated in SVG artwork (as radial).
  Masks in artwork clip by the mask's outline; alpha and luminance masks
  outside artwork are only flagged (`mask`).
- Rotated children of auto layout take their rotated bounding box (`bounds`)
  in Figma; CSS transforms do not affect layout.
