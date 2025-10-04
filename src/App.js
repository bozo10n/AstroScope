import React, { useEffect, useRef, useState } from 'react';
import OpenSeadragon from 'openseadragon';
import ThreeScene from './ThreeScene';
import './App.css';

function App() {
    const viewerRef = useRef(null);
    const [show3D, setShow3D] = useState(false);
    const [inputVisible, setInputVisible] = useState(false);
    const [inputPosition, setInputPosition] = useState({ x: 0, y: 0 });
    const [inputText, setInputText] = useState('');
    const imageUrl = 'https://picsum.photos/4000/3000';

    useEffect(() => {
        const viewer = OpenSeadragon({
            id: 'openseadragon-viewer',
            prefixUrl: 'https://openseadragon.github.io/openseadragon/images/',
            tileSources: {
                type: 'image',
                url: imageUrl,
            },
        });

        viewerRef.current = viewer;

        // handle clicks on the image
        viewer.addHandler('canvas-click', function (event) {
            if (!event.quick) return;

            // store click position
            const viewportPoint = viewer.viewport.pointFromPixel(event.position);
            const pixelPoint = event.position;

            // record where the input should appear (screen coordinates)
            setInputVisible(true);
            setInputPosition({ x: pixelPoint.x, y: pixelPoint.y });

            // store the viewport position for later when saving
            viewerRef.current.tempAnnotationLocation = viewportPoint;
        });

        return () => viewer.destroy();
    }, []);

    // function to save annotation
    const saveAnnotation = () => {
        const viewer = viewerRef.current;
        const viewportPoint = viewer.tempAnnotationLocation;

        if (!inputText.trim()) {
            setInputVisible(false);
            setInputText('');
            return;
        }

        // create the visible annotation label
        const annotation = document.createElement('div');
        annotation.className = 'visible-anno-label';
        annotation.textContent = inputText;

        viewer.addOverlay({
            element: annotation,
            location: viewportPoint,
        });

        console.log('Added annotation:', inputText, 'at', viewportPoint);

        setInputVisible(false);
        setInputText('');
    };

    // function to cancel input
    const cancelAnnotation = () => {
        setInputVisible(false);
        setInputText('');
    };

    return (
        <div className="App">
            <h1>Space Viewer</h1>

            <button onClick={() => setShow3D(!show3D)}>
                {show3D ? 'Show 2D View' : 'Show 3D View'}
            </button>

            {!show3D ? (
                <div style={{ position: 'relative' }}>
                    <h2>2D View - Click to Add Annotations</h2>
                    <div
                        id="openseadragon-viewer"
                        style={{
                            width: '100%',
                            height: '600px',
                            border: '1px solid black',
                        }}
                    ></div>

                    {/* custom input box */}
                    {inputVisible && (
                        <div
                            className="annotationInput"
                            style={{
                                top: inputPosition.y,
                                left: inputPosition.x,
                            }}
                        >
                            <input
                                type="text"
                                placeholder="Enter annotation text..."
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                            />
                            <div className="controls">
                                <button className="secondary" onClick={cancelAnnotation}>
                                    Cancel
                                </button>
                                <button onClick={saveAnnotation}>Save</button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <h2>3D View</h2>
                    <ThreeScene imageUrl={imageUrl} />
                </div>
            )}
        </div>
    );
}

export default App;
