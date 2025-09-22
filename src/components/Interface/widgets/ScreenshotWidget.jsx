import React, { useState } from 'react';

export function ScreenshotWidget({ title = "Download Image", api }) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [status, setStatus] = useState('');

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
      const success = await api.takeScreenshot();
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