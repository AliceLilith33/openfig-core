# REST API view (`toRestDocument`)

`toRestDocument(doc, { geometry? })` returns what Figma's REST API returns for
`GET /v1/files/:key` (with `?geometry=paths` when `geometry: true`), built from
the `.fig` alone. Its types are `@figma/rest-api-spec`'s, so anything written
against the REST API — FigmaToCode, Framelink, a design-token exporter — can
read a local file.

`toRestVariables(doc)` returns what `GET /v1/files/:key/variables/local`
returns: the file's variables and collections, with library ones copied into
the file marked `remote`.

## How it was checked

Two Figma Community files exist both as `.fig` and as a REST archive of the
same file: *Auto Layout Playground* (784448220678228461) and *Radix Icons*
(1510053249065427020), from the test fixtures of
[gridaco/grida](https://github.com/gridaco/grida) (CC BY 4.0). Comparing every
field of every node:

- All 12,356 REST nodes are produced with the same ids, including 2,924
  instance sublayers.
- 99.78% of fields match (291,176 of 291,816), not counting
  `absoluteRenderBounds` and the undocumented `vectorNetwork`.
- 99.8% of `fillGeometry` and `strokeGeometry` lists are byte for byte the
  same (24,655 of 24,700).

A third pair, 20 nodes of the Material 3 Design Kit (the `.fig` from
open-pencil's test fixtures, the `/files/:key/nodes?geometry=paths` response
from southleft/ds-contracts-poc, both MIT), matches on all 318 fields compared
and on the render bounds of all 12 nodes that have them.

`src/rest/rest.test.ts` repeats the comparison when `OPENFIG_REST_PAIRS` points
at a folder holding `<name>.fig` next to `<name>/document.json`. It also runs
without errors on 179 public files (815,280 REST nodes).

Fed to [Framelink](https://github.com/GLips/Figma-Context-MCP)'s extractors, the
output gives the same simplified node as the real REST response for 97.6% and
95.8% of nodes in the two files (the rest differ mostly through the GROUP and
VECTOR corner fields below), and Framelink reads every file of the corpus.

## Rules the files follow

Most fields are renamed one to one. These are the ones that are not.

**Ids.** A node's id is its guid. A node inside an expanded instance has id
`I<instance>;<key>;<key>...`: the outermost instance's guid, then the
`overrideKey` path down to the node — the path an override would use.

**Types.** SYMBOL is COMPONENT; ROUNDED_RECTANGLE is RECTANGLE; a FRAME with
`isStateGroup` is COMPONENT_SET; a FRAME with `resizeToFit`,
`frameMaskDisabled: false` and no paint is a GROUP. The internal-only canvas
(variables and styles) is left out.

**Defaults kiwi omits.** Constraints default to MIN (LEFT/TOP).
`stackPrimarySizing` defaults to hugging (REST omits `primaryAxisSizingMode`);
`stackCounterSizing` defaults to FIXED (REST writes `counterAxisSizingMode:
"FIXED"`). A text without `lineHeight` is "Auto". `stackCounterSpacing` NaN means
the same gap as `stackSpacing`.

**Sizing.** A child set to stretch (or grow) in auto layout is FILL, unless it
is an auto-layout frame that hugs on that axis: then Figma sizes it to its
content and reports HUG. Absolutely placed text is FIXED both ways.

**Grids.** A GRID frame reports its row and column counts, gaps, and the track
sizes as CSS-like track lists (`auto` hugs, `1fr` flexes, `120px` is fixed,
`minmax()` when the two differ); a child reports its anchor row and column
indexes, spans and alignment.

**Line heights.** kiwi `PIXELS` → `PIXELS`; kiwi `PERCENT` is a percentage of
the font's own line height → `INTRINSIC_%` (no `lineHeightPercentFontSize`);
kiwi `RAW` is a multiple of the font size → `FONT_SIZE_%`. The font's own line
height comes from `derivedTextData.fontMetaData`.

**Styles win over cached values.** A node that uses a fill, stroke or effect
style shows the style node's current paints or effects, and a text using a
text style shows the style's font, size, line height, spacing, case and
decoration — not the copies cached on the node, which go stale when the style
is edited. (Exception: text inside a scaled instance keeps its own, scaled,
values and drops the style reference.) Frames list `fill`/`stroke` style ids
under `fills`/`strokes` as well.

**Variables.** A bound colour shows the variable's value in the mode in force
at the node: `variableModeBySetMap` on the node or the nearest node above it in
the expanded tree. Variable ids are `VariableID:s:l` for local variables and
`VariableID:<key>/<version>` for library ones.

**Variable modes.** `explicitVariableModes` lists the modes set on the node
itself, by collection id (`VariableCollectionId:s:l`, or by key and version
for a library collection) to mode id. In the variables response, a library
variable's id is `VariableID:<key>/<version>`, as references to it are
written; kiwi scopes `STROKE` are REST's `STROKE_COLOR`; `isSoftDeleted` is
`deletedButReferenced`. A deleted collection is left out, as REST does; its
variables stay, marked `deletedButReferenced`, for the aliases that still
name them.

**Text styles' variables.** A text style binds its font size, family and
weight on the style node; REST shows those bindings on each text that uses the
style and binds nothing itself. A binding on the font style is the weight when
its value is a number and the style name when it is a string.

**Render bounds.** `absoluteRenderBounds` is the extent of what is drawn: the
fill and stroke outlines of a shape (an inside stroke drawn only within the
fill), the glyph outlines of text up to where it is truncated, with
underlines, a frame's own box, drop shadows (offset, spread, radius) and layer
blur (radius); children are added to their parent and cut by frames that clip
and by masks. Masks and the operands of boolean operations report `null`; a
group takes the layout box of the text in it.

**Component properties.** Each variant of a set carries a stub for every
property of the set, naming the set's definition by `parentPropDefId`; a
layer's `componentPropertyReferences` name the set's property.

**Instance `overrides`.** An outermost instance lists its own `symbolOverrides`,
by target id, with each kiwi field named as REST names it (`size` → `width`,
`height`; `textData` → `characters`, `characterStyleOverrides`, …; `fontSize` →
`fontSize`, `letterSpacing`, `lineHeight*`; `styleIdForFill` →
`inheritFillStyleId`; `styleIdForStrokeFill` → `strokes`). Field names are
sorted, and the instance's own entry comes first. A nested instance lists what
the instances around it override inside it — not the overrides it carries in its
component.

**Corners.** Only types that can have corners get corner fields (not
BOOLEAN_OPERATION, ELLIPSE, LINE, TEXT, SECTION). Corners that agree give
`cornerRadius`; independent corners that differ give `rectangleCornerRadii`;
`cornerSmoothing` comes with either.

**NaN geometry.** Figma stores NaN as the size and transform of a group whose
children are all hidden, and of a boolean operation with an empty result. JSON
cannot hold NaN, so such a node is placed at its parent's origin and sized to
the box around its children.

**Paths.** Coordinates are written as C's `%g` writes them: 6 significant
digits, an exponent below 0.0001 (`5.65418e-05`), ties rounded to even. A
path's keys come in REST's order: `path`, `overrideID`, `windingRule`.

**Scrolling.** `scrollDirection` is `overflowDirection`
(`VERTICAL_SCROLLING`, ...).

**`backgroundColor`** (deprecated) is the topmost visible fill when that is a
solid colour, else transparent.

**Text.** `fontPostScriptName` is `null` when the file has none, and for Inter
Regular. `layoutVersion` is reported from 3 on. A truncated text has
`textAutoResize: "TRUNCATE"`, and every run in its `styleOverrideTable` repeats
`textTruncation`. Trailing zeros of `characterStyleOverrides` are dropped.

**Interactions.** kiwi stores times in seconds; REST's transition durations,
timeouts and delays are in milliseconds. kiwi `SWAP_STATE` is REST `CHANGE_TO`; `DRAG` is `ON_DRAG`;
directional transitions are named by where they come from in kiwi
(`MOVE_FROM_RIGHT`) and by their direction of motion in REST (`MOVE_IN`,
`LEFT`).

## Known differences

- `absoluteRenderBounds` matches within 1px on 9,022 of 9,026 and 3,324 of
  3,324 nodes; the four left are boolean operations. Background blur and inner
  shadows are taken not to extend it.
- `key` of local components, component sets and styles is empty: Figma assigns
  it on publishing and does not store it in the file (674 mismatches).
- GROUP and VECTOR corner fields Figma derives from their children or vertices
  are not produced (about 500 mismatches). They never change rendering.
- `vectorNetwork`, an undocumented REST field, is not produced.
- Eight text layers that kiwi marks as growing in both directions are FIXED in
  REST, for a reason not found in the file.
- `toRestVariables` has been compared only with Figma's Simple Design System
  ([figma/sds](https://github.com/figma/sds), MIT), whose `tokens.json` its
  script builds from the variables response (booleans dropped, names
  lowercased): all 337 variable ids, the 6 collections and their modes match,
  and 1,823 of 1,841 values; the other 18 differ between versions of the file.
  No raw variables response with its `.fig` is public.
- The track sizing format of grids is not documented by Figma and has not been
  checked against a REST response.
- An instance scaled with K (`uniformScaleFactor`) stores its scaled lengths;
  an override for its root may still hold them unscaled and is not applied to
  them (stroke weights, corner radii, auto-layout gap and padding).
