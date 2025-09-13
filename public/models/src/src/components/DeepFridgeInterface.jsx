import React, { useState } from "react";
import { Box, Paper, Typography, Stack, FormControl, FormLabel, Select, MenuItem, Button, FormControlLabel, Switch } from "@mui/material";

export const Interface = ({ 
  onDoorChange, 
  onHDRIChange, 
  onMaterialChange, 
  onLightChange,
  onLEDToggle 
}) => {
  const [doorCount, setDoorCount] = useState("");
  const [ledEnabled, setLedEnabled] = useState(true);

  const handleDoorChange = (event) => {
    const count = Number(event.target.value);
    setDoorCount(count);
    onDoorChange?.(count, null);
  };
  
  const handleLEDToggle = (e) => {
    const enabled = e.target.checked;
    setLedEnabled(enabled);
    onLEDToggle?.(enabled);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <FormControl fullWidth>
        <FormLabel sx={{ fontWeight: 600, mb: 1, color: "#333" }}>
          Number of Doors
        </FormLabel>
        <Select
          value={doorCount}
          onChange={handleDoorChange}
          displayEmpty
          sx={{
            borderRadius: 1.5,
            backgroundColor: "#f7f9fc",
            "& .MuiOutlinedInput-notchedOutline": { borderColor: "#ccc" },
            "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#007bff" }
          }}
        >
          <MenuItem value="">
            <em>Select</em>
          </MenuItem>
          <MenuItem value={1}>1 Door</MenuItem>
          <MenuItem value={2}>2 Doors</MenuItem>
          <MenuItem value={3}>3 Doors</MenuItem>
        </Select>
      </FormControl>

      <FormControlLabel
        control={
          <Switch 
            checked={ledEnabled} 
            onChange={handleLEDToggle}
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": { color: "#007bff" },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#007bff" }
            }}
          />
        }
        label="Interior LED Lighting"
        sx={{ mt: 2 }}
      />
    </Box>
  );
};