import React, { useRef, useMemo } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function ImagePlane({ imageUrl }) {
  const texture = useLoader(THREE.TextureLoader, imageUrl);
  
  return (
    <mesh>
      <sphereGeometry args={[2, 64, 64]} />  //sphereGeometry
      <meshBasicMaterial map={texture} />
    </mesh>
  );
}

function ThreeScene({ imageUrl }) {
  return (
    <div style={{ width: '100%', height: '600px', border: '1px solid blue' }}>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        {/* Image on a plane instead of bblank spheres */}
        <ImagePlane imageUrl={imageUrl} />
        
        <OrbitControls />
      </Canvas>
    </div>
  );
}

export default ThreeScene;