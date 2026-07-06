/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Imágenes de tickets se procesan en memoria; no se guardan.
  experimental: {
    // Aumenta el límite del body para poder recibir fotos de tickets en base64.
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
