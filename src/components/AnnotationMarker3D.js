import React, { useRef } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

/**
 * 3D Annotation Marker component
 * Displays floating text labels in 3D space with HTML overlay
 */
function AnnotationMarker3D({ 
  annotation, 
  currentUserId, 
  onRemove,
  onSelect 
}) {
  const meshRef = useRef();
  
  const isOwner = annotation.userId === currentUserId || annotation.user_id === currentUserId;
  const position = [annotation.x || 0, annotation.y || 1, annotation.z || 0];
  
  // Color based on ownership
  const markerColor = isOwner ? '#4CAF50' : '#2196F3';
  const textColor = isOwner ? '#4CAF50' : '#2196F3';
  
  const handleClick = (e) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(annotation);
    }
  };
  
  const handleRemove = (e) => {
    e.stopPropagation();
    if (onRemove && isOwner) {
      onRemove(annotation.id);
    }
  };
  
  return (
    <group position={position}>
      {/* Sphere marker */}
      <mesh ref={meshRef} onClick={handleClick}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial 
          color={markerColor}
          emissive={markerColor}
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Vertical line connecting to ground */}
      <mesh position={[0, -position[1] / 2, 0]}>
        <cylinderGeometry args={[0.02, 0.02, position[1], 8]} />
        <meshStandardMaterial 
          color={markerColor}
          transparent
          opacity={0.3}
        />
      </mesh>
      
      {/* HTML overlay for text */}
      <Html
        position={[0, 0.5, 0]}
        center
        distanceFactor={8}
        style={{
          pointerEvents: 'auto',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.85)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            border: `2px solid ${textColor}`,
            minWidth: '120px',
            maxWidth: '250px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            cursor: 'pointer'
          }}
          onClick={handleClick}
        >
          <div style={{ 
            fontSize: '14px', 
            fontWeight: 'bold',
            marginBottom: '4px',
            color: textColor
          }}>
            {annotation.user_name || annotation.userName || 'Anonymous'}
          </div>
          <div style={{ fontSize: '13px', wordWrap: 'break-word' }}>
            {annotation.text}
          </div>
          {isOwner && (
            <button
              onClick={handleRemove}
              style={{
                marginTop: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%'
              }}
            >
              Delete
            </button>
          )}
        </div>
      </Html>
    </group>
  );
}

export default AnnotationMarker3D;
