import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { VRButton, XR, useXR, createXRStore } from '@react-three/xr';
import { Html, Text } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Starry Sky Background
 */
function StarrySky() {
  const starsRef = useRef();
  
  const starGeometry = React.useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const starCount = 5000;
    const positions = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i += 3) {
      const radius = 150 + Math.random() * 100;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);
  
  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0001;
    }
  });
  
  return (
    <points ref={starsRef} geometry={starGeometry}>
      <pointsMaterial
        size={0.5}
        color="#ffffff"
        sizeAttenuation={true}
        transparent={true}
        opacity={0.8}
      />
    </points>
  );
}

/**
 * Sun Light Component
 */
function SunLight() {
  const sunPosition = [100, 80, 50];
  
  return (
    <group>
      <directionalLight
        position={sunPosition}
        intensity={2.0}
        color="#FFF8E7"
        castShadow
      />
      
      <mesh position={sunPosition}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshBasicMaterial color="#FFD700" toneMapped={false} />
      </mesh>
      
      <mesh position={sunPosition}>
        <sphereGeometry args={[5, 32, 32]} />
        <meshBasicMaterial 
          color="#FFD700" 
          transparent 
          opacity={0.3}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/**
 * Moon Terrain Plane using 16-bit height map, adapted from PC version
 */
function MoonPlane() {
  const [colorTexture, setColorTexture] = useState(null);
  const [heightTexture, setHeightTexture] = useState(null);
  const heightScale = 10; // Controls the vertical exaggeration of the terrain

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load('/moon_data/moon_color.png', setColorTexture);
    loader.load('/moon_data/moon_height.png', setHeightTexture);
  }, []);

  const geometry = useMemo(() => {
    if (!heightTexture?.image) return null;

    const geo = new THREE.PlaneGeometry(100, 100, 512, 512);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = heightTexture.image;
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const positions = geo.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      // Map vertex position to UV coordinates
      const u = (positions.getX(i) / 100) + 0.5;
      const v = (positions.getY(i) / 100) + 0.5;

      const x = Math.floor(u * (canvas.width - 1));
      const y = Math.floor((1 - v) * (canvas.height - 1)); // Invert V for image coordinates
      const index = (y * canvas.width + x) * 4;
      
      // Read 16-bit height data from R and G channels
      const height = (imageData.data[index] * 256 + imageData.data[index + 1]) / 65535;
      
      // Displace vertex along its Z-axis (which becomes Y after rotation)
      positions.setZ(i, (height - 0.5) * heightScale);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, [heightTexture]);

  if (!geometry || !colorTexture) {
    // Return a placeholder while loading to prevent raycaster from failing
    return (
        <mesh name="moon_terrain" rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[100, 100, 1, 1]} />
            <meshBasicMaterial color="grey" side={THREE.DoubleSide} />
        </mesh>
    );
  }

  return (
    <mesh 
      name="moon_terrain"
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <meshStandardMaterial 
        map={colorTexture}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/**
 * VR Movement System
 */
function VRMovement({ speed = 5 }) {
  const { camera, scene } = useThree();
  const { isPresenting, controllers } = useXR();
  const raycaster = useRef(new THREE.Raycaster()).current;
  const playerVelocity = useRef(new THREE.Vector3()).current;

  useFrame((state, delta) => {
    if (!isPresenting || controllers.length === 0) return;

    const rightController = controllers.find(c => c.inputSource.handedness === 'right');
    if (!rightController?.inputSource.gamepad) return;

    const gamepad = rightController.inputSource.gamepad;
    const axes = gamepad.axes;
    const move = new THREE.Vector3();

    if (axes.length >= 4) {
      const moveX = axes[2];
      const moveZ = axes[3];

      if (Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1) {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize();
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion).setY(0).normalize();
        
        move.addScaledVector(forward, -moveZ).addScaledVector(right, moveX);
      }
    }
    
    // Apply movement
    const damping = 0.9;
    playerVelocity.add(move.multiplyScalar(speed * delta));
    playerVelocity.multiplyScalar(damping);
    camera.position.add(playerVelocity);

    // Terrain following
    const terrain = scene.getObjectByName("moon_terrain");
    if (terrain) {
      raycaster.set(camera.position, new THREE.Vector3(0, -1, 0));
      const intersects = raycaster.intersectObject(terrain);

      if (intersects.length > 0) {
        const intersectionPoint = intersects[0].point;
        const desiredHeight = intersectionPoint.y + 1.6; // Player eye height
        
        // Smoothly adjust camera height to avoid sudden jumps
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, desiredHeight, 0.1);
      }
    }
  });

  return null;
}

/**
 * Simple Annotation Marker for VR
 */
function VRAnnotation({ position, text, color = "#4CAF50" }) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <group position={position}>
      {/* Marker sphere */}
      <mesh
        position={[0, 1, 0]}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        scale={hovered ? 0.4 : 0.3}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Vertical beam */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 1, 8]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>
      
      {/* Text label */}
      <Text
        position={[0, 2, 0]}
        fontSize={0.3}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="black"
      >
        {text}
      </Text>
    </group>
  );
}

/**
 * Other User Avatar for VR
 */
function VRUserAvatar({ position, userName, color = "#2196F3" }) {
  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Head */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Body */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 0.6, 8]} />
        <meshStandardMaterial 
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Name tag */}
      <Text
        position={[0, 0.4, 0]}
        fontSize={0.15}
        color="white"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.01}
        outlineColor="black"
      >
        {userName}
      </Text>
    </group>
  );
}

/**
 * Controller Models (must be inside XR context)
 */
function Controllers() {
  const { controllers } = useXR();
  
  if (!controllers || controllers.length === 0) return null;
  
  return (
    <>
      {controllers.map((controller, index) => (
        <group key={index}>
          <primitive object={controller.grip} />
          {/* Simple controller visualization */}
          <mesh position={[0, 0, -0.1]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color="#00ff00" />
          </mesh>
        </group>
      ))}
    </>
  );
}

/**
 * VR Info Panel
 */
function VRInfoPanel() {
  const { camera } = useThree();
  const panelRef = useRef();
  
  useFrame(() => {
    if (panelRef.current) {
      // Position panel in front of user
      const offset = new THREE.Vector3(0, 0.5, -1.5);
      offset.applyQuaternion(camera.quaternion);
      panelRef.current.position.copy(camera.position).add(offset);
      panelRef.current.lookAt(camera.position);
    }
  });
  
  return (
    <group ref={panelRef}>
      <mesh>
        <planeGeometry args={[1.5, 0.8]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.7} />
      </mesh>
      <Text
        position={[0, 0.25, 0.01]}
        fontSize={0.08}
        color="#4CAF50"
        anchorX="center"
      >
        🌙 Collaborative Lunar Demo
      </Text>
      <Text
        position={[0, 0.1, 0.01]}
        fontSize={0.05}
        color="white"
        anchorX="center"
      >
        VR Mode Active
      </Text>
      <Text
        position={[0, -0.05, 0.01]}
        fontSize={0.04}
        color="#aaaaaa"
        anchorX="center"
      >
        Right Thumbstick: Move
      </Text>
      <Text
        position={[0, -0.15, 0.01]}
        fontSize={0.04}
        color="#aaaaaa"
        anchorX="center"
      >
        Trigger: Interact
      </Text>
    </group>
  );
}

/**
 * Main VR Scene
 */
function VRScene() {
  const { isPresenting, controllers } = useXR();
  const [annotations] = useState([
    { id: 1, x: 10, y: 0, z: 15, text: "Crater A", author: "Demo" },
    { id: 2, x: -15, y: 0, z: 20, text: "Rock Formation", author: "Demo" },
    { id: 3, x: 5, y: 0, z: -10, text: "Landing Site", author: "Demo" },
  ]);
  
  const [users] = useState([
    { id: 1, name: "Explorer 1", x: -5, y: 1.6, z: 10 },
    { id: 2, name: "Explorer 2", x: 8, y: 1.6, z: -5 },
  ]);
  
  return (
    <>
      <StarrySky />
      
      <ambientLight intensity={0.2} />
      <SunLight />
      <directionalLight position={[-50, 30, -30]} intensity={0.3} color="#9DB4FF" />
      
      <MoonPlane />
      
      <VRMovement speed={5} />
      
      {/* Controllers */}
      <Controllers />
      
      {/* Annotations */}
      {annotations.map(annotation => (
        <VRAnnotation
          key={annotation.id}
          position={[annotation.x, annotation.y, annotation.z]}
          text={annotation.text}
        />
      ))}
      
      {/* Other users */}
      {users.map(user => (
        <VRUserAvatar
          key={user.id}
          position={{ x: user.x, y: user.y, z: user.z }}
          userName={user.name}
        />
      ))}
      
      {/* Info panel (only show in VR) */}
      {isPresenting && <VRInfoPanel />}
      
      <gridHelper args={[100, 50, '#444444', '#222222']} position={[0, -0.01, 0]} />
    </>
  );
}

const xrStore = createXRStore();

/**
 * Main App Component
 */
export default function VRLunarDemo() {
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Desktop instructions */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 100,
        background: 'rgba(0,0,0,0.9)',
        padding: '40px',
        borderRadius: '16px',
        color: 'white',
        textAlign: 'center',
        maxWidth: '600px',
        border: '2px solid #4CAF50'
      }}>
        <h2 style={{ 
          margin: '0 0 20px 0', 
          fontFamily: 'Orbitron, sans-serif',
          color: '#4CAF50',
          fontSize: '28px'
        }}>
          🌙 VR Lunar Terrain Demo
        </h2>
        <p style={{ marginBottom: '30px', fontSize: '16px' }}>
          Collaborative moon exploration for Meta Quest 3S
        </p>
        
        <div style={{ 
          textAlign: 'left', 
          fontSize: '14px', 
          marginBottom: '30px',
          background: 'rgba(255,255,255,0.05)',
          padding: '20px',
          borderRadius: '8px'
        }}>
          <div style={{ marginBottom: '15px' }}>
            <strong style={{ color: '#4CAF50', fontSize: '16px' }}>VR Controls:</strong>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <strong>Right Thumbstick</strong> - Move around terrain<br/>
            <strong>Head Tracking</strong> - Look around naturally<br/>
            <strong>Triggers</strong> - Interact with objects
          </div>
          <div style={{ marginTop: '15px', fontSize: '13px', color: '#999' }}>
            <strong>Demo Features:</strong><br/>
            ✨ Procedural lunar terrain<br/>
            👥 Collaborative user avatars<br/>
            📍 3D annotation markers<br/>
            🌟 Starfield background<br/>
            ☀️ Realistic sun lighting
          </div>
        </div>
        
        <div style={{
          background: 'rgba(76, 175, 80, 0.2)',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <p style={{ 
            fontSize: '14px', 
            margin: 0,
            color: '#4CAF50',
            fontWeight: 'bold'
          }}>
            👓 Put on your Meta Quest 3S and click "Enter VR" below!
          </p>
        </div>
      </div>
      
      {/* VR Button styling */}
      <div id="vr-button-container" style={{
        position: 'absolute',
        bottom: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 101
      }}>
        <button onClick={() => xrStore.enterVR()}>Enter VR</button>
      </div>
      
      <Canvas
        camera={{ position: [0, 15, 5], fov: 75 }}
        style={{ 
          background: '#000000',
          width: '100%',
          height: '100%'
        }}
      >
        <XR store={xrStore}>
          <VRScene />
        </XR>
      </Canvas>
      
    </div>
  );
}