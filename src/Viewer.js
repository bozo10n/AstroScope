import React, { useRef, useState, useEffect, useCallback } from "react";
import OpenSeadragon from "openseadragon";
import ThreeScene from "./ThreeScene";
import CollaborativeThreeScene from "./CollaborativeThreeScene";
import { useCollaborationStore } from "./hooks/useCollaborationStore";
import UserCursor from "./components/UserCursor";
import AnnotationMarker from "./components/AnnotationMarker";
import ImageOverlay from "./components/ImageOverlay";
import ViewerToolbar from "./components/ViewerToolbar";
import DragPreview from "./components/DragPreview";
import "./Viewer.css";
import { useParams } from "react-router-dom";

// Constants
const TILE_SOURCE_CONFIG = {
  width: 10121,
  height: 7085,
  tileSize: 254,
  tileOverlap: 1,
  minLevel: 0,
  maxLevel: 6,
  getTileUrl: (level, x, y) => `/space1/space1_files/${level}/${x}_${y}.jpg`
};

const ZOOM_FACTOR = {
  IN: 1.5,
  OUT: 0.7
};

const VIEWPORT_BOUNDS = {
  MIN: -0.1,
  MAX: 1.1
};

const Viewer = () => {
  // this is passed from the /viewer/(id) param
  // use this to get image
  const { id } = useParams(); 

  // Refs
  const viewerRef = useRef(null);
  
  // View state
  const [show3D, setShow3D] = useState(false);
  const [viewportVersion, setViewportVersion] = useState(0);
  
  // Store annotation overlay elements
  const annotationOverlaysRef = useRef(new Map());
  
  // Collaboration state
  const [userName, setUserName] = useState("");
  const [roomId, setRoomId] = useState("1");
  const [isJoined, setIsJoined] = useState(false);
  
  // Annotation input state
  const [inputVisible, setInputVisible] = useState(false);
  const [inputPosition, setInputPosition] = useState({ x: 0, y: 0 });
  const [inputText, setInputText] = useState("");
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  
  // Annotation sidebar visibility
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // Collaboration store
  const {
    connected,
    mockMode,
    currentUser,
    activeUsers,
    annotations,
    overlays,
    userPositions,
    initSocket,
    joinRoom,
    addAnnotation,
    removeAnnotation,
    removeOverlay,
    updatePosition,
    updatePosition3D,
    updateAnnotationPosition,
    updateOverlayPosition,
    updateOverlaySize
  } = useCollaborationStore();

  // Prevent pointer lock when in 2D mode
  useEffect(() => {
    const preventPointerLock = (e) => {
      if (!show3D && document.pointerLockElement) {
        console.warn('Exiting pointer lock - in 2D mode');
        document.exitPointerLock();
      }
    };
    
    // Check periodically and on visibility change
    const interval = setInterval(preventPointerLock, 100);
    document.addEventListener('visibilitychange', preventPointerLock);
    document.addEventListener('pointerlockchange', preventPointerLock);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', preventPointerLock);
      document.removeEventListener('pointerlockchange', preventPointerLock);
    };
  }, [show3D]);

  // Canvas click handler
  const handleCanvasClick = useCallback((event) => {
    if (!event.quick || !viewerRef.current) return;
    
    const viewer = viewerRef.current;
    // Get the viewport point (this is in normalized image coordinates 0-1)
    const viewportPoint = viewer.viewport.pointFromPixel(event.position);
    const viewerElementPoint = viewer.viewport.viewportToViewerElementCoordinates(viewportPoint);
    
    setInputVisible(true);
    setInputPosition({ x: viewerElementPoint.x, y: viewerElementPoint.y });
    // Store viewport coordinates (0-1 normalized) - these stay fixed relative to the image
    viewer.tempAnnotationLocation = viewportPoint;
  }, []);

  // Viewport change handler
  const handleViewportChange = useCallback(() => {
    if (!viewerRef.current || !isJoined) return;
    
    const viewer = viewerRef.current;
    const center = viewer.viewport.getCenter();
    const zoom = viewer.viewport.getZoom();
    updatePosition(center.x, center.y, zoom);
  }, [isJoined, updatePosition]);

  // Check if user owns the item
  const isOwner = useCallback((item) => {
    const itemUserId = item.user_id || item.userId;
    return itemUserId === currentUser.id;
  }, [currentUser.id]);

  // Start dragging annotation
  const startDragAnnotation = useCallback((annotation, event) => {
    if (!isOwner(annotation)) return;
    
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
    setDraggedItem({ ...annotation, type: 'annotation' });
  }, [isOwner]);

  // Start dragging overlay
  const startDragOverlay = useCallback((overlay, event) => {
    if (!isOwner(overlay)) return;
    
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
    setDraggedItem({ ...overlay, type: 'overlay' });
  }, [isOwner]);

  // Start resizing overlay
  const startResize = useCallback((overlay, event) => {
    if (!isOwner(overlay)) return;
    
    event.preventDefault();
    event.stopPropagation();
    setIsResizing(true);
    setDraggedItem({ ...overlay, type: 'overlay' });
  }, [isOwner]);
  
  // Add/update OpenSeadragon overlays for annotations
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || show3D || !isJoined) return;
    
    const annotations2D = annotations.filter(a => a.z === undefined || a.z === null);
    
    // Remove overlays for annotations that no longer exist
    annotationOverlaysRef.current.forEach((element, annotationId) => {
      if (!annotations2D.find(a => a.id === annotationId)) {
        viewer.removeOverlay(element);
        annotationOverlaysRef.current.delete(annotationId);
      }
    });
    
    // Add or update overlays for current annotations
    annotations2D.forEach(annotation => {
      let element = annotationOverlaysRef.current.get(annotation.id);
      
      if (!element) {
        // Create new overlay element
        element = document.createElement('div');
        element.className = 'osd-annotation-overlay';
        element.id = `annotation-overlay-${annotation.id}`;
        annotationOverlaysRef.current.set(annotation.id, element);
        
        // Add to OpenSeadragon as overlay (this makes it stick to the image!)
        viewer.addOverlay({
          element: element,
          location: new OpenSeadragon.Point(annotation.x, annotation.y),
          placement: OpenSeadragon.Placement.CENTER
        });
      }
      
      // Update element content (using ReactDOM is better, but for now use innerHTML)
      const isOwn = (annotation.user_id || annotation.userId) === currentUser.id;
      element.innerHTML = `
        <div class="annotation-marker-osd ${isDragging && draggedItem?.id === annotation.id ? 'being-dragged' : ''}" 
             data-annotation-id="${annotation.id}"
             style="pointer-events: auto; cursor: ${isOwn ? 'move' : 'pointer'};">
          📌
          <div class="annotation-popup-osd">
            <div class="annotation-user">${annotation.user_name || annotation.userName || 'Unknown User'}</div>
            <div class="annotation-text">${annotation.text}</div>
            ${isOwn ? `<button class="annotation-delete-btn-osd" onclick="window.deleteAnnotation('${annotation.id}')">🗑️ Delete</button>` : ''}
          </div>
        </div>
      `;
      
      // Add event listeners
      const markerEl = element.querySelector('.annotation-marker-osd');
      if (markerEl) {
        markerEl.onclick = (e) => {
          e.stopPropagation();
          setSelectedAnnotation(annotation);
        };
        
        if (isOwn) {
          markerEl.onmousedown = (e) => {
            e.preventDefault();
            e.stopPropagation();
            startDragAnnotation(annotation, e);
          };
        }
      }
    });
    
  }, [annotations, show3D, isJoined, currentUser.id, isDragging, draggedItem, startDragAnnotation]);
  
  // Global delete function for annotations
  useEffect(() => {
    window.deleteAnnotation = (annotationId) => {
      if (window.confirm('Delete this annotation?')) {
        removeAnnotation(annotationId);
      }
    };
    return () => {
      delete window.deleteAnnotation;
    };
  }, [removeAnnotation]);

  // Initialize OpenSeadragon viewer
  useEffect(() => {
    // Only initialize when in 2D mode
    if (show3D) {
      console.log("In 3D mode, skipping OpenSeadragon initialization");
      return;
    }

    // Check if the DOM element exists before initializing
    const element = document.getElementById("openseadragon-viewer");
    if (!element) {
      console.warn("OpenSeadragon viewer element not found, skipping initialization");
      return;
    }

    // Prevent double initialization
    if (viewerRef.current) {
      console.log("Viewer already initialized");
      return;
    }

    console.log("Initializing OpenSeadragon with config:", TILE_SOURCE_CONFIG);

    try {
      const viewer = OpenSeadragon({
        id: "openseadragon-viewer",
        prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
        tileSources: TILE_SOURCE_CONFIG,
        showNavigator: true,
        navigatorPosition: "BOTTOM_RIGHT",
        navigatorSizeRatio: 0.15,
        constrainDuringPan: true,
        visibilityRatio: 0.5,
        debugMode: false,
        crossOriginPolicy: false, // Allow cross-origin tiles
        ajaxWithCredentials: false,
      });

      viewerRef.current = viewer;
      
      // Add error handlers to see what's happening
      viewer.addHandler("open-failed", (event) => {
        console.error("❌ OpenSeadragon failed to open:", event);
      });
      
      viewer.addHandler("tile-load-failed", (event) => {
        console.error("❌ Tile failed to load:", event.tile?.url || event);
      });
      
      viewer.addHandler("open", () => {
        console.log("✅ OpenSeadragon viewer opened successfully!");
      });
      
      viewer.addHandler("tile-loaded", () => {
        console.log("✅ Tile loaded");
      });
      
      viewer.addHandler("canvas-click", handleCanvasClick);
      viewer.addHandler("viewport-change", handleViewportChange);
    } catch (error) {
      console.error("❌ Error initializing OpenSeadragon:", error);
    }

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed) {
        console.log("Destroying OpenSeadragon viewer");
        viewerRef.current.destroy();
      }
      viewerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show3D]); // Reinitialize when switching between 2D/3D

  // Drag move handler
  const handleDragMove = useCallback((event) => {
    if (!draggedItem || !viewerRef.current || !isDragging) return;
    
    const viewer = viewerRef.current;
    const rect = viewer.element.getBoundingClientRect();
    
    const containerPoint = new OpenSeadragon.Point(
      event.clientX - rect.left,
      event.clientY - rect.top
    );
    
    const viewportPoint = viewer.viewport.viewerElementToViewportCoordinates(containerPoint);
    
    const clampedX = Math.max(VIEWPORT_BOUNDS.MIN, Math.min(VIEWPORT_BOUNDS.MAX, viewportPoint.x));
    const clampedY = Math.max(VIEWPORT_BOUNDS.MIN, Math.min(VIEWPORT_BOUNDS.MAX, viewportPoint.y));
    
    if (draggedItem.type === 'annotation') {
      updateAnnotationPosition(draggedItem.id, clampedX, clampedY);
      
      // Update OpenSeadragon overlay position immediately
      const element = annotationOverlaysRef.current.get(draggedItem.id);
      if (element) {
        viewer.updateOverlay(element, new OpenSeadragon.Point(clampedX, clampedY));
      }
    } else if (draggedItem.type === 'overlay') {
      updateOverlayPosition(draggedItem.id, clampedX, clampedY);
    }
  }, [draggedItem, isDragging, updateAnnotationPosition, updateOverlayPosition]);

  // Resize move handler
  const handleResizeMove = useCallback((event) => {
    if (!draggedItem || !viewerRef.current) return;
    // TODO: Implement resize logic
    console.log('Resize move:', event.clientX, event.clientY);
  }, [draggedItem]);

  // Mouse event handlers for drag and drop
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (event) => {
      if (isDragging) {
        handleDragMove(event);
      } else if (isResizing) {
        handleResizeMove(event);
      }

      setDragPreview({
        type: draggedItem?.type || 'dragging',
        x: event.clientX,
        y: event.clientY
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setDraggedItem(null);
      setDragPreview(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, draggedItem, handleDragMove, handleResizeMove]);

  // Toolbar handlers
  const handleZoomIn = useCallback(() => {
    viewerRef.current?.viewport.zoomBy(ZOOM_FACTOR.IN);
  }, []);

  const handleZoomOut = useCallback(() => {
    viewerRef.current?.viewport.zoomBy(ZOOM_FACTOR.OUT);
  }, []);

  const handleResetView = useCallback(() => {
    viewerRef.current?.viewport.goHome();
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    const viewerElement = document.getElementById("openseadragon-viewer");
    if (!viewerElement) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      viewerElement.requestFullscreen();
    }
  }, []);

  // Convert viewport coordinates to pixel coordinates for overlays (used for image overlays, not annotations)
  const getOverlayStyle = useCallback((item) => {
    const viewer = viewerRef.current;
    if (!viewer?.viewport) return { display: 'none' };
    
    try {
      const imagePoint = new OpenSeadragon.Point(item.x, item.y);
      const viewerPoint = viewer.viewport.viewportToViewerElementCoordinates(imagePoint);
      
      const style = {
        position: 'absolute',
        left: `${viewerPoint.x}px`,
        top: `${viewerPoint.y}px`,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'auto'
      };

      if (item.width && item.height) {
        const sizePoint = new OpenSeadragon.Point(item.width, item.height);
        const sizePixel = viewer.viewport.deltaPixelsFromPointsNoRotate(sizePoint);
        style.width = `${Math.abs(sizePixel.x)}px`;
        style.height = `${Math.abs(sizePixel.y)}px`;
        style.transform = 'translate(0, 0)';
      }

      return style;
    } catch (error) {
      console.error('Error calculating overlay style:', error, item);
      return { display: 'none' };
    }
  }, []);

  // Annotation handlers
  const saveAnnotation = useCallback(() => {
    const viewer = viewerRef.current;
    const viewportPoint = viewer?.tempAnnotationLocation;
    
    if (!inputText.trim() || !viewportPoint) {
      setInputVisible(false);
      setInputText("");
      return;
    }

    addAnnotation(inputText, viewportPoint.x, viewportPoint.y);
    setInputVisible(false);
    setInputText("");
  }, [inputText, addAnnotation]);

  const cancelAnnotation = useCallback(() => {
    setInputVisible(false);
    setInputText("");
  }, []);

  // Collaboration handlers
  const handleJoinRoom = useCallback(() => {
    if (!userName.trim()) return;
    
    // Initialize socket first and get the socket instance
    const socketInstance = initSocket();
    
    // Function to join the room with the correct socket instance
    const doJoin = () => {
      // Pass the socket instance to ensure we use the correct socket
      joinRoom(roomId, userName.trim(), socketInstance);
      setIsJoined(true);
    };
    
    // Wait for connection before joining room
    if (socketInstance) {
      // If already connected, join immediately
      if (socketInstance.connected) {
        doJoin();
      } else {
        // Wait for connection event
        console.log('Waiting for socket connection...');
        socketInstance.once('connect', () => {
          doJoin();
        });
      }
    }
  }, [userName, roomId, initSocket, joinRoom]);

  const handleLeaveRoom = useCallback(() => {
    setIsJoined(false);
    setUserName("");
  }, []);

  // Handle jump to annotation
  const handleJumpToAnnotation = useCallback((annotation) => {
    if (!viewerRef.current) return;
    
    const viewer = viewerRef.current;
    const point = new OpenSeadragon.Point(annotation.x, annotation.y);
    
    // Smoothly pan to the annotation
    viewer.viewport.panTo(point, true);
    viewer.viewport.zoomTo(viewer.viewport.getMaxZoom() * 0.5, point, true);
  }, []);

  // Render annotation list sidebar
  const renderAnnotationList = () => {
    const annotations2D = annotations.filter(a => a.z === undefined || a.z === null);
    
    return (
      <>
        {/* Toggle button - always visible */}
        <button
          className="annotation-sidebar-toggle"
          onClick={() => setSidebarVisible(!sidebarVisible)}
          title={sidebarVisible ? "Hide annotations list" : "Show annotations list"}
        >
          {sidebarVisible ? '◀' : '▶'} {!sidebarVisible && `📍 ${annotations2D.length}`}
        </button>
        
        {/* Sidebar - conditionally visible */}
        {sidebarVisible && (
          <div className="annotation-list-sidebar">
            <div className="annotation-list-header">
              <div className="annotation-list-title">
                <span>📍</span>
                <span>Annotations</span>
              </div>
              <div className="annotation-list-count">{annotations2D.length}</div>
            </div>
        
        {annotations2D.length === 0 ? (
          <div className="annotation-list-empty">
            No annotations yet.<br/>
            Click on the image to create one.
          </div>
        ) : (
          <div>
            {annotations2D.map((annotation) => {
              const isOwn = (annotation.user_id || annotation.userId) === currentUser.id;
              
              return (
                <div 
                  key={annotation.id}
                  className={`annotation-list-item ${isOwn ? 'own' : ''}`}
                  onClick={() => handleJumpToAnnotation(annotation)}
                >
                  <div className="annotation-list-item-header">
                    <div className="annotation-list-item-text">
                      {annotation.text}
                    </div>
                    {isOwn && (
                      <span className="annotation-list-item-badge">You</span>
                    )}
                  </div>
                  
                  <div className="annotation-list-item-meta">
                    <div className="annotation-list-item-user">
                      <span>👤</span>
                      <span>{annotation.user_name || annotation.userName || 'Unknown'}</span>
                    </div>
                  </div>
                  
                  <div className="annotation-list-item-actions">
                    <button 
                      className="annotation-list-item-btn jump"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJumpToAnnotation(annotation);
                      }}
                    >
                      🎯 Jump to Location
                    </button>
                    {isOwn && (
                      <button 
                        className="annotation-list-item-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete annotation "${annotation.text}"?`)) {
                            removeAnnotation(annotation.id);
                          }
                        }}
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
          </div>
        )}
      </>
    );
  };

  // Render collaboration panel
  const renderCollaborationPanel = () => (
    <div className="collaboration-panel">
      {!isJoined ? (
        <div>
          <h3>Join Collaboration Room</h3>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Enter your name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              style={{ width: "100px" }}
            />
            <button 
              onClick={handleJoinRoom}
              disabled={!userName.trim()}
              style={{ 
                backgroundColor: userName.trim() ? "#007acc" : "#ccc",
                color: "white",
                cursor: userName.trim() ? "pointer" : "not-allowed"
              }}
            >
              Join Room
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{currentUser.name}</strong> in Room: {roomId}
              <span className={`status-indicator ${connected ? (mockMode ? 'status-mock' : 'status-connected') : 'status-disconnected'}`}>
                {connected ? (mockMode ? "Mock Mode" : "Connected") : "Disconnected"}
              </span>
            </div>
            <button 
              onClick={handleLeaveRoom}
              style={{ 
                padding: "4px 8px", 
                borderRadius: "4px", 
                border: "1px solid #ccc", 
                backgroundColor: "white",
                cursor: "pointer"
              }}
            >
              Leave
            </button>
          </div>
          {activeUsers.length > 1 && (
            <div style={{ marginTop: "8px", fontSize: "14px" }}>
              <strong>Active Users ({activeUsers.length}):</strong> {' '}
              {activeUsers.map(user => user.name).join(", ")}
            </div>
          )}
          {annotations.length > 0 && (
            <div style={{ marginTop: "8px", fontSize: "14px" }}>
              <strong>Annotations:</strong> {annotations.length} total
            </div>
          )}
          {overlays.length > 0 && (
            <div style={{ marginTop: "8px", fontSize: "14px" }}>
              <strong>Overlays:</strong> {overlays.length} total
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="App">
      <h1>Space Viewer</h1>
      
      {renderCollaborationPanel()}

      <button onClick={() => {
        // Exit pointer lock before switching views
        if (document.pointerLockElement) {
          document.exitPointerLock();
        }
        
        // Small delay to ensure pointer lock is fully released before switching
        setTimeout(() => {
          setShow3D(!show3D);
        }, 100);
      }}>
        {show3D ? "Show 2D View" : "Show 3D View"}
      </button>

      {!show3D ? (
        <div style={{ position: "relative" }}>
          <h2>2D View {isJoined ? "- Click to Add Collaborative Annotations" : "- Join a room to collaborate"}</h2>
          <div style={{ 
            position: "relative", 
            width: "100%", 
            height: "600px",
            overflow: "hidden" 
          }}>
            <div
              id="openseadragon-viewer"
              style={{ 
                width: "100%", 
                height: "100%", 
                border: "1px solid black", 
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 1
              }}
            />

            {/* Annotation List Sidebar */}
            {isJoined && renderAnnotationList()}
            
            {/* Annotations are now managed by OpenSeadragon overlay system - see useEffect above */}
            
            {/* Overlay container for image overlays (not annotations) */}
            <div 
              id="overlay-container"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 10
              }}
            >
              {isJoined && overlays.map(overlay => (
                <ImageOverlay
                  key={`${overlay.id}-${viewportVersion}`}
                  overlay={overlay}
                  currentUserId={currentUser.id}
                  onRemove={removeOverlay}
                  onStartDrag={startDragOverlay}
                  onStartResize={startResize}
                  isDragging={isDragging && draggedItem?.id === overlay.id}
                  style={getOverlayStyle(overlay)}
                  apiBase=""
                />
              ))}
            </div>

            {/* User cursors - above annotations */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 50
            }}>
              {isJoined && Array.from(userPositions.entries()).map(([userId, position]) => {
                if (userId === currentUser.id) return null;
                const user = activeUsers.find(u => u.id === userId);
                return (
                  <UserCursor
                    key={userId}
                    userId={userId}
                    position={position}
                    userName={user?.name || 'Unknown'}
                  />
                );
              })}
            </div>

            {/* Toolbar - highest z-index */}
            {isJoined && (
              <div style={{ position: "absolute", zIndex: 100 }}>
                <ViewerToolbar
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onResetView={handleResetView}
                  onToggleFullscreen={handleToggleFullscreen}
                />
              </div>
            )}
          </div>

          <DragPreview
            dragPreview={dragPreview}
            isVisible={isDragging || isResizing}
          />

          {inputVisible && isJoined && (
            <div
              className="annotationInput"
              style={{ 
                top: inputPosition.y, 
                left: inputPosition.x,
                position: 'absolute',
                zIndex: 200
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
                    saveAnnotation();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelAnnotation();
                  }
                }}
                autoFocus
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
          <h2>3D Collaborative View</h2>
          {isJoined ? (
            <CollaborativeThreeScene 
              collaborationData={{
                connected,
                mockMode,
                currentUser,
                activeUsers,
                annotations,
                userPositions,
                updatePosition3D,
                addAnnotation,
                removeAnnotation
              }}
            />
          ) : (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.1)',
              margin: '20px',
              borderRadius: '12px',
              border: '2px dashed #666'
            }}>
              <h3>Join a room to enable 3D collaboration</h3>
              <p style={{ color: '#666' }}>
                Connect to see other users, their positions, and shared annotations in the 3D space
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Viewer;
