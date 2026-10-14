/**
 * Regenerates src/kiwi.ts — TypeScript types for every definition in
 * figKiwiSchema.ts — after the schema changes. A test fails while the two
 * disagree.
 *
 * Run with:
 *   npx tsx src/utilities/generateKiwiTypes.ts > src/kiwi.ts
 */

import { figKiwiSchema } from "./figKiwiSchema.js";
import { KIWI_TYPES_HEADER } from "./kiwiTypesHeader.js";
import { renderKiwiTypes } from "./kiwiTypes.js";

process.stdout.write(renderKiwiTypes(figKiwiSchema.definitions as any, KIWI_TYPES_HEADER));
