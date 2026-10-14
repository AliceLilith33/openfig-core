export const KIWI_TYPES_HEADER = `/**
 * Types for the decoded .fig wire format, one per kiwi schema definition.
 *
 * GENERATED from src/utilities/figKiwiSchema.ts — do not edit. Regenerate with:
 *   npx tsx src/utilities/generateKiwiTypes.ts > src/kiwi.ts
 *
 * ENUMs are string unions (kiwi decodes them to names). MESSAGE fields are all
 * optional: a field is present only if the file wrote it. byte[] is a
 * Uint8Array; int64 and uint64 are bigint.
 *
 * A file's embedded schema can be newer than this one, so a decoded node can
 * carry fields not listed here.
 */
`;
