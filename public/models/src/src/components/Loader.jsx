import React from "react";
import { Box, Typography, LinearProgress } from "@mui/material";

export const Loader = ({ progress = 0 }) => {
  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15, 15, 30, 0.85)", // darker transparent backdrop
        backdropFilter: "blur(6px)", // glassy effect
        color: "#fff",
      }}
    >
      {/* Rotating subtle glow background */}
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "220vw",
          height: "220vh",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)",
          animation: "rotate 40s linear infinite",
          opacity: 0.4,
          "@keyframes rotate": {
            "0%": { transform: "translate(-50%, -50%) rotate(0deg)" },
            "100%": { transform: "translate(-50%, -50%) rotate(360deg)" },
          },
        }}
      />

      {/* Title + progress text */}
      <Box
        sx={{
          textAlign: "center",
          mb: 4,
          animation: "fadeIn 0.8s ease-out, pulse 3s infinite",
          "@keyframes fadeIn": {
            "0%": { opacity: 0, transform: "translateY(15px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
          "@keyframes pulse": {
            "0%": { transform: "scale(1)" },
            "50%": { transform: "scale(1.03)" },
            "100%": { transform: "scale(1)" },
          },
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: 700,
            mb: 1,
            letterSpacing: "0.12em",
            textShadow: "0 0 15px rgba(255,255,255,0.35)",
            background: "linear-gradient(90deg, #ffffff, #ffd700, #ffffff)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          CABINET CONFIGURATOR
        </Typography>

        <Typography
          variant="h6"
          sx={{
            fontWeight: 400,
            mb: 3,
            color: "rgba(255,255,255,0.85)",
            letterSpacing: "0.05em",
          }}
        >
          Loading {Math.round(progress)}%
        </Typography>
      </Box>

      {/* Progress bar */}
      <Box
        sx={{
          width: "min(400px, 80vw)",
          position: "relative",
          mb: 2,
          borderRadius: "12px",
          overflow: "hidden",
          background: "rgba(255,255,255,0.08)",
        }}
      >
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 14,
            borderRadius: "12px",
            backgroundColor: "rgba(255,255,255,0.05)",
            "& .MuiLinearProgress-bar": {
              borderRadius: "12px",
              background: "linear-gradient(90deg, #ff6a00, #ffd500, #ff6a00)",
              backgroundSize: "200% 100%",
              animation: "gradient 2s linear infinite",
              "@keyframes gradient": {
                "0%": { backgroundPosition: "0% 50%" },
                "50%": { backgroundPosition: "100% 50%" },
                "100%": { backgroundPosition: "0% 50%" },
              },
            },
          }}
        />
      </Box>

      <Typography
        variant="caption"
        sx={{
          mt: 2,
          color: "rgba(255,255,255,0.7)",
          fontSize: "0.85rem",
          letterSpacing: "0.05em",
        }}
      >
        Preparing your 3D experience...
      </Typography>

      {/* Floating dots animation */}
      <Box
        sx={{
          position: "absolute",
          bottom: "12%",
          display: "flex",
          gap: 1.5,
        }}
      >
        {[...Array(3)].map((_, i) => (
          <Box
            key={i}
            sx={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#ffd500",
              opacity: 0.8,
              animation: "bounce 1.6s infinite",
              animationDelay: `${i * 0.25}s`,
              "@keyframes bounce": {
                "0%, 100%": { transform: "translateY(0)", opacity: 0.6 },
                "50%": { transform: "translateY(-12px)", opacity: 1 },
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
};
