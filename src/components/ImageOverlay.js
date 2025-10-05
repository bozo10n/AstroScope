import React, { useState } from 'react';
import './ImageOverlay.css';

const ImageOverlay = ({ 
  overlay, 
  currentUserId, 
  onRemove, 
  onStartDrag,
  onStartResize,
  isDragging,
  style = {},
  apiBase = '' 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseDown = (e) => {
    if (overlay.user_id !== currentUserId) return;
    e.preventDefault();
    e.stopPropagation();
    if (onStartDrag) onStartDrag(overlay, e);
  };

  const handleResizeStart = (e) => {
    if (overlay.user_id !== currentUserId) return;
    e.preventDefault();
    e.stopPropagation();
    if (onStartResize) onStartResize(overlay, e);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) onRemove(overlay.id);
  };

  const canEdit = overlay.user_id === currentUserId;

  return (
    <div 
      className={`image-overlay ${isDragging ? 'being-dragged' : ''}`}
      style={style}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
      title={canEdit ? 'Click and drag to move' : 'Read-only'}
    >
      <img 
        src={`${apiBase}${overlay.image_path}`} 
        alt={overlay.original_name || 'Overlay'} 
        draggable={false}
      />
      
      {isHovered && canEdit && (
        <div className="overlay-controls">
          <button
            className="overlay-delete-btn"
            onClick={handleRemove}
          >
            🗑️
          </button>
          <div 
            className="resize-handle" 
            onMouseDown={handleResizeStart}
          >
            ⋱
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageOverlay;