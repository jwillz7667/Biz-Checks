/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  typedRoutes: true,
  transpilePackages: [
    '@biz-checks/domain',
    '@biz-checks/micr',
    '@biz-checks/formula',
    '@biz-checks/check-engine',
  ],
  // Konva ships a Node entry that imports the native `canvas` package.
  // We only ever use the browser entry (designer canvas is `dynamic(..., { ssr: false })`),
  // so alias the Node entry to false so webpack doesn't try to resolve `canvas`.
  webpack: (config) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      'konva/lib/index-node.js': false,
      canvas: false,
    };
    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
