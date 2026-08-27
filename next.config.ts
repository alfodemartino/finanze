import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Il server di produzione gira in un container: `standalone` produce
  // `.next/standalone/server.js` con le sole dipendenze tracciate, così
  // l'immagine non si porta dietro `node_modules` intero.
  output: "standalone",
};

export default nextConfig;
