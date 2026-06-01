/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["three", "@react-three/fiber", "@react-three/drei"]
  }
};

export default nextConfig;

