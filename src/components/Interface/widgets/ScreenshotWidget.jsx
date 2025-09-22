import React, { useState } from 'react';

export function ScreenshotWidget({ title = "Download Image", api, userPermissions }) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('average');

  const allowedQualities = userPermissions?.imageDownloadQualities || ['average'];

  const qualityOptions = {
    average: { label: 'Average (720p)', width: 1280, height: 720 },
    good: { label: 'Good (2K)', width: 2560, height: 1440 },
    best: { label: 'Best (4K)', width: 3840, height: 2160 }
  };

  const handleDownload = async () => {
    if (!api?.takeScreenshot) {
      console.error('❌ takeScreenshot function not available');
      setStatus('Screenshot not available');
      setTimeout(() => setStatus(''), 3000);
      return;
    }

    setIsCapturing(true);
    setStatus('Capturing high-quality image...');

    try {
      const quality = qualityOptions[selectedQuality];
      const success = await api.takeScreenshot(quality.width, quality.height);
      if (success) {
        setStatus('✅ Screenshot downloaded!');
        console.log('📸 Screenshot downloaded successfully');
      } else {
        setStatus('❌ Screenshot failed');
        console.error('❌ Screenshot failed');
      }
    } catch (error) {
      console.error('❌ Screenshot error:', error);
      setStatus('❌ Screenshot failed');
    } finally {
      setIsCapturing(false);
      setTimeout(() => setStatus(''), 3000);
    }
  };

  return (
    <div className="widget screenshot-widget">
      <h3>{title}</h3>
      <div className="widget-content">
        <div style={{ marginBottom: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-secondary)' }}>
            Quality:
          </label>
          <select
            value={selectedQuality}
            onChange={(e) => setSelectedQuality(e.target.value)}
            style={{
              width: '100%',
              marginTop: '4px',
              padding: '4px 8px',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '12px'
            }}
          >
            {allowedQualities.map(quality => (
              <option key={quality} value={quality}>
                {qualityOptions[quality]?.label || quality}
              </option>
            ))}
          </select>
        </div>
        <button
          className="download-btn"
          onClick={handleDownload}
          disabled={isCapturing}
          title="Download a high-quality image of the 3D model"
        >
          📸 {isCapturing ? 'Capturing...' : 'Download Image'}
        </button>
        {status && (
          <div className="screenshot-status" style={{
            fontSize: '12px',
            marginTop: '8px',
            color: status.includes('✅') ? '#10b981' : status.includes('❌') ? '#ef4444' : '#6b7280',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            {status}
          </div>
        )}
     
      </div>
    </div>
  );
}

export default ScreenshotWidget;