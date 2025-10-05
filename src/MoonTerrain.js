import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';

function MoonPlane({ heightScale }) {
  const meshRef = useRef();
  
  const [colorTexture, setColorTexture] = useState(null);
  const [heightTexture, setHeightTexture] = useState(null);
  
  useEffect(() => {
    const colorLoader = new THREE.TextureLoader();
    const heightLoader = new THREE.TextureLoader();
    
    colorLoader.load('/moon_data/moon_color_16k.png', setColorTexture);
    heightLoader.load('/moon_data/moon_height_16k.png', setHeightTexture);
  }, []);
  
  const geometry = useMemo(() => {
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
    // elevation logic
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
      ref={meshRef} 
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
}
// first person
function FirstPersonControls({ speed = 20 }) {
  const { camera } = useThree();
  const keysRef = useRef({});
  
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
    
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();
    
    const movement = new THREE.Vector3();
    
    if (keys['KeyW']) movement.add(forward);
    if (keys['KeyS']) movement.sub(forward);
    if (keys['KeyD']) movement.add(right);
    if (keys['KeyA']) movement.sub(right);
    if (keys['Space']) movement.y += 1;
    if (keys['ShiftLeft']) movement.y -= 1;
    
    if (movement.length() > 0) {
      movement.normalize().multiplyScalar(moveSpeed);
      camera.position.add(movement);
    }
  });
  
  return <PointerLockControls />;
}

function MoonTerrain() {
  const [heightScale, setHeightScale] = useState(0.15);
  const [locked, setLocked] = useState(false);
  
  return (
    <div style={{ width: '100%', height: '100vh' }}>
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
          textAlign: 'center'
        }}>
          <h3>Lunar Terrain Flythrough</h3>
          <p>Click anywhere to start</p>
          <p style={{ fontSize: '14px', marginTop: '20px' }}>
            WASD - Move<br/>
            Mouse - Look around<br/>
            Space/Shift - Up/Down<br/>
            ESC - Exit
          </p>
        </div>
      )}
      
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 99,
        background: 'rgba(0,0,0,0.7)',
        padding: '15px',
        borderRadius: '8px',
        color: 'white',
        pointerEvents: locked ? 'none' : 'auto'
      }}>
        <h3>Lunar Terrain Explorer</h3>
        <div>
          <label>Height Exaggeration: {heightScale.toFixed(2)}x</label>
          <input
            type="range"
            min="0.05"
            max="0.5"
            step="0.01"
            value={heightScale}
            onChange={(e) => setHeightScale(parseFloat(e.target.value))}
            style={{ width: '200px', display: 'block', marginTop: '5px' }}
          />
        </div>
      </div>
      
      <Canvas 
        camera={{ position: [0, 10, 30], fov: 75 }}
        onPointerDown={() => setLocked(true)}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[50, 50, 30]} intensity={1.2} />
        <directionalLight position={[-50, 30, -30]} intensity={0.5} />
        
        <FirstPersonControls speed={25} />
        
        <React.Suspense fallback={null}>
          <MoonPlane heightScale={heightScale} />
        </React.Suspense>
        
        <gridHelper args={[200, 50]} position={[0, -5, 0]} />
      </Canvas>
    </div>
  );
}

export default MoonTerrain;