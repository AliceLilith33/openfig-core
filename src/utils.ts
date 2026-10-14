import type { FigNode } from "./types.js";

/**
 * Returns the string ID for a node ("sessionID:localID"), or null if no guid.
 */
export function nodeId(node: FigNode): string | null {
  if (!node?.guid) return null;
  return `${node.guid.sessionID}:${node.guid.localID}`;
}

/**
 * Compare two `parentIndex.position` strings the way Figma does: byte by byte.
 *
 * Positions are printable ASCII, so UTF-16 code-unit comparison is byte order.
 * `localeCompare` is not — collation reorders punctuation, which is most of the
 * alphabet positions are drawn from.
 */
export function comparePosition(a: string | undefined, b: string | undefined): number {
  const pa = a ?? "";
  const pb = b ?? "";
  return pa < pb ? -1 : pa > pb ? 1 : 0;
}

/** Sort sibling nodes into layer order (back to front). Stable for equal positions. */
export function sortByPosition<T extends FigNode>(nodes: T[]): T[] {
  return nodes.sort((a, b) => comparePosition(a.parentIndex?.position, b.parentIndex?.position));
}

const POSITION_FIRST = 0x21; // '!'
const POSITION_LAST = 0x7d; // '}' — one below '~'
const POSITION_BASE = POSITION_LAST - POSITION_FIRST + 1;
const POSITION_MORE = "~"; // continuation marker, sorts after every other char

/**
 * The `parentIndex.position` for the `index`-th sibling.
 *
 * Every character stays within `!`–`~` (anything outside makes Figma reject the
 * whole file), and positions sort in index order: `~` is reserved as a
 * continuation marker so a longer position sorts after every shorter one.
 * Indices below 93 produce the same single character as `0x21 + index`.
 * See docs/invariants.md.
 */
export function positionAt(index: number): string {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`positionAt: index must be a non-negative integer, got ${index}`);
  }
  let out = "";
  let n = index;
  while (n >= POSITION_BASE) {
    out += POSITION_MORE;
    n -= POSITION_BASE;
  }
  return out + String.fromCharCode(POSITION_FIRST + n);
}
