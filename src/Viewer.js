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
import viewerConfig from "./viewerConfig.json";
import { useParams, useNavigate } from "react-router-dom";

let shootingStarInterval;

const ZOOM_FACTOR = {
  IN: 1.5,
  OUT: 0.7
};

const VIEWPORT_BOUNDS = {
  MIN: -0.1,
  MAX: 1.1
};

const Viewer = () => {
  function applySpaceTheme() {
    document.body.style.background =
      "linear-gradient(to right, #09162a, #0d284d, #113b72, #194f99)";
    createBackgroundStars();
    startShootingStars();
  }

  function startShootingStars() {
    shootingStarInterval = setInterval(() => {
      if (Math.random() > 0.75) {
        createShootingStar();
      }
    }, 3000);
  }

  function createBackgroundStars() {
    const totalStars = 200;
    for (let i = 0; i < totalStars; i++) {
      const star = document.createElement("div");
      star.classList.add("backgroundStar");
      const x = Math.random() * window.innerWidth - 20;
      const y = Math.random() * document.documentElement.scrollHeight - 20;
      star.style.left = x + "px";
      star.style.top = y + "px";
      star.style.animationDelay = Math.random() * 5 + "s";
      if (document.body) {
        document.body.appendChild(star);
      }
    }
  }

  function removeBackgroundStars() {
    const stars = document.querySelectorAll(".backgroundStar");
    stars.forEach((star) => {
      if (star.parentNode) {
        star.parentNode.removeChild(star);
      }
    });
  }

  function createShootingStar() {
    if (!document.body) return; // Safety check
    
    const shootingStar = document.createElement("div");
    shootingStar.classList.add("shootingStar");

    let x = Math.random() > 0.5 ? window.innerWidth - 100 : 100;
    let y = Math.random() * (document.documentElement.scrollHeight / 2);

    shootingStar.style.left = x + "px";
    shootingStar.style.top = y + "px";

    if (x > window.innerWidth / 2) {
      shootingStar.style.animation = "shootingLeft 1.5s linear forwards";
      shootingStar.classList.add("left");
    } else {
      shootingStar.style.animation = "shootingRight 1.5s linear forwards";
      shootingStar.classList.add("right");
    }

    document.body.appendChild(shootingStar);

    shootingStar.addEventListener("animationend", () => {
      if (shootingStar.parentNode) {
        shootingStar.parentNode.removeChild(shootingStar);
      }
    });
  }

  function stopShootingStars() {
    clearInterval(shootingStarInterval);
    const shootingStars = document.querySelectorAll(".shootingStar");
    shootingStars.forEach((star) => {
      if (star.parentNode) {
        star.style.animation = "none";
        star.parentNode.removeChild(star);
      }
    });
  }

  // this is passed from the /viewer/(id) param
  // use this to get image
  const { id } = useParams(); 
  const navigate = useNavigate();
  
  // Get viewer configuration based on ID
  const viewerData = viewerConfig.viewers.find(v => v.id === id);
  
  // Generate tile source config from viewer data
  const getTileSourceConfig = () => {
    if (!viewerData || !viewerData.tileSource) return null;
    
    const { tileSource } = viewerData;
    if (tileSource.type === "dzi") {
      return {
        width: tileSource.width,
        height: tileSource.height,
        tileSize: tileSource.tileSize,
        tileOverlap: tileSource.tileOverlap,
        minLevel: tileSource.minLevel,
        maxLevel: tileSource.maxLevel,
        getTileUrl: (level, x, y) => tileSource.getTileUrl
          .replace("{level}", level)
          .replace("{x}", x)
          .replace("{y}", y)
      };
    }
    return null;
  };

  // Refs
  const viewerRef = useRef(null);
  
  // View state
  const [show3D, setShow3D] = useState(false);
  const [viewportVersion, setViewportVersion] = useState(0);
  
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
  
  // Sidebar state
  const [showAnnotationSidebar, setShowAnnotationSidebar] = useState(true);

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

  // Canvas click handler
  const handleCanvasClick = useCallback((event) => {
    if (!event.quick || !viewerRef.current) return;
    
    const viewer = viewerRef.current;
    const viewportPoint = viewer.viewport.pointFromPixel(event.position);
    const viewerElementPoint = viewer.viewport.viewportToViewerElementCoordinates(viewportPoint);
    
    setInputVisible(true);
    setInputPosition({ x: viewerElementPoint.x, y: viewerElementPoint.y });
    viewer.tempAnnotationLocation = viewportPoint;
  }, []);

  // Viewport change handler
  const handleViewportChange = useCallback(() => {
    if (!viewerRef.current || !isJoined) return;
    
    const viewer = viewerRef.current;
    const center = viewer.viewport.getCenter();
    const zoom = viewer.viewport.getZoom();
    updatePosition(center.x, center.y, zoom);
    setViewportVersion(v => v + 1);
  }, [isJoined, updatePosition]);

  // Initialize OpenSeadragon viewer
  useEffect(() => {
    const tileSourceConfig = getTileSourceConfig();
    
    // Only initialize viewer if we have a valid tile source (for 2D viewers)
    if (!tileSourceConfig) {
      return;
    }
    
    // Don't initialize if 3D view is active
    if (show3D) {
      return;
    }
    
    // Wait for the DOM element to be available
    const element = document.getElementById("openseadragon-viewer");
    if (!element) {
      console.warn("OpenSeadragon container not found in DOM yet");
      return;
    }
    
    const viewer = OpenSeadragon({
      id: "openseadragon-viewer",
      prefixUrl: "https://openseadragon.github.io/openseadragon/images/",
      tileSources: tileSourceConfig,
      showNavigator: true,
      navigatorPosition: "BOTTOM_RIGHT",
      navigatorSizeRatio: 0.15,
      constrainDuringPan: true,
      visibilityRatio: 0.5,
    });

    viewerRef.current = viewer;
    viewer.addHandler("canvas-click", handleCanvasClick);
    viewer.addHandler("viewport-change", handleViewportChange);

    return () => {
      if (viewer) {
        viewer.destroy();
        viewerRef.current = null;
      }
    };
  }, [id, show3D, handleCanvasClick, handleViewportChange]);

  // Drag move handler
  const handleDragMove = useCallback((event) => {
    if (!draggedItem || !viewerRef.current) return;
    
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
    } else if (draggedItem.type === 'overlay') {
      updateOverlayPosition(draggedItem.id, clampedX, clampedY);
    }
  }, [draggedItem, updateAnnotationPosition, updateOverlayPosition]);

  // Resize move handler
  const handleResizeMove = useCallback((event) => {
    if (!draggedItem || !viewerRef.current) return;
    // TODO: Implement resize logic
    console.log('Resize move:', event.clientX, event.clientY);
  }, [draggedItem]);

  // Apply space theme on mount
  useEffect(() => {
    applySpaceTheme();
    
    return () => {
      stopShootingStars();
      removeBackgroundStars();
    };
  }, []); // Run only once on mount

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
      stopShootingStars();
      removeBackgroundStars();
    };
  }, [isDragging, isResizing, draggedItem, handleDragMove, handleResizeMove]);

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

  // Convert viewport coordinates to pixel coordinates for overlays
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

  // Teleport to annotation
  const handleTeleportToAnnotation = useCallback((annotation) => {
    const viewer = viewerRef.current;
    if (!viewer?.viewport) return;
    
    try {
      const point = new OpenSeadragon.Point(annotation.x, annotation.y);
      viewer.viewport.panTo(point, true); // true for immediate pan
      viewer.viewport.zoomTo(viewer.viewport.getMaxZoom() * 0.5, point, true);
    } catch (error) {
      console.error('Error teleporting to annotation:', error);
    }
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

  // Handle room-full event
  useEffect(() => {
    const handleRoomFull = (event) => {
      const { fullRoomId, suggestedRoomId, currentCapacity, maxCapacity } = event.detail;
      
      // Show alert to user
      const shouldJoinNext = window.confirm(
        `Room ${fullRoomId} is full (${currentCapacity}/${maxCapacity} users).\n\n` +
        `Would you like to join Room ${suggestedRoomId} instead?`
      );
      
      if (shouldJoinNext) {
        setRoomId(suggestedRoomId);
        // Automatically try joining the suggested room
        setTimeout(() => {
          const socketInstance = initSocket();
          if (socketInstance?.connected) {
            joinRoom(suggestedRoomId, userName.trim(), socketInstance);
            setIsJoined(true);
          }
        }, 100);
      }
    };

    window.addEventListener('room-full', handleRoomFull);
    return () => window.removeEventListener('room-full', handleRoomFull);
  }, [userName, initSocket, joinRoom]);

  const handleLeaveRoom = useCallback(() => {
    setIsJoined(false);
    setUserName("");
  }, []);

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
          <div style={{ 
            marginTop: "8px", 
            fontSize: "12px", 
            color: "#888",
            fontStyle: "italic" 
          }}>
            💡 Max 3 users per room. If full, you'll be redirected to the next available room.
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
          <div style={{ 
            marginTop: "8px", 
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <div>
              <strong>Room Capacity:</strong> {activeUsers.length}/3 users
              <span style={{
                marginLeft: "8px",
                padding: "2px 8px",
                borderRadius: "12px",
                fontSize: "12px",
                backgroundColor: activeUsers.length >= 8 ? "#ff9800" : activeUsers.length >= 10 ? "#f44336" : "#4CAF50",
                color: "white"
              }}>
                {activeUsers.length >= 3 ? "FULL" : activeUsers.length >= 2 ? "Almost Full" : "Available"}
              </span>
            </div>
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

  // If viewer not found, show error
  if (!viewerData) {
    return (
      <div className="App" style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(to right, #09162a, #0d284d, #113b72, #194f99)',
        position: 'relative'
      }}>
        <header className="header">
          <button className="launch-button" onClick={() => navigate("/")}>Home</button>
          <div className="search-container">
            <input
              type="text"
              className="search-bar"
              placeholder="Search..."
            />
          </div>
        </header>

        <div style={{
          position: 'relative',
          zIndex: 1000,
          paddingTop: '20px',
          background: 'transparent'
        }}>
          <h1 className="sectionHeader" style={{
            position: 'relative',
            zIndex: 1001,
            margin: '20px auto',
            display: 'block',
            textAlign: 'center',
            color: '#b8e4ff',
            fontSize: '36px',
            fontWeight: '700'
          }}>
            Space Viewer
          </h1>
        </div>

        <div style={{ 
          textAlign: 'center', 
          padding: '50px',
          color: 'white'
        }}>
          <h2>Viewer not found</h2>
          <p>The requested viewer (ID: {id}) does not exist.</p>
          <button 
            onClick={() => navigate('/')} 
            className="viewerButton"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="App" style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(to right, #09162a, #0d284d, #113b72, #194f99)',
      position: 'relative'
    }}>
      <header className="header">
        <button className="launch-button" onClick={() => navigate("/")}>Home</button>
        <div className="search-container">
          <input
            type="text"
            className="search-bar"
            placeholder="Search..."
          />
        </div>
      </header>

      <div style={{
        position: 'relative',
        zIndex: 1000,
        paddingTop: '20px',
        background: 'transparent'
      }}>
        <h1 className="sectionHeader" style={{
          position: 'relative',
          zIndex: 1001,
          margin: '20px auto',
          display: 'block',
          textAlign: 'center',
          color: '#b8e4ff',
          fontSize: '36px',
          fontWeight: '700'
        }}>
          {viewerData.title}
        </h1>
        {viewerData.description && (
          <p style={{ 
            textAlign: 'center', 
            color: '#bbb', 
            marginTop: '-10px',
            position: 'relative',
            zIndex: 1001,
            fontSize: '16px'
          }}>
            {viewerData.description}
          </p>
        )}
      </div>
      
      {renderCollaborationPanel()}

      {viewerData.has3D && (
        <button onClick={() => setShow3D(!show3D)} className="viewerButton">
          {show3D ? "Show 2D View" : "Show 3D View"}
        </button>
      )}

      {!show3D && viewerData.tileSource ? (
        <div style={{ position: "relative", display: "flex", gap: "20px", padding: "0 20px" }}>
          {/* Main viewer container */}
          <div style={{ flex: 1, position: "relative" }}>
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
            
            {/* Annotation and overlay container - positioned above OpenSeadragon but below UI controls */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 10
            }}>
              {isJoined && annotations.map(annotation => (
                <AnnotationMarker
                  key={`${annotation.id}-${viewportVersion}`}
                  annotation={annotation}
                  currentUserId={currentUser.id}
                  onSelect={setSelectedAnnotation}
                  onRemove={removeAnnotation}
                  onStartDrag={startDragAnnotation}
                  isDragging={isDragging && draggedItem?.id === annotation.id}
                  style={getOverlayStyle(annotation)}
                />
              ))}

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

          {/* Annotation Sidebar */}
          {isJoined && (
            <div 
              className="annotation-list-sidebar"
              style={{
                width: showAnnotationSidebar ? '300px' : '60px',
                background: 'rgba(0, 0, 0, 0.85)',
                border: '1px solid #4CAF50',
                borderRadius: '8px',
                padding: '15px',
                maxHeight: '600px',
                overflowY: showAnnotationSidebar ? 'auto' : 'hidden',
                color: 'white',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ 
                margin: '0 0 15px 0',
                fontSize: '18px',
                color: '#4CAF50',
                borderBottom: showAnnotationSidebar ? '2px solid #4CAF50' : 'none',
                paddingBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                {showAnnotationSidebar ? (
                  <>
                    <span>Annotations</span>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px' }}>
                        ({annotations.filter(a => !a.z && a.z !== 0).length})
                      </span>
                      <button
                        onClick={() => setShowAnnotationSidebar(false)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid #4CAF50',
                          borderRadius: '4px',
                          color: '#4CAF50',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          fontSize: '16px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(76, 175, 80, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        }}
                        title="Hide annotations panel"
                      >
                        ▶
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setShowAnnotationSidebar(true)}
                    style={{
                      background: 'rgba(76, 175, 80, 0.9)',
                      border: '2px solid #4CAF50',
                      borderRadius: '8px',
                      color: 'white',
                      cursor: 'pointer',
                      padding: '8px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(76, 175, 80, 1)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(76, 175, 80, 0.9)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                    title="Show annotations panel"
                  >
                    <span>◀</span>
                    <span style={{
                      background: 'rgba(255,255,255,0.3)',
                      borderRadius: '12px',
                      padding: '4px 8px',
                      fontSize: '12px'
                    }}>
                      {annotations.filter(a => !a.z && a.z !== 0).length}
                    </span>
                  </button>
                )}
              </div>
              
              {showAnnotationSidebar && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {annotations
                  .filter(a => !a.z && a.z !== 0) // Only 2D annotations
                  .map((annotation) => {
                    const user = activeUsers.find(u => u.id === (annotation.user_id || annotation.userId));
                    const isOwned = (annotation.user_id || annotation.userId) === currentUser.id;
                    
                    return (
                      <div
                        key={annotation.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: isOwned ? '2px solid #4CAF50' : '1px solid #666',
                          borderRadius: '6px',
                          padding: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(76, 175, 80, 0.2)';
                          e.currentTarget.style.transform = 'translateX(5px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          e.currentTarget.style.transform = 'translateX(0)';
                        }}
                      >
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 'bold',
                          marginBottom: '5px',
                          color: '#fff'
                        }}>
                          {annotation.text}
                        </div>
                        
                        <div style={{
                          fontSize: '11px',
                          color: '#aaa',
                          marginBottom: '8px'
                        }}>
                          By: {user?.name || 'Unknown'}
                        </div>
                        
                        <button
                          onClick={() => handleTeleportToAnnotation(annotation)}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            background: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'background 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#1976D2';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#2196F3';
                          }}
                        >
                          🎯 Teleport Here
                        </button>
                        
                        {isOwned && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAnnotation(annotation.id);
                            }}
                            style={{
                              position: 'absolute',
                              top: '5px',
                              right: '5px',
                              background: 'rgba(244, 67, 54, 0.8)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0
                            }}
                            title="Delete annotation"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                
                  {annotations.filter(a => !a.z && a.z !== 0).length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      color: '#999',
                      padding: '20px',
                      fontSize: '14px'
                    }}>
                      No annotations yet. Click on the image to add one!
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : show3D && viewerData.has3D && viewerData.moon3D ? (
        <div>
          <h2>3D Collaborative View</h2>
          {isJoined ? (
            <CollaborativeThreeScene 
              heightScale={viewerData.moon3D.heightScale}
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
      ) : show3D && viewerData.has3D ? (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          margin: '20px',
          borderRadius: '12px',
          border: '2px dashed #666'
        }}>
          <h3>3D view configuration incomplete</h3>
          <p style={{ color: '#666' }}>
            This viewer supports 3D but the configuration data is missing
          </p>
        </div>
      ) : null}
    </div>
  );
};

export default Viewer;
