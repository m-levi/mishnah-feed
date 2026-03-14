import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scroll — Torah Learning Feed",
    short_name: "Scroll",
    description:
      "Replace doom scrolling with Torah scrolling — personalized bite-sized learning",
    start_url: "/",
    display: "standalone",
    background_color: "#F9F8F6",
    theme_color: "#B45309",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
