import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: 36,
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Back card (shadow) */}
        <div
          style={{
            width: 90,
            height: 120,
            borderRadius: 12,
            border: "4px solid #e2b714",
            background: "linear-gradient(135deg, #e2b714 0%, #f0c832 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(-10deg)",
            position: "absolute",
            left: 28,
            top: 22,
            opacity: 0.3,
          }}
        />
        {/* Front card */}
        <div
          style={{
            width: 90,
            height: 120,
            borderRadius: 12,
            border: "4px solid #e2b714",
            background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(4deg)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            gap: 2,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#e2b71480",
              letterSpacing: -0.5,
              display: "flex",
            }}
          >
            TCG
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 900,
              color: "#e2b714",
              letterSpacing: -1,
              display: "flex",
            }}
          >
            DBM
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
