/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Photos de scan corporel envoyées en base64 via Server Action —
      // au-delà de la limite par défaut (1 Mo) sur une photo de téléphone.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
