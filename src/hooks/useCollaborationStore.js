import { useState, useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export const useCollaborationStore = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [mockMode, setMockMode] = useState(false);
  const [currentUser, setCurrentUser] = useState({
    id: '',
    name: ''
  });
  const [currentRoom, setCurrentRoom] = useState('1'); // default room ID
  const [activeUsers, setActiveUsers] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [overlays, setOverlays] = useState([]);
  const userPositionsRef = useRef(new Map());

  const initSocket = useCallback(() => {
    // If socket already exists and is connected, reuse it
    if (socket && (socket.connected || socket.connecting)) {
      console.log(' Reusing existing socket connection');
      return socket;
    }
    
    console.log('🔌 Creating new socket connection...');
    // Use production backend URL when deployed, localhost for development
    // REACT_APP_BACKEND_URL can be set in .env for custom backend location
    const socketUrl = process.env.REACT_APP_BACKEND_URL || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://unlrealities.ca'  // Changed: removed port 3000, use proxy or same origin
        : 'http://localhost:3000');
    console.log(`Connecting to: ${socketUrl}`);
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      forceNew: false, // Reuse connection if available
      reconnection: true, // Enable reconnection
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      timeout: 5000,
      autoConnect: true
    });
    
    // Set socket immediately so it's available for emitting events
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      setConnectionError(null);
      setMockMode(false);
      console.log('🔌 Connected to server');
    });

    newSocket.on('connect_error', (error) => {
      console.warn('Server unavailable, enabling mock mode:', error.message);
      setConnected(false);
      setConnectionError(error.message);
      
      // Enable mock mode immediately
      setMockMode(true);
      setConnected(true); // Simulate connection for UI
      console.log('Mock mode enabled for local development');
      
      // Disconnect the socket to stop retry attempts
      newSocket.disconnect();
    });

    newSocket.on('disconnect', () => {
      if (!mockMode) {
        setConnected(false);
        console.log(' Disconnected from server');
      }
    });

    newSocket.on('user-joined', ({ user, activeUsers }) => {
      setActiveUsers(activeUsers);
      console.log(`${user.name} joined`);
    });

    newSocket.on('user-left', ({ user, activeUsers }) => {
      setActiveUsers(activeUsers);
      userPositionsRef.current.delete(user.id);
      console.log(` ${user.name} left`);
    });

    newSocket.on('position-update', (data) => {
      userPositionsRef.current.set(data.userId, {
        x: data.x,
        y: data.y,
        zoom: data.zoom
      });
    });

    // Handle 3D position updates
    newSocket.on('position-update-3d', (data) => {
      userPositionsRef.current.set(data.userId, {
        x: data.x,
        y: data.y,
        z: data.z,
        pitch: data.pitch,
        yaw: data.yaw
      });
    });

    newSocket.on('existing-annotations', (annotations) => {
      console.log('Received existing annotations:', annotations);
      setAnnotations(annotations);
    });

    newSocket.on('existing-overlays', (overlays) => {
      console.log(' Received existing overlays:', overlays);
      setOverlays(overlays);
    });

    newSocket.on('annotation-added', (annotation) => {
      console.log('New annotation added from server:', annotation);
      setAnnotations(prev => {
        // Check if annotation already exists by comparing key properties
        // (avoid duplicates from optimistic updates)
        const exists = prev.some(a => 
          a.id === annotation.id || 
          (Math.abs(a.x - annotation.x) < 0.001 && 
           Math.abs(a.y - annotation.y) < 0.001 && 
           a.text === annotation.text && 
           (a.userId === annotation.user_id || a.user_id === annotation.user_id))
        );
        
        if (exists) {
          console.log(' Annotation already exists locally, replacing with server version');
          // Replace the optimistic version with the server version (has correct ID)
          return prev.map(a => 
            (Math.abs(a.x - annotation.x) < 0.001 && 
             Math.abs(a.y - annotation.y) < 0.001 && 
             a.text === annotation.text && 
             (a.userId === annotation.user_id || a.user_id === annotation.user_id))
              ? annotation 
              : a
          );
        }
        
        const updated = [...prev, annotation];
        console.log('Updated annotations array:', updated);
        return updated;
      });
    });

    newSocket.on('annotation-removed', ({ annotationId }) => {
      console.log('Annotation removed:', annotationId);
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
    });

    newSocket.on('overlay-added', (overlay) => {
      setOverlays(prev => [...prev, overlay]);
    });

    newSocket.on('overlay-removed', ({ overlayId }) => {
      setOverlays(prev => prev.filter(o => o.id !== overlayId));
    });

    // Handle real-time position updates
    newSocket.on('annotation-position-updated', ({ annotationId, x, y }) => {
      setAnnotations(prev => prev.map(annotation => 
        annotation.id === annotationId 
          ? { ...annotation, x, y }
          : annotation
      ));
    });

    newSocket.on('overlay-position-updated', ({ overlayId, x, y }) => {
      setOverlays(prev => prev.map(overlay => 
        overlay.id === overlayId 
          ? { ...overlay, x, y }
          : overlay
      ));
    });

    newSocket.on('overlay-size-updated', ({ overlayId, width, height }) => {
      setOverlays(prev => prev.map(overlay => 
        overlay.id === overlayId 
          ? { ...overlay, width, height }
          : overlay
      ));
    });

    // Handle room-full event
    newSocket.on('room-full', (data) => {
      console.log(`🚫 Room ${data.fullRoomId} is full (${data.currentCapacity}/${data.maxCapacity})`);
      console.log(`✅ Suggested room: ${data.suggestedRoomId}`);
      // Emit custom event that the component can listen to
      window.dispatchEvent(new CustomEvent('room-full', { detail: data }));
    });

    return newSocket;
  }, [socket, mockMode]);

  const joinRoom = useCallback((roomId, userName, socketInstance = null) => {
    const userId = Math.random().toString(36).substring(7);
    setCurrentUser({
      id: userId,
      name: userName
    });
    setCurrentRoom(roomId);

    if (mockMode) {
      console.log('Mock mode: Simulating room join');
      setActiveUsers([{ id: userId, name: userName, socketId: 'mock' }]);
      return;
    }

    // Use provided socket instance or fall back to state socket
    const activeSocket = socketInstance || socket;
    activeSocket?.emit('join-room', {
      roomId,
      userName,
      userId
    });
  }, [socket, mockMode]);

  const updatePosition = useCallback((x, y, zoom) => {
    if (mockMode) {
      return;
    }
    socket?.emit('position-update', { x, y, zoom });
  }, [socket, mockMode]);

  // New: Update 3D position with rotation
  const updatePosition3D = useCallback((x, y, z, pitch, yaw) => {
    if (mockMode) {
      return;
    }
    socket?.emit('position-update-3d', { x, y, z, pitch, yaw });
  }, [socket, mockMode]);

  const addAnnotation = useCallback((text, x, y, z = undefined) => {
    
    // Create the annotation object (support both 2D and 3D annotations)
    const newAnnotation = {
      id: Date.now(),
      text,
      x,
      y,
      z, // Optional z coordinate for 3D annotations
      userName: currentUser.name,
      userId: currentUser.id,
      user_name: currentUser.name,
      user_id: currentUser.id
    };
    
    // Optimistically update local state immediately
    setAnnotations(prev => {
      const updated = [...prev, newAnnotation];
      return updated;
    });
    
    if (mockMode) {
      return;
    }


    socket?.emit('add-annotation', {
      roomId: currentRoom,
      userId: currentUser.id,
      userName: currentUser.name,
      text,
      x,
      y,
      z
    });
  }, [socket, currentRoom, currentUser, mockMode]);

  const removeAnnotation = useCallback((annotationId) => {
    
    // Optimistically update local state immediately
    setAnnotations(prev => {
      const filtered = prev.filter(a => a.id !== annotationId);
      return filtered;
    });
    
    if (mockMode) {
      return;
    }

    // Also emit to server for synchronization
    socket?.emit('remove-annotation', {
      annotationId,
      roomId: currentRoom
    });
  }, [socket, currentRoom, mockMode]);

  const addOverlay = useCallback((imagePath, originalName, x, y, width, height) => {
    socket?.emit('add-overlay', {
      roomId: currentRoom,
      userId: currentUser.id,
      userName: currentUser.name,
      imagePath,
      originalName,
      x,
      y,
      width,
      height
    });
  }, [socket, currentRoom, currentUser]);

  const removeOverlay = useCallback((overlayId) => {
    
    // Optimistically update local state immediately
    setOverlays(prev => {
      const filtered = prev.filter(o => o.id !== overlayId);
      return filtered;
    });
    
    if (mockMode) {
      return;
    }

    // Also emit to server for synchronization
    socket?.emit('remove-overlay', {
      overlayId,
      roomId: currentRoom
    });
  }, [socket, currentRoom, mockMode]);

  const updateAnnotationPosition = useCallback((annotationId, x, y) => {
    // Optimistically update local state immediately
    setAnnotations(prev => prev.map(annotation => 
      annotation.id === annotationId 
        ? { ...annotation, x, y }
        : annotation
    ));
    
    if (mockMode) return;

    socket?.emit('update-annotation-position', {
      annotationId,
      roomId: currentRoom,
      x,
      y
    });
  }, [socket, currentRoom, mockMode]);

  const updateOverlayPosition = useCallback((overlayId, x, y) => {
    // Optimistically update local state immediately
    setOverlays(prev => prev.map(overlay => 
      overlay.id === overlayId 
        ? { ...overlay, x, y }
        : overlay
    ));
    
    if (mockMode) return;

    socket?.emit('update-overlay-position', {
      overlayId,
      roomId: currentRoom,
      x,
      y
    });
  }, [socket, currentRoom, mockMode]);

  const updateOverlaySize = useCallback((overlayId, width, height) => {
    // Optimistically update local state immediately
    setOverlays(prev => prev.map(overlay => 
      overlay.id === overlayId 
        ? { ...overlay, width, height }
        : overlay
    ));
    
    if (mockMode) return;

    socket?.emit('update-overlay-size', {
      overlayId,
      roomId: currentRoom,
      width,
      height
    });
  }, [socket, currentRoom, mockMode]);

  const disconnect = useCallback(() => {
    socket?.disconnect();
    setConnected(false);
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      socket?.disconnect();
    };
  }, [socket]);

  return {
    // State
    socket,
    connected,
    connectionError,
    mockMode,
    currentUser,
    currentRoom,
    activeUsers,
    annotations,
    overlays,
    userPositions: userPositionsRef.current,

    // Actions
    initSocket,
    joinRoom,
    updatePosition,
    updatePosition3D,
    addAnnotation,
    removeAnnotation,
    addOverlay,
    removeOverlay,
    updateAnnotationPosition,
    updateOverlayPosition,
    updateOverlaySize,
    disconnect
  };
};