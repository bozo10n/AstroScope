import React from 'react';
import './DragPreview.css';

const DragPreview = ({ 
  dragPreview, 
  isVisible = false 
}) => {
  if (!isVisible || !dragPreview) return null;

  const getDragPreviewStyle = () => {
    return {
      left: `${dragPreview.x}px`,
      top: `${dragPreview.y}px`,
      position: 'fixed',
      zIndex: 9999,
      pointerEvents: 'none',
      fontSize: '2rem',
      transform: 'translate(-50%, -50%)'
    };
  };

      const getIcon = () => {
          switch (dragPreview.type) {
              case 'annotation':
                  return 'Pin';
              case 'overlay':
                  return 'Image';
              default:
                  return '⋯';
          }
      };
  return (
    <div 
      className="drag-preview"
      style={getDragPreviewStyle()}
    >
      {getIcon()}
    </div>
  );
};

export default DragPreview;