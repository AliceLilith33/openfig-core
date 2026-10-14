# REST API view (`toRestDocument`)

`toRestDocument(doc, { geometry? })` returns what Figma's REST API returns for
`GET /v1/files/:key` (with `?geometry=paths` when `geometry: true`), built from
the `.fig` alone. Its types are `@figma/rest-api-spec`'s, so anything written
against the REST API — FigmaToCode, Framelink, a design-token exporter — can
read a local file.

## How it was checked

Two Figma Community files exist both as `.fig` and as a REST archive of the
same file: *Auto Layout Playground* (784448220678228461) and *Radix Icons*
(1510053249065427020), from the test fixtures of
[gridaco/grida](https://github.com/gridaco/grida) (CC BY 4.0). Comparing every
field of every node:

- All 12,356 REST nodes are produced with the same ids, including 2,924
  instance sublayers.
- 99.78% of fields match (291,170 of 291,816), not counting
  `absoluteRenderBounds` and the undocumented `vectorNetwork`.

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

**`backgroundColor`** (deprecated) is the topmost visible fill when that is a
solid colour, else transparent.

**Text.** `fontPostScriptName` is `null` when the file has none, and for Inter
Regular. `layoutVersion` is reported from 3 on. A truncated text has
`textAutoResize: "TRUNCATE"`, and every run in its `styleOverrideTable` repeats
`textTruncation`. Trailing zeros of `characterStyleOverrides` are dropped.

**Interactions.** kiwi `SWAP_STATE` is REST `CHANGE_TO`; `DRAG` is `ON_DRAG`;
directional transitions are named by where they come from in kiwi
(`MOVE_FROM_RIGHT`) and by their direction of motion in REST (`MOVE_IN`,
`LEFT`).

## Known differences

- `absoluteRenderBounds` is the bounding box, or `null` for a hidden node or a
  node under one. Figma's value includes strokes, effects and glyph outlines.
- `key` of local components, component sets and styles is empty: Figma assigns
  it on publishing and does not store it in the file (674 mismatches).
- GROUP and VECTOR corner fields Figma derives from their children or vertices
  are not produced (about 500 mismatches). They never change rendering.
- `vectorNetwork`, an undocumented REST field, is not produced.
- An instance scaled with K (`uniformScaleFactor`) shows its own stroke weight
  unscaled in a few cases (11).
