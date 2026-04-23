import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "SimplePet — Todo para tu mascota en un solo lugar";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #e8f5e9 0%, #ffffff 100%)",
          color: "#134e4a",
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            marginBottom: 24,
            display: "flex",
          }}
        >
          SimplePet
        </div>
        <div
          style={{
            fontSize: 40,
            color: "#374151",
            display: "flex",
            textAlign: "center",
          }}
        >
          Todo para tu mascota en un solo lugar
        </div>
      </div>
    ),
    size,
  );
}
