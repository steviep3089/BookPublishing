import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lily-Rose's Reading Club",
    short_name: "Reading Club",
    description: "Lily-Rose's Reading Club",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    background_color: "#f0e2df",
    theme_color: "#f0e2df",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
