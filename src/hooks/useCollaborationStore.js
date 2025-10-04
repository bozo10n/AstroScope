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
    const socketUrl = 'http://localhost:3000'; // Connect to local server
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: false, // Disable auto-reconnection to prevent spam
      timeout: 5000, // Shorter timeout
      autoConnect: true
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      setConnectionError(null);
      setMockMode(false);
      console.log('🔌 Connected to server');
    });

    newSocket.on('connect_error', (error) => {
      console.warn('❌ Server unavailable, enabling mock mode:', error.message);
      setConnected(false);
      setConnectionError(error.message);
      
      // Enable mock mode immediately
      setMockMode(true);
      setConnected(true); // Simulate connection for UI
      console.log('🤖 Mock mode enabled for local development');
      
      // Disconnect the socket to stop retry attempts
      newSocket.disconnect();
    });

    newSocket.on('disconnect', () => {
      if (!mockMode) {
        setConnected(false);
        console.log('❌ Disconnected from server');
      }
    });

    newSocket.on('user-joined', ({ user, activeUsers }) => {
      setActiveUsers(activeUsers);
      console.log(`✅ ${user.name} joined`);
    });

    newSocket.on('user-left', ({ user, activeUsers }) => {
      setActiveUsers(activeUsers);
      userPositionsRef.current.delete(user.id);
      console.log(`❌ ${user.name} left`);
    });

    newSocket.on('position-update', (data) => {
      userPositionsRef.current.set(data.userId, {
        x: data.x,
        y: data.y,
        zoom: data.zoom
      });
    });

    newSocket.on('existing-annotations', (annotations) => {
      console.log('📝 Received existing annotations:', annotations);
      setAnnotations(annotations);
    });

    newSocket.on('existing-overlays', (overlays) => {
      console.log('🖼️ Received existing overlays:', overlays);
      setOverlays(overlays);
    });

    newSocket.on('annotation-added', (annotation) => {
      console.log('➕ New annotation added:', annotation);
      setAnnotations(prev => {
        const updated = [...prev, annotation];
        console.log('📝 Updated annotations array:', updated);
        return updated;
      });
    });

    newSocket.on('annotation-removed', ({ annotationId }) => {
      console.log('➖ Annotation removed:', annotationId);
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

    return newSocket;
  }, []);

  const joinRoom = useCallback((roomId, userName) => {
    const userId = Math.random().toString(36).substring(7);
    setCurrentUser({
      id: userId,
      name: userName
    });
    setCurrentRoom(roomId);

    if (mockMode) {
      console.log('🤖 Mock mode: Simulating room join');
      setActiveUsers([{ id: userId, name: userName, socketId: 'mock' }]);
      return;
    }

    socket?.emit('join-room', {
      roomId,
      userName,
      userId
    });
  }, [socket, mockMode]);

  const updatePosition = useCallback((x, y, zoom) => {
    if (mockMode) {
      console.log('🤖 Mock mode: Position update', { x, y, zoom });
      return;
    }
    socket?.emit('position-update', { x, y, zoom });
  }, [socket, mockMode]);

  const addAnnotation = useCallback((text, x, y, width = 0, height = 0) => {
    console.log('🎯 addAnnotation called:', { text, x, y, width, height, mockMode });
    
    if (mockMode) {
      console.log('🤖 Mock mode: Adding annotation', { text, x, y });
      const mockAnnotation = {
        id: Date.now(),
        text,
        x,
        y,
        width,
        height,
        userName: currentUser.name,
        userId: currentUser.id,
        user_name: currentUser.name,
        user_id: currentUser.id
      };
      console.log('🤖 Created mock annotation:', mockAnnotation);
      setAnnotations(prev => {
        const updated = [...prev, mockAnnotation];
        console.log('🤖 Mock annotations updated:', updated);
        return updated;
      });
      return;
    }

    console.log('📡 Emitting add-annotation to server:', {
      roomId: currentRoom,
      userId: currentUser.id,
      userName: currentUser.name,
      text,
      x,
      y,
      width,
      height
    });

    socket?.emit('add-annotation', {
      roomId: currentRoom,
      userId: currentUser.id,
      userName: currentUser.name,
      text,
      x,
      y,
      width,
      height
    });
  }, [socket, currentRoom, currentUser, mockMode]);

  const removeAnnotation = useCallback((annotationId) => {
    if (mockMode) {
      console.log('🤖 Mock mode: Removing annotation', annotationId);
      setAnnotations(prev => prev.filter(a => a.id !== annotationId));
      return;
    }

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
    socket?.emit('remove-overlay', {
      overlayId,
      roomId: currentRoom
    });
  }, [socket, currentRoom]);

  const updateAnnotationPosition = useCallback((annotationId, x, y) => {
    socket?.emit('update-annotation-position', {
      annotationId,
      roomId: currentRoom,
      x,
      y
    });
  }, [socket, currentRoom]);

  const updateOverlayPosition = useCallback((overlayId, x, y) => {
    socket?.emit('update-overlay-position', {
      overlayId,
      roomId: currentRoom,
      x,
      y
    });
  }, [socket, currentRoom]);

  const updateOverlaySize = useCallback((overlayId, width, height) => {
    socket?.emit('update-overlay-size', {
      overlayId,
      roomId: currentRoom,
      width,
      height
    });
  }, [socket, currentRoom]);

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