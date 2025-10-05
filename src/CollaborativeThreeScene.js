import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import AnnotationMarker3D from './components/AnnotationMarker3D';
import UserAvatar3D from './components/UserAvatar3D';
import HUD from './components/HUD';
import { useCollaborationStore } from './hooks/useCollaborationStore';

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
      // Random position in a large sphere around the scene
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
  
  // Optional: Add subtle twinkling effect
  useFrame((state) => {
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
  const sunRef = useRef();
  const lightRef = useRef();
  
  // Sun position (far away to simulate distant sun)
  const sunPosition = [100, 80, 50];
  
  return (
    <group>
      {/* Main sun directional light */}
      <directionalLight
        ref={lightRef}
        position={sunPosition}
        intensity={2.0}
        color="#FFF8E7"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />
      
      {/* Visual sun sphere - using meshBasicMaterial (always bright, unaffected by lights) */}
      <mesh ref={sunRef} position={sunPosition}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshBasicMaterial color="#FFD700" toneMapped={false} />
      </mesh>
      
      {/* Sun glow effect */}
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
 * Moon Plane with height map
 */
const MoonPlane = React.forwardRef(({ heightScale }, ref) => {
  const [colorTexture, setColorTexture] = useState(null);
  const [heightTexture, setHeightTexture] = useState(null);
  
  useEffect(() => {
    const colorLoader = new THREE.TextureLoader();
    const heightLoader = new THREE.TextureLoader();
    
    colorLoader.load('/moon_data/moon_color.png', setColorTexture);
    heightLoader.load('/moon_data/moon_height.png', setHeightTexture);
  }, []);
  
  const geometry = React.useMemo(() => {
    if (!heightTexture?.image) return new THREE.PlaneGeometry(100, 100, 512, 512);
    
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
      const u = (i % 513) / 512;
      const v = Math.floor(i / 513) / 512;
      
      const x = Math.floor(u * (canvas.width - 1));
      const y = Math.floor(v * (canvas.height - 1));
      const index = (y * canvas.width + x) * 4;
      
      const height = (imageData.data[index] * 256 + imageData.data[index + 1]) / 65535;
      positions.setZ(i, (height - 0.5) * heightScale * 20);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, [heightTexture, heightScale]);
  
  if (!colorTexture || !heightTexture) return null;
  
  return (
    <mesh 
      ref={ref} 
      geometry={geometry}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
    >
      <meshStandardMaterial 
        map={colorTexture}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
});

/**
 * First Person Controls with position broadcasting and collision detection
 */
function CollaborativeFirstPersonControls({ 
  speed = 20, 
  updatePosition3D, 
  isJoined,
  terrainRef,
  minHeight = 2.5,  // Minimum height above terrain
  onPositionChange,  // Callback to update position in parent
  teleportTo,  // External teleport trigger
  onLockChange,  // Callback when lock state changes
  uiMode = false,  // True when user is interacting with UI
  isAnnotating = false  // True when placing annotation
}) {
  const { camera, scene, raycaster, gl } = useThree();
  const keysRef = useRef({});
  const lastUpdateTime = useRef(0);
  const controlsRef = useRef();
  
  // Disable pointer lock when entering UI mode
  useEffect(() => {
    if (uiMode && document.pointerLockElement) {
      console.log('UI Mode enabled, exiting pointer lock');
      document.exitPointerLock();
    }
  }, [uiMode]);
  
  // Handle teleport
  useEffect(() => {
    if (teleportTo && teleportTo.x !== undefined) {
      camera.position.set(teleportTo.x, teleportTo.y, teleportTo.z);
    }
  }, [teleportTo, camera]);
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysRef.current[e.code] = true;
    };
    const handleKeyUp = (e) => {
      keysRef.current[e.code] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  
  useFrame((state, delta) => {
    const keys = keysRef.current;
    const moveSpeed = speed * delta;
    
    // Disable movement when in UI mode or annotating
    const movementEnabled = !uiMode && !isAnnotating;
    
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();
    
    const movement = new THREE.Vector3();
    
    if (movementEnabled) {
      if (keys['KeyW']) movement.add(forward);
      if (keys['KeyS']) movement.sub(forward);
      if (keys['KeyD']) movement.add(right);
      if (keys['KeyA']) movement.sub(right);
      if (keys['Space']) movement.y += 1;
      if (keys['ShiftLeft']) movement.y -= 1;
    }
    
    if (movement.length() > 0) {
      movement.normalize().multiplyScalar(moveSpeed);
      camera.position.add(movement);
    }
    
    // Collision detection with terrain
    if (terrainRef && terrainRef.current) {
      // Cast a ray downward from the camera
      const rayOrigin = camera.position.clone();
      const rayDirection = new THREE.Vector3(0, -1, 0);
      
      raycaster.set(rayOrigin, rayDirection);
      const intersects = raycaster.intersectObject(terrainRef.current, true);
      
      if (intersects.length > 0) {
        const terrainHeight = intersects[0].point.y;
        const desiredHeight = terrainHeight + minHeight;
        
        // If camera is below minimum height, push it up
        if (camera.position.y < desiredHeight) {
          camera.position.y = desiredHeight;
        }
      }
    }
    
    // Broadcast position to other users (throttled to 10 times per second)
    if (isJoined && state.clock.elapsedTime - lastUpdateTime.current > 0.1) {
      lastUpdateTime.current = state.clock.elapsedTime;
      
      // Calculate pitch and yaw from camera rotation
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      
      const pitch = Math.asin(direction.y);
      const yaw = Math.atan2(direction.x, direction.z);
      
      updatePosition3D(
        camera.position.x,
        camera.position.y,
        camera.position.z,
        pitch,
        yaw
      );
    }
    
    // Update position for HUD
    if (onPositionChange) {
      onPositionChange({
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      });
    }
  });
  

  
  // Don't render PointerLockControls in UI mode
  if (uiMode) {
    return null;
  }
  
  return (
    <PointerLockControls 
      ref={controlsRef}
      onLock={() => {
        console.log('Pointer locked');
        if (onLockChange) onLockChange(true);
      }}
      onUnlock={() => {
        console.log('Pointer unlocked');
        if (onLockChange) onLockChange(false);
      }}
    />
  );
}

/**
 * Annotation placement system with raycasting
 */
function AnnotationPlacer({ 
  isJoined, 
  onPlaceAnnotation,
  terrainRef,
  onAnnotatingChange
}) {
  const { camera, raycaster, scene, gl } = useThree();
  const [inputVisible, setInputVisible] = useState(false);
  const [inputPosition, setInputPosition] = useState({ x: 0, y: 0, z: 0 });
  const [inputText, setInputText] = useState('');
  const [screenPosition, setScreenPosition] = useState({ x: 0, y: 0 });
  
  // Notify parent when annotation input is visible
  useEffect(() => {
    if (onAnnotatingChange) {
      onAnnotatingChange(inputVisible);
    }
  }, [inputVisible, onAnnotatingChange]);
  
  useEffect(() => {
    if (!isJoined) {
      return;
    }
    
    const handleKeyDown = (event) => {
      // Press E to place annotation
      if (event.key !== 'e' && event.key !== 'E' && event.code !== 'KeyE') {
        return;
      }
      
      
      // Don't place annotation if input is already visible
      if (inputVisible) {
        return;
      }
      
      // Always use center of screen for first-person mode
      const x = 0;
      const y = 0;
      
      
      // Raycast from center of screen to find intersection with terrain
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const intersects = raycaster.intersectObjects(scene.children, true);
      
      console.log(`Found ${intersects.length} intersections`);
      
      if (intersects.length > 0) {
        const point = intersects[0].point;
        setInputPosition({ x: point.x, y: point.y, z: point.z });
        setInputVisible(true);
      } else {
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isJoined, camera, raycaster, scene, gl, inputVisible]);
  
  const handleSave = () => {
    if (inputText.trim()) {
      onPlaceAnnotation(inputText, inputPosition.x, inputPosition.y, inputPosition.z);
      setInputText('');
      setInputVisible(false);
    }
  };
  
  const handleCancel = () => {
    setInputText('');
    setInputVisible(false);
  };
  
  if (!inputVisible) return null;
  
  return (
    <Html
      position={[inputPosition.x, inputPosition.y + 1, inputPosition.z]}
      center
      distanceFactor={8}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.95)',
          padding: '15px',
          borderRadius: '8px',
          border: '2px solid #4CAF50',
          minWidth: '250px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.7)'
        }}
      >
        <input
          type="text"
          placeholder="Enter annotation text..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSave();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              handleCancel();
            }
          }}
          autoFocus
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '14px',
            border: '1px solid #666',
            borderRadius: '4px',
            background: '#222',
            color: 'white',
            outline: 'none'
          }}
        />
        <div style={{ 
          display: 'flex', 
          gap: '8px', 
          marginTop: '10px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={handleCancel}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              background: '#666',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Save
          </button>
        </div>
      </div>
    </Html>
  );
}

/**
 * Main Collaborative 3D Scene Component
 * Props are passed from parent to ensure we use the same collaboration state
 */
function CollaborativeThreeScene({ 
  heightScale = 0.15,
  collaborationData 
}) {
  const [locked, setLocked] = useState(false);
  const [uiMode, setUiMode] = useState(false); // True when user wants to interact with HUD
  const terrainRef = useRef();
  const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 10, z: 30 });
  const [teleportTo, setTeleportTo] = useState(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  
  // Use passed-in collaboration data if available, otherwise fall back to hook
  const fallbackStore = useCollaborationStore();
  const {
    connected,
    mockMode,
    currentUser,
    activeUsers,
    annotations,
    userPositions,
    updatePosition3D,
    addAnnotation,
    removeAnnotation
  } = collaborationData || fallbackStore;
  
  const isJoined = (connected || mockMode) && currentUser?.id;
  
  // Debug logging
  useEffect(() => {
    console.log(' CollaborativeThreeScene state:', {
      connected,
      mockMode,
      currentUserId: currentUser?.id,
      currentUserName: currentUser?.name,
      isJoined,
      activeUsersCount: activeUsers?.length || 0,
      annotationsCount: annotations?.length || 0
    });
  }, [connected, mockMode, currentUser, isJoined, activeUsers, annotations]);
  
  const handlePlaceAnnotation = useCallback((text, x, y, z) => {
    console.log('handlePlaceAnnotation called:', { text, x, y, z });
    addAnnotation(text, x, y, z);
  }, [addAnnotation]);
  
  const handleTeleport = useCallback((x, y, z) => {
    console.log('Teleporting to:', { x, y, z });
    setTeleportTo({ x, y, z });
    // Reset teleport trigger after a short delay
    setTimeout(() => setTeleportTo(null), 100);
  }, []);
  
  const handlePositionChange = useCallback((pos) => {
    setCurrentPosition(pos);
  }, []);
  
  const handleLockChange = useCallback((isLocked) => {
    console.log('Lock state changed to:', isLocked);
    setLocked(isLocked);
    if (!isLocked) {
      setUiMode(false); // Reset UI mode when unlocking
    }
  }, []);
  
  const toggleUiMode = useCallback(() => {
    setUiMode(prev => {
      const newMode = !prev;
      console.log('Toggling UI mode from', prev, 'to', newMode);
      return newMode;
    });
  }, []);
  
  // Handle Tab key to toggle UI mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Tab' || e.code === 'Tab') && locked) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Tab key pressed');
        toggleUiMode();
      }
    };
    
    // Use capture phase to get the event before pointer lock controls
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [locked, toggleUiMode]);
  

  
  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* HUD Component - show when locked or in UI mode */}
      {(locked || uiMode) && isJoined && (
        <HUD
          position={currentPosition}
          annotations={annotations}
          activeUsers={activeUsers}
          onTeleport={handleTeleport}
          onRemoveAnnotation={removeAnnotation}
          show={locked || uiMode}
          currentUserId={currentUser?.id}
          currentUser={currentUser}
          uiMode={uiMode}
          locked={locked}
        />
      )}
      
      {/* UI Mode Indicator */}
      {locked && uiMode && (
        <div style={{
          position: 'absolute',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99,
          background: 'rgba(0, 255, 0, 0.9)',
          color: '#000',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 'bold',
          pointerEvents: 'none',
          boxShadow: '0 0 20px rgba(0, 255, 0, 0.5)'
        }}>
          🖱️ UI MODE - Press TAB to return to camera control
        </div>
      )}
      
      {!locked && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 100,
          background: 'rgba(0,0,0,0.9)',
          padding: '30px',
          borderRadius: '12px',
          color: 'white',
          textAlign: 'center',
          maxWidth: '500px'
        }}>
          <h3>🌙 Collaborative Lunar Terrain</h3>
          <p style={{ marginBottom: '20px' }}>Click anywhere to start exploring</p>
          
          <div style={{ 
            textAlign: 'left', 
            fontSize: '14px', 
            marginTop: '20px',
            background: 'rgba(255,255,255,0.05)',
            padding: '15px',
            borderRadius: '8px'
          }}>
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#4CAF50' }}>Movement:</strong><br/>
              <strong>WASD</strong> - Move forward/back/left/right<br/>
              <strong>Mouse</strong> - Look around<br/>
              <strong>Space/Shift</strong> - Move up/down
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#2196F3' }}>Annotations:</strong><br/>
              <strong>E Key</strong> - Place annotation at crosshair<br/>
              <span style={{ fontSize: '12px', color: '#999' }}>
                (Aim at terrain and press E to add a note)
              </span>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <strong style={{ color: '#FFA726' }}>UI Interaction:</strong><br/>
              <strong>TAB</strong> - Toggle UI mode (click HUD elements)<br/>
              <strong>❌ Button</strong> - Exit camera control<br/>
              <span style={{ fontSize: '12px', color: '#999' }}>
                (Use TAB to interact with annotations, export PDFs, etc.)
              </span>
            </div>
            <div>
              <strong style={{ color: '#FF6B6B' }}>Exit:</strong><br/>
              <strong>ESC</strong> or <strong>❌ Button</strong> - Leave camera control
            </div>
          </div>
          
          {isJoined && (
            <p style={{ 
              fontSize: '13px', 
              marginTop: '15px',
              color: '#4CAF50',
              fontWeight: 'bold',
              background: 'rgba(76, 175, 80, 0.2)',
              padding: '8px',
              borderRadius: '6px'
            }}>
              ✅ Connected - You can see other users and annotations in real-time!
            </p>
          )}
        </div>
      )}
      
      {/* Crosshair for annotation placement */}
      {locked && isJoined && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 98,
          pointerEvents: 'none'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid rgba(76, 175, 80, 0.8)',
            borderRadius: '50%',
            position: 'relative',
            boxShadow: '0 0 10px rgba(76, 175, 80, 0.5)'
          }}>
            <div style={{
              position: 'absolute',
              width: '2px',
              height: '10px',
              background: 'rgba(76, 175, 80, 0.8)',
              left: '50%',
              top: '-12px',
              transform: 'translateX(-50%)'
            }}/>
            <div style={{
              position: 'absolute',
              width: '2px',
              height: '10px',
              background: 'rgba(76, 175, 80, 0.8)',
              left: '50%',
              bottom: '-12px',
              transform: 'translateX(-50%)'
            }}/>
            <div style={{
              position: 'absolute',
              width: '10px',
              height: '2px',
              background: 'rgba(76, 175, 80, 0.8)',
              top: '50%',
              left: '-12px',
              transform: 'translateY(-50%)'
            }}/>
            <div style={{
              position: 'absolute',
              width: '10px',
              height: '2px',
              background: 'rgba(76, 175, 80, 0.8)',
              top: '50%',
              right: '-12px',
              transform: 'translateY(-50%)'
            }}/>
          </div>
          <div style={{
            position: 'absolute',
            top: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0,0,0,0.7)',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#4CAF50',
            whiteSpace: 'nowrap',
            fontWeight: 'bold'
          }}>
            Press E to place annotation
          </div>
        </div>
      )}
      
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 99,
        background: 'rgba(0,0,0,0.85)',
        padding: '15px',
        borderRadius: '8px',
        color: 'white',
        minWidth: '200px',
        pointerEvents: locked ? 'none' : 'auto'
      }}>
        <h4 style={{ margin: '0 0 10px 0' }}>🌍 Collaboration</h4>
        {isJoined ? (
          <div style={{ fontSize: '13px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>You:</strong> {currentUser.name}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Users:</strong> {activeUsers.length}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>Annotations:</strong> {annotations.length}
            </div>
            <div style={{ 
              fontSize: '11px', 
              color: mockMode ? '#FFA500' : '#4CAF50',
              marginTop: '8px'
            }}>
              {mockMode ? '🤖 Mock Mode' : '🟢 Connected'}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: '#ff6b6b' }}>
            Not connected to collaboration
          </div>
        )}
      </div>
      
      <Canvas 
        camera={{ position: [0, 10, 30], fov: 75 }}
        style={{ 
          background: '#000000',
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      >
        {/* Starry sky background */}
        <StarrySky />
        
        {/* Lighting setup */}
        <ambientLight intensity={0.2} />
        <SunLight />
        {/* Fill light from opposite side for subtle detail */}
        <directionalLight position={[-50, 30, -30]} intensity={0.3} color="#9DB4FF" />
        
        <CollaborativeFirstPersonControls 
          speed={25} 
          updatePosition3D={updatePosition3D}
          isJoined={isJoined}
          terrainRef={terrainRef}
          minHeight={2.5}
          onPositionChange={handlePositionChange}
          teleportTo={teleportTo}
          onLockChange={handleLockChange}
          uiMode={uiMode}
          isAnnotating={isAnnotating}
        />
        
        <React.Suspense fallback={null}>
          <MoonPlane heightScale={heightScale} ref={terrainRef} />
        </React.Suspense>
        
        {/* Render annotations - only 3D annotations (with z coordinate) */}
        {isJoined && annotations
          .filter(annotation => annotation.z !== undefined && annotation.z !== null)
          .map((annotation) => (
            <AnnotationMarker3D
              key={annotation.id}
              annotation={annotation}
              currentUserId={currentUser.id}
              onRemove={removeAnnotation}
            />
          ))}
        
        {/* Render other users */}
        {isJoined && Array.from(userPositions.entries()).map(([userId, position]) => {
          if (userId === currentUser.id) return null;
          if (!position.z) return null; // Only render 3D positions
          
          const user = activeUsers.find(u => u.id === userId);
          return (
            <UserAvatar3D
              key={userId}
              userId={userId}
              userName={user?.name || 'Unknown'}
              position={position}
              rotation={{ pitch: position.pitch || 0, yaw: position.yaw || 0 }}
            />
          );
        })}
        
        {/* Annotation placer */}
        <AnnotationPlacer 
          isJoined={isJoined}
          onPlaceAnnotation={handlePlaceAnnotation}
          terrainRef={terrainRef}
          onAnnotatingChange={setIsAnnotating}
        />
      </Canvas>
      
      {/* Control Buttons */}
      {locked && (
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 99, display: 'flex', gap: '10px' }}>
          {/* Toggle UI Mode Button */}
          <button
            onClick={toggleUiMode}
            style={{
              background: uiMode ? 'rgba(0, 255, 0, 0.9)' : 'rgba(100, 150, 255, 0.9)',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              padding: '10px 15px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              boxShadow: uiMode ? '0 0 15px rgba(0, 255, 0, 0.5)' : '0 0 15px rgba(100, 150, 255, 0.5)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)';
            }}
          >
            {uiMode ? '🎮 Camera Mode' : '🖱️ UI Mode'}
          </button>
          
          {/* Exit Button (only in camera mode) */}
          {!uiMode && (
            <button
              onClick={() => {
                document.exitPointerLock();
                setLocked(false);
              }}
              style={{
                background: 'rgba(255, 100, 100, 0.9)',
                color: 'white',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                padding: '10px 15px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                boxShadow: '0 0 15px rgba(255, 100, 100, 0.5)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 50, 50, 1)';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 100, 100, 0.9)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              ❌ Exit
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default CollaborativeThreeScene;
