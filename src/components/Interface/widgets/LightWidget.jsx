// src/components/widgets/LightWidget.jsx
import React from 'react';
import { Button, Typography, Switch, FormControlLabel, Box } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';

export const LightWidget = ({ config, api }) => {
  const { lights = [] } = config;
  const [lightsState, setLightsState] = React.useState({});

  // Initialize lights state
  React.useEffect(() => {
    const initialState = {};
    lights.forEach(light => {
      initialState[light.name] = light.defaultState === "on";
    });
    setLightsState(initialState);
  }, [lights]);

  if (!lights || lights.length === 0) {
    return null;
  }

  const toggleLight = (lightName, newState) => {
    setLightsState(prev => ({
      ...prev,
      [lightName]: newState
    }));
    
    // Call the API to actually toggle the light
    if (api && api.toggleLight) {
      api.toggleLight(lightName, newState);
    }
  };

  const toggleAllLights = () => {
    const allOn = Object.values(lightsState).every(state => state);
    const newState = !allOn;
    
    const newLightsState = {};
    lights.forEach(light => {
      newLightsState[light.name] = newState;
    });
    
    setLightsState(newLightsState);
    
    // Toggle all lights
    if (api && api.toggleAllLights) {
      api.toggleAllLights(newState);
    }
  };

  const allOn = Object.values(lightsState).every(state => state);
  const anyOn = Object.values(lightsState).some(state => state);

  return (
    <Box sx={{ 
      background: "#fff", 
      padding: 2, 
      borderRadius: 1, 
      marginBottom: 2 
    }}>
      <Typography variant="h6" gutterBottom>
        Lights Control
      </Typography>
      
      {/* Master toggle */}
      <Box sx={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
        <Button
          variant={anyOn ? "contained" : "outlined"}
          color={anyOn ? "primary" : "default"}
          onClick={toggleAllLights}
          startIcon={anyOn ? <LightbulbIcon /> : <LightbulbOutlinedIcon />}
          sx={{
            background: anyOn ? '#ffd700' : 'transparent',
            color: anyOn ? '#000' : '#666',
            borderColor: anyOn ? '#ffd700' : '#ccc'
          }}
        >
          {allOn ? 'All Lights ON' : anyOn ? 'Some Lights ON' : 'All Lights OFF'}
        </Button>
      </Box>

      {/* Individual light controls */}
      {lights.map(light => (
        <Box key={light.name} sx={{ display: 'flex', alignItems: 'center', marginBottom: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={lightsState[light.name] || false}
                onChange={(e) => toggleLight(light.name, e.target.checked)}
                color="primary"
              />
            }
            label={light.name}
          />
          <Typography variant="body2" sx={{ color: 'text.secondary', ml: 1 }}>
            {lightsState[light.name] ? 'ON' : 'OFF'}
          </Typography>
        </Box>
      ))}
    </Box>
  );
};

export default LightWidget;