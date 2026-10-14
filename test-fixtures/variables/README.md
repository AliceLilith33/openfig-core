# Variable resolution fixtures

| File | Source | Pins down |
|---|---|---|
| `just-fonts.deck` | copied from openfig-cli `test/fixtures/decks/reference/` | Paints bound to colour variables (`colorVar`) and auto-layout padding bound through `variableConsumptionMap`, with variables and sets referenced both by local guid and by library `assetRef` key. |

## The oracle

A paint bound to a variable keeps Figma's resolved value in its own `color`,
and a node with bound padding keeps the resolved numbers in its
`stackHorizontalPadding` and related fields. Resolving the binding must give
back those values. Across the openfig-cli reference files, all 107 bound paints
resolve to the cached colour.

Every variable set in these files has a single mode and no variable aliases
another, so mode selection and alias chains are covered only by hand-built
documents in `src/variables.test.ts`.
