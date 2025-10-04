import React, { useState } from 'react';
import './AnnotationMarker.css';

const AnnotationMarker = ({ 
  annotation, 
  currentUserId, 
  onSelect, 
  onRemove, 
  onStartDrag,
  isDragging,
  style = {} 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    setIsSelected(!isSelected);
    if (onSelect) onSelect(annotation);
  };

  const handleMouseDown = (e) => {
    const annotationUserId = annotation.user_id || annotation.userId;
    if (annotationUserId !== currentUserId) return;
    e.preventDefault();
    e.stopPropagation();
    if (onStartDrag) onStartDrag(annotation, e);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove) onRemove(annotation.id);
    setIsSelected(false);
  };

  const canEdit = (annotation.user_id || annotation.userId) === currentUserId;
  const showPopup = isHovered || isSelected;

  return (
    <div 
      className={`annotation-marker ${isDragging ? 'being-dragged' : ''}`}
      style={style}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
      title={canEdit ? 'Click and drag to move' : 'Read-only'}
    >
      📌
      
      {showPopup && (
        <div className="annotation-popup">
          <div className="annotation-user">
            {annotation.user_name || annotation.userName || 'Unknown User'}
          </div>
          <div className="annotation-text">
            {annotation.text}
          </div>
          {canEdit && (
            <button
              className="annotation-delete-btn"
              onClick={handleRemove}
            >
              🗑️ Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default AnnotationMarker;