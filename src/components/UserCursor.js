import React from 'react';
import './UserCursor.css';

const UserCursor = ({ userId, position, userName }) => {
  const getCursorStyle = () => {
    if (!position || typeof position.x !== 'number' || typeof position.y !== 'number') {
      return { display: 'none' };
    }
    
    return {
      left: `${position.x * 100}%`,
      top: `${position.y * 100}%`,
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: 100,
      transform: 'translate(-50%, -50%)'
    };
  };

  return (
    <div className="user-cursor" style={getCursorStyle()}>
      <span className="cursor-icon">👆</span>
      <span className="cursor-name">{userName}</span>
    </div>
  );
};

export default UserCursor;