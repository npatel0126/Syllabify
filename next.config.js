/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next.js from bundling firebase-admin and its native dependencies.
  // They must be resolved at runtime from node_modules on the server.
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin", "@google-cloud/firestore", "@opentelemetry/api", "@google/genai"],
  },
};

module.exports = nextConfig;
