/**
 * Prefix for raw URLs into /public (fetch, plain <a>). next/link and the
 * router add the base path themselves; these do not. Empty outside the
 * GitHub Pages export.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (path: string) => `${BASE_PATH}${path}`;
