import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Stylized card shape */}
        <div
          style={{
            width: 18,
            height: 24,
            borderRadius: 3,
            border: "2px solid #e2b714",
            background: "linear-gradient(135deg, #e2b714 0%, #f0c832 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(-8deg)",
            position: "absolute",
            left: 3,
            top: 3,
            opacity: 0.3,
          }}
        />
        {/* Front card */}
        <div
          style={{
            width: 18,
            height: 24,
            borderRadius: 3,
            border: "2px solid #e2b714",
            background: "linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: "rotate(4deg)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              fontSize: 7,
              fontWeight: 900,
              color: "#e2b714",
              letterSpacing: -0.5,
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
