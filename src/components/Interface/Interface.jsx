// src/components/Interface/Interface.jsx
import React from "react";
import { modelsConfig } from "../../modelsConfig";
import { DoorPresetWidget } from "./widgets/DoorPresetWidget";
import { TextureWidget } from "./widgets/TextureWidget";

export function Interface({ selectedModel, togglePart, api, applyRequest }) {
  if (!selectedModel) return null;

  const config = modelsConfig[selectedModel];
  if (!config) return null;

  // --- Widget renderer ---
  const renderWidget = (widget) => {
    switch (widget.type) {
      case "doorPresets":
        return <DoorPresetWidget key="doorPresets" config={config} api={api} />;

      case "doorToggles":
        return (
          <div
            key="doorToggles"
            style={{
              background: "#fff",
              padding: 8,
              borderRadius: 6,
              marginBottom: 8,
            }}
          >
            <div style={{ marginBottom: 6 }}>Doors</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(config.interactionGroups || [])
                .filter((g) => String(g.type).toLowerCase().includes("door"))
                .flatMap((g) => g.parts || [])
                .map((p) => (
                  <button
                    key={p.name}
                    onClick={() => togglePart?.(p.name, "door")}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {p.name}
                  </button>
                ))}
            </div>
          </div>
        );

      case "drawerToggles":
        return (
          <div
            key="drawerToggles"
            style={{
              background: "#fff",
              padding: 8,
              borderRadius: 6,
              marginBottom: 8,
            }}
          >
            <div style={{ marginBottom: 6 }}>Drawers</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {(config.interactionGroups || [])
                .filter((g) => String(g.type).toLowerCase().includes("drawer"))
                .flatMap((g) => g.parts || [])
                .map((p) => (
                  <button
                    key={p.name}
                    onClick={() => togglePart?.(p.name, "drawer")}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {p.name}
                  </button>
                ))}
            </div>
          </div>
        );

      case "textureWidget":
        return (
          <TextureWidget
            key="textureWidget"
            api={api}
            config={config}
            applyRequest={applyRequest} // ✅ use the prop here
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        padding: 8,
      }}
    >
      {(config.uiWidgets || []).map(renderWidget)}
    </div>
  );
}
