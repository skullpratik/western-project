import React, { useState, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { Experience } from "../Experience/Experience.jsx";
import { useSearchParams } from "react-router-dom";
import './Embed.css';

const API_BASE_URL = 'http://192.168.1.7:5000';

function Embed() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [api, setApi] = useState(null);

  const handleTogglePart = useCallback(() => {
    // Disable interactions in embed mode
  }, []);

  const handleApiReady = useCallback((apiInstance) => {
    setApi(apiInstance);
  }, []);

  const handleApplyRequest = useCallback(() => {
    // Disable apply in embed mode
  }, []);

  const handleModelTransformChange = useCallback(() => {
    // Handle transform changes if needed
  }, []);

  useEffect(() => {
    const resolveToken = async () => {
      if (!token) {
        setError('No token provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/embed/resolve?token=${token}`);
        const data = await response.json();

        if (data.success && data.model) {
          setModel(data.model);
        } else {
          setError(data.message || 'Invalid token');
        }
      } catch (err) {
        console.error('Error resolving token:', err);
        setError('Failed to load model');
      } finally {
        setLoading(false);
      }
    };

    resolveToken();
  }, [token]);

  if (loading) {
    return (
      <div className="embed-loading">
        <div className="spinner"></div>
        <p>Loading model...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="embed-error">
        <h2>Unable to Load Model</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!model) {
    return (
      <div className="embed-error">
        <h2>Model Not Found</h2>
        <p>The requested model could not be found.</p>
      </div>
    );
  }

  return (
    <div className="embed-app">
      <Canvas
        shadows
        camera={{ position: [0, 2, 5], fov: 50 }}
        gl={{ antialias: true }}
      >
        <Experience
          modelName={model.name}
          modelConfig={model}
          allModels={{ [model.name]: model }}
          onTogglePart={handleTogglePart}
          onApiReady={handleApiReady}
          applyRequest={handleApplyRequest}
          userPermissions={{ canEdit: false, canDelete: false }}
          user={{ role: 'viewer' }}
          onModelTransformChange={handleModelTransformChange}
        />
      </Canvas>
    </div>
  );
}

export default Embed;