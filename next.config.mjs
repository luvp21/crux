/** @type {import('next').NextConfig} */
const nextConfig = {
  // `ws` bundled by webpack loses its native bufferutil/utf-8-validate
  // addons ("bufferUtil.mask is not a function") — keep it as a real
  // Node require so neon-serverless's WebSocket driver works server-side.
  experimental: {
    serverComponentsExternalPackages: ["ws"],
  },
};

export default nextConfig;
