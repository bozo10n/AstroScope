import React from 'react';
import './ViewerToolbar.css';

const ViewerToolbar = ({ 
  onZoomIn, 
  onZoomOut, 
  onResetView, 
  onToggleFullscreen,
  className = ''
}) => {
  return (
    <div className={`viewer-toolbar ${className}`}>
      <button 
        className="tool-btn" 
        onClick={onZoomIn}
        title="Zoom In"
      >
        🔍+
      </button>
      <button 
        className="tool-btn" 
        onClick={onZoomOut}
        title="Zoom Out"
      >
        🔍−
      </button>
      <button 
        className="tool-btn" 
        onClick={onResetView}
        title="Reset View"
      >
        🏠
      </button>
      <button 
        className="tool-btn" 
        onClick={onToggleFullscreen}
        title="Fullscreen"
      >
        ⛶
      </button>
    </div>
  );
};

export default ViewerToolbar;