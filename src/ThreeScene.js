import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function ImagePlane({ imageUrl, heightScale = 0.15 }) {
  const [colorTexture, setColorTexture] = useState(null);
  const [heightTexture, setHeightTexture] = useState(null);
  
  useEffect(() => {
    const colorLoader = new THREE.TextureLoader();
    const heightLoader = new THREE.TextureLoader();
    
    colorLoader.load('/moon_data/moon_color_16k.png', setColorTexture);
    heightLoader.load('/moon_data/moon_height_16k.png', setHeightTexture);
  }, []);
  
  const geometry = useMemo(() => {
    if (!heightTexture?.image) return new THREE.SphereGeometry(2, 256, 256);
    
    const radius = 2;
    const geo = new THREE.SphereGeometry(radius, 256, 256);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = heightTexture.image;
    
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const positions = geo.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const vertex = new THREE.Vector3(x, y, z);
      const theta = Math.atan2(vertex.x, vertex.z);
      const phi = Math.acos(vertex.y / radius);
      
      const u = (theta + Math.PI) / (2 * Math.PI);
      const v = phi / Math.PI;
      
      const px = Math.floor(u * (canvas.width - 1));
      const py = Math.floor(v * (canvas.height - 1));
      const index = (py * canvas.width + px) * 4;
      
      const height = (imageData.data[index] * 256 + imageData.data[index + 1]) / 65535;
      const displacement = (height - 0.5) * heightScale * radius * 0.3;
      
      vertex.normalize().multiplyScalar(radius + displacement);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, [heightTexture, heightScale]);
  
  if (!colorTexture || !heightTexture) {
    return (
      <mesh>
        <sphereGeometry args={[2, 64, 64]} />
        <meshBasicMaterial color="#888888" />
      </mesh>
    );
  }
  
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial map={colorTexture} />
    </mesh>
  );
}

function ThreeScene({ imageUrl }) {
  return (
    <div style={{ width: '100%', height: '600px', border: '1px solid blue' }}>
      <Canvas camera={{ position: [0, 0, 5] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <directionalLight position={[-10, -5, -5]} intensity={0.3} />
        
        <ImagePlane imageUrl={imageUrl} />
        
        <OrbitControls 
          enableDamping={true}
          dampingFactor={0.05}
          minDistance={2.5}
          maxDistance={10}
        />
      </Canvas>
    </div>
  );
}

export default ThreeScene;