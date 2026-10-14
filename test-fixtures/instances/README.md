# Instance resolution fixtures

| File | Source | Pins down |
|---|---|---|
| `medium-complex.fig` | copied from openfig-cli `test/fixtures/figs/reference/` | Nested instances, instance swaps (`overriddenSymbolID`), overrides addressed to the symbol root, and `derivedSymbolData` with two-segment paths that only resolve inside the swapped-in symbol. |

## The oracle

An instance's `symbolOverrides` and `derivedSymbolData` entries each carry a
`guidPath`. Figma wrote them against the content the instance displays, so a
correct resolver must produce a tree in which every such path names exactly one
node, and in which the `size` and `transform` of each derived entry are what
that node ends up with. These are facts Figma recorded, not values we chose,
which makes them an independent check.

Across this file and the other openfig-cli reference files (440 instances,
21,608 entries), every path resolves to exactly one node and all 38,930 derived
`size`/`transform` values match.
