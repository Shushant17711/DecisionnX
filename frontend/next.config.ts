import type { NextConfig } from "next";

/**
 * PAGES_BASE_PATH switches the build to a static export served from a
 * sub-path (GitHub Pages: /DecisionnX). Local `next dev` / `next start` are
 * unaffected when it is unset.
 */
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = basePath
  ? {
      output: "export",
      basePath,
      trailingSlash: true,
      images: { unoptimized: true },
      env: { NEXT_PUBLIC_BASE_PATH: basePath },
    }
  : {};

export default nextConfig;
