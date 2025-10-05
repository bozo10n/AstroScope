import React, { useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * 3D User Avatar component
 * Represents other users in the 3D space with their camera direction
 */
function UserAvatar3D({ userId, userName, position, rotation }) {
  const groupRef = useRef();
  const coneRef = useRef();
  
  // Default position and rotation if not provided
  const pos = position || { x: 0, y: 1.6, z: 0 };
  const rot = rotation || { pitch: 0, yaw: 0 };
  
  // Animate the avatar slightly for visual feedback
  useFrame((state) => {
    if (coneRef.current) {
      coneRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 1.8;
    }
  });
  
  // Generate a consistent color based on userId
  const getUserColor = (id) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };
  
  const avatarColor = getUserColor(userId);
  
  return (
    <group ref={groupRef} position={[pos.x, pos.y, pos.z]}>
      {/* Body - cylinder */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 1.5, 8]} />
        <meshStandardMaterial 
          color={avatarColor}
          emissive={avatarColor}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Head - sphere */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial 
          color={avatarColor}
          emissive={avatarColor}
          emissiveIntensity={0.4}
        />
      </mesh>
      
      {/* Direction indicator - cone showing where they're looking */}
      <mesh 
        ref={coneRef}
        position={[0, 1.8, 0]}
        rotation={[Math.PI / 2, 0, -rot.yaw]}
      >
        <coneGeometry args={[0.15, 0.5, 8]} />
        <meshStandardMaterial 
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.5}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* View direction ray */}
      <group rotation={[rot.pitch, rot.yaw, 0]}>
        <mesh position={[0, 1.2, -1]}>
          <cylinderGeometry args={[0.02, 0.02, 2, 8]} />
          <meshStandardMaterial 
            color={avatarColor}
            transparent
            opacity={0.3}
          />
        </mesh>
      </group>
      
      {/* Username label */}
      <Html
        position={[0, 2.2, 0]}
        center
        distanceFactor={8}
        style={{
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            border: `2px solid ${avatarColor}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
          }}
        >
          {userName}
        </div>
      </Html>
      
      {/* Shadow/ground indicator */}
      <mesh 
        position={[0, -pos.y + 0.01, 0]} 
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.5, 16]} />
        <meshBasicMaterial 
          color={avatarColor}
          transparent
          opacity={0.2}
        />
      </mesh>
    </group>
  );
}

export default UserAvatar3D;
