import React, { useEffect, useRef, useState } from 'react';
import OpenSeadragon from 'openseadragon';
import ThreeScene from './ThreeScene';
import './App.css';

function App() {
  const viewerRef = useRef(null);
  const [show3D, setShow3D] = useState(false);
  const imageUrl =  'https://picsum.photos/4000/3000';

  useEffect(() => {
    const viewer = OpenSeadragon({
      id: "openseadragon-viewer",
      prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
      tileSources: {
        type: 'image',
        url:  imageUrl
      }
    });

    viewerRef.current = viewer;

    viewer.addHandler('canvas-click', function(event) {
      if (!event.quick) return;
      
      const viewportPoint = viewer.viewport.pointFromPixel(event.position);
      
      const annotation = document.createElement("div");
      annotation.className = "annotation";
      annotation.textContent = "⚫";
      annotation.style.fontSize = "30px";
      
      viewer.addOverlay({
        element: annotation,
        location: viewportPoint
      });
      
      console.log('Added annotation at:', viewportPoint);
    });

  }, []);

  return (
    <div className="App">
      <h1>Space Viewer</h1>
      <button onClick={() => setShow3D(!show3D)}>
        {show3D ? 'Show 2D View' : 'Show 3D View'}
      </button>
      
      {!show3D ? (
        <div>
          <h2>2D View - Click to Add Annotations</h2>
          <div id="openseadragon-viewer" style={{ width: '100%', height: '600px', border: '1px solid black' }}></div>
        </div>
      ) : (
        <div>
          <h2>3D View</h2>
          <ThreeScene imageUrl={imageUrl}/>
        </div>
      )}
    </div>
  );
}

export default App;