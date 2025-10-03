import React, { useEffect } from 'react';
import OpenSeadragon from 'openseadragon';
import './App.css';

function App() {
  useEffect(() => {
    const viewer = OpenSeadragon({
      id: "openseadragon-viewer",
      prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
      tileSources: {
        type: 'image',
        url: 'https://picsum.photos/4000/3000'  // shows random image.
      }
    });
  }, []);

  return (
    <div className="App">
      <h1>Space Viewer</h1>
      <div id="openseadragon-viewer" style={{ width: '100%', height: '600px', border: '1px solid black' }}></div>
    </div>
  );
}

export default App;