/**
 * Deduplication utilities for event storage.
 * Uses hash-based exact matching and word-level Jaccard similarity for fuzzy matching.
 */

/**
 * Normalize a string for dedup comparison:
 * lowercase, strip punctuation, collapse whitespace
 */
export function normalizeForDedup(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Generate a dedup hash from title + dateStart + locationName.
 * Uses a simple string hash since we can't use crypto in Convex mutations.
 */
export function generateDedupHash(
  title: string,
  dateStart: string | undefined,
  locationName: string | undefined
): string {
  const normalized = [
    normalizeForDedup(title),
    dateStart ? normalizeForDedup(dateStart) : "",
    locationName ? normalizeForDedup(locationName) : "",
  ].join("|");

  // Simple string hash (djb2 algorithm)
  let hash = 5381;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash * 33) ^ normalized.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Compute Jaccard similarity between two strings based on word sets.
 * Returns a value between 0 (no overlap) and 1 (identical word sets).
 */
export function fuzzyTitleSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeForDedup(a).split(" ").filter(Boolean));
  const wordsB = new Set(normalizeForDedup(b).split(" ").filter(Boolean));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
