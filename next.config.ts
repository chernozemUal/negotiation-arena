import type { NextConfig } from 'next';

const config: NextConfig = {
  // Normal local Next.js server; opt into a static artifact for GitHub Pages.
  output: process.env.STATIC_EXPORT === 'true' ? 'export' : undefined,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  trailingSlash: true,
};

export default config;
