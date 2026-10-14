# Changelog

All notable changes to `openfig-core` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **`childrenMap` listed siblings in `nodeChanges` order, not layer order.** `nodeChanges` is not sorted by `parentIndex.position`; 25 parents in one reference file came out reordered. `parseFigBinary` now sorts each sibling list by position, byte by byte, as Figma does.
- **`convertDeckToFig` dropped every image.** The deep clone it used walks `Object.keys`, which sees nothing in a `Map`, so `images` came back as `{}` — and `createFigZip` then threw `input.images is not iterable`.
- **`convertDeckToFig` wrote positions outside `!`–`~` past 94 slides**, which makes Figma reject the whole file. Frame positions now come from `positionAt`.
- **`convertDeckToFig` could put slides out of order.** It sorted slides by their own positions with `localeCompare`, but positions only order siblings: in a deck where each slide sits in its own `MODULE`, every slide is at `!`. Slides are now collected by walking `SLIDE_GRID` → `SLIDE_ROW` → `MODULE` → `SLIDE` in position order. Slides under a removed row or module are no longer included.
- **`convertDeckToFig` matched symbol overrides by `guid`.** Override paths address nodes by `overrideKey`, which differs from the guid on every overrideable node in the reference decks, so overrides on real files were not applied. Multi-segment paths are now resolved through each nested instance instead of by their last segment alone.
- **`convertDeckToFig` left nested instances pointing at symbols it does not carry over.** Every instance is now baked: detached into a `FRAME`, with its symbol's children expanded under it and its overrides applied (outer overrides win; `overriddenSymbolID` swaps are honoured; cyclic symbols stop expanding). Every slide-level instance is baked, not only the first, and children of a slide are re-positioned so flattened instance content keeps its place among the slide's other children.
- **`convertDeckToFig` copied variables without their parent.** Figma keeps `VARIABLE` and `VARIABLE_SET` nodes on the document's internal-only canvas, which the conversion did not carry over, leaving every variable pointing at a missing node. The internal-only canvas is now kept with its GUID; one is created when the source has none, and a variable whose parent is not carried over is moved onto it.
- **`geometryBlobToSVGPath` discarded precision.** Rounding to two decimal places changed 92% of the coordinates in the reference corpus (1.03M of 1.12M). Output is now exact by default: `encodeCommandsBlob(parseSVGPathData(path))` reproduces every reference blob byte for byte.
- **`geometryBlobToSVGPath` silently truncated** at an unknown opcode or a short final command, returning part of the shape as if it were all of it.
- **`convertDeckToFig` applied only three override fields.** Overrides in real files set `visible`, `name`, `size` and `styleIdForFill` far more often than text or paint, and all of them were dropped, as was Figma's computed layout in `derivedSymbolData` and every override addressed to the instance itself (a path naming the symbol's own key). Conversion now goes through `resolveTree`, which applies all of them.
- **`encodeVectorNetwork` dropped every segment's `styleID`.** The segment's leading word, previously treated as unknown and written as `0`, is a `styleOverrideTable` index like the vertex's. It is 0 throughout the reference fixtures, but 4.2M of 8.6M segments in 181 public files carry one, every value naming an existing table entry (`strokeCap`, `strokeJoin`, `cornerRadius`, ...). It is now decoded as `segment.styleID` and written back; all 208,179 vector networks in that corpus round-trip byte for byte (5,543 did not).
- **A paint bound to a colour variable with alpha was drawn too transparent.** Figma caches such a paint as `color.a = 1` and the variable's alpha as `opacity`, but `resolvePaintColor` returned the variable's alpha in `color.a`, so `color.a * opacity` squared it (11,204 paints in the public corpus). `resolvePaintColor` now returns `a: 1` for a bound paint, and the new `resolvePaint` returns `{ color, opacity }`. A `colorVar` holding a literal colour rather than an alias is no longer treated as a binding; the paint's own colour wins. All 172,118 bound paints in the public corpus now match Figma's cached colour and alpha.
- **`resolveTree` applied a nested instance's own overrides after an enclosing instance swapped it.** An outer `overriddenSymbolID` — even to the same component — discards the nested instance's `symbolOverrides` and `derivedSymbolData`, as Figma's own derived data shows; 116 more derived sizes and transforms in the public corpus now match, none fewer.
- **A damaged chunk after the message made the whole file unreadable.** When the binary ends inside chunk 2 or later, the schema and message still decode; the damaged chunk is left out of `rawChunks` and reported in `doc.truncated`.
- **`parseFig` rejected a bare canvas binary.** Input starting with a `fig-` prelude is now parsed directly; only ZIP archives were accepted before.

### Added

- The built-in schema (`figKiwiSchema.ts`) and `Kiwi` types are regenerated from a format-version-106 file: 631 definitions and 4,002 fields, up from 550 and 3,452. Its fields are a superset of the previous schema and of every schema in 181 public files, other than fields Figma has removed. Parsing never depended on it — files are decoded with their own embedded schema — but nodes from current files now type-check against `Kiwi`.
- `comparePosition`, `sortByPosition` and `positionAt` — read and write `parentIndex.position` in Figma's order.
- `parseCommandsBlob(blob, { strict })` — decodes a geometry `commandsBlob` into `VectorPathCommand[]` with the stored float32 values.
- `liveChildren(doc, id)` — a node's children in layer order, without `REMOVED` nodes.
- `resolveInstance(doc, instance)` and `resolveTree(doc, node)` — what an instance displays: its symbol's content with overrides, `derivedSymbolData` and component property values applied, nested instances expanded and instance swaps followed. Every override and derived entry in the reference corpus (21,608 across 440 instances) lands on exactly one node, and every derived size and transform matches. With `walkResolved` and `overrideKeyOf`.
- Variable resolution: `resolveVariable`, `resolveVariableData`, `resolvePaintColor` and `resolveBoundVariables`, with `findVariable`, `variableSetOf`, `variableModes` and `explicitModes`. Aliases are followed, library variables resolve by asset key, and modes come from `variableModeBySetMap`. All 107 variable-bound paints in the reference corpus resolve to the colour Figma cached on the paint.
- `Kiwi` — TypeScript types for all 631 schema definitions (`Kiwi.NodeChange`, `Kiwi.Paint`, `Kiwi.NodeType`, ...), generated from `figKiwiSchema.ts` by `src/utilities/generateKiwiTypes.ts`. A test fails when they go stale, and every node decoded from the reference fixtures conforms to them.
- Tree helpers: `walk`, `findAll`, `parentOf`, `ancestors`, `pageOf`. They tolerate dangling parents and parent cycles.
- `getAbsoluteTransform` and `getAbsoluteBoundingBox` — page coordinates, composed up to the node's `CANVAS`; with `multiplyTransform`, `applyTransform` and `IDENTITY_TRANSFORM`.

### Changed

- `geometryBlobToSVGPath(blob, { precision, strict })` writes exact coordinates unless given a `precision`; pass `precision: 2` for the previous output. It now throws on an unknown opcode or truncated command, naming the byte offset; pass `strict: false` to get the decoded prefix instead. `resolveVectorNodePaths`, which calls it, throws in the same cases. No reference blob triggers either.

### Known limitations

- Component property assignments (`componentPropAssignments` → `componentPropRefs`) are applied per the schema, but no reference file uses them, so that path is tested only against hand-built documents.
- Every variable set in the reference files has one mode and no variable aliases another, so mode selection and alias chains are likewise tested only against hand-built documents. Extended sets (`variableSetExtensionID`, `parentModeId`) are not handled.

## [0.4.1] - 2026-08-01

### Fixed

- **Compound paths were encoded as separate regions instead of loops of one region.** `encodeVectorNetworkBlob` closed a region at every `M`, so a glyph and its counter, or the two rings of an outline-stroked shape, became independent filled areas — the counter fills in rather than punching through. Figma writes them as multiple loops of a single region; reference blobs carry regions of 1, 2 and 3 loops. Each entry in `pathCommandsList` now yields one region whose loops are its sub-paths. The 0.4.0 round-trip test could not catch this: it only re-encodes networks that were *decoded*, so it validates the byte writer completely and the network builder not at all.
- **`encodeVectorNetworkBlob` had no way to omit regions.** Open stroked paths need none — a region asks Figma to fill the bounded area, which on an open path closes it visually as a "lens" between the endpoints even with no fill paint. Added `{ emitRegions }`, defaulting to `true`.

### Changed

- **`VectorNetworkVertex.handleMirroring` is renamed `styleID`.** The vertex's leading word is an index into the node's `vectorData.styleOverrideTable`, not a `VectorMirror` enum. The two were indistinguishable in the only fixture with a non-zero value, whose single override entry is `{styleID: 1, handleMirroring: "ANGLE"}` — and `ANGLE` is also `1`. Other Figma files settle it: override entries carry six properties (`cornerRadius`, `strokeCap`, `strokeJoin`, `handleMirroring`, `cornerSmoothing`), which cannot be encoded in one u32, and appear with `styleID` 1 and 2 in sequence. The Kiwi schema agrees — `VectorData` holds a `styleOverrideTable` of `NodeChange` keyed by `styleID`, with no other array for per-vertex references. Byte output is unchanged; authoring a non-zero value without a matching table entry produces a dangling reference.

## [0.4.0] - 2026-08-01

### Added

- **`parseVectorNetworkBlob` decoder** — Decodes a `vectorNetworkBlob` into structured vertices, segments and regions, exported from the package entry point. Throws (rather than returning partial results) on short buffers, declared counts running past the end, out-of-range vertex or segment indices, and trailing bytes.
- **`encodeVectorNetwork` structured encoder** — Encodes a decoded `VectorNetwork` back to bytes. Decoding and re-encoding a blob reproduces it unchanged across our reference suite, which is the standard the encoder is held to.

### Changed

- **`encodeVectorNetworkBlob` emits the corrected layout** — 12-byte header; `[styleID, x, y]` vertices; `[word0, startVertex, tsx, tsy, endVertex, tex, tey]` segments; `[packed, numLoops, (segCount, indices)×numLoops]` regions. It previously wrote a rotated 16-byte-header layout with a per-region trailer, which described compound shapes incorrectly. The vertex handle-mirroring word is preserved on round-trip; segment `word0` is written as `0`.
- Curve classification is by tangent components — a segment is straight iff all four tangents are zero. There is no segment-type field.

### Removed

- The `SEGMENT_LINE`, `SEGMENT_CUBIC`, and `DEFAULT_HANDLE_MIRRORING` constants. The value `4` appears nowhere in reference output and was a one-scan fingerprint for openfig-written files.

## [0.3.7] - 2026-05-22

### Added

- **`convertDeckToFig` API** — A tree-transform under `src/convert.ts` that strips visual slides scaffolding (`SLIDE_GRID`, `SLIDE_ROW`, `SLIDE`, `MODULE`) and positions visual frames onto a flat design page.
- **Component & Symbol Override Baking** — Implemented recursive cloning and unique GUID remapping for nested components, baking customized character overrides and fill/stroke paints directly onto the cloned target nodes.
- **Comprehensive API Exports** — Exposed programmatic transform helpers and type definitions (`ConvertOptions`, etc.) in `src/index.ts`.

## [0.3.6] - 2026-03-25

### Added

- **Isomorphic Parser & Encoder** — Initial open-source release of the isomorphic `.fig` and `.deck` file parser and Kiwi binary encoder, allowing reading and writing of Figma's schema-driven format in both Node.js and browser runtimes.
- **Kiwi Schema Interoperability** — Integration of schema-driven Kiwi binary serialization, resolving zip archives (`fzstd`/`fflate` decoders), geometry nodes, vector path conversions, and gradient color structures.

[0.4.1]: https://github.com/OpenFig-org/openfig-core/releases/tag/v0.4.1
[0.4.0]: https://github.com/OpenFig-org/openfig-core/releases/tag/v0.4.0
[0.3.7]: https://github.com/OpenFig-org/openfig-core/releases/tag/v0.3.7
[0.3.6]: https://github.com/OpenFig-org/openfig-core/releases/tag/v0.3.6
