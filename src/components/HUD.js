import React, { useState, useEffect } from 'react';
import './HUD.css';
import { exportAnnotationsToPDF, exportSingleAnnotationPDF } from '../utils/pdfExport';

/**
 * HUD (Heads-Up Display) Component
 * Shows annotations with teleport functionality
 */
function HUD({ 
  position = { x: 0, y: 0, z: 0 },
  annotations = [],
  activeUsers = [],
  onTeleport,
  onRemoveAnnotation,
  show = true,
  currentUserId,
  currentUser,
  uiMode = false,
  locked = false
}) {
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [exportStatus, setExportStatus] = useState(null);

  // Debug logging
  useEffect(() => {
    console.log('📋 HUD annotations:', {
      total: annotations.length,
      annotations: annotations.map(a => ({
        id: a.id,
        text: a.text,
        hasZ: a.z !== undefined && a.z !== null,
        coords: { x: a.x, y: a.y, z: a.z }
      }))
    });
  }, [annotations]);

  if (!show) return null;

  // Calculate distance from current position to annotation
  const calculateDistance = (annotation) => {
    if (annotation.x === undefined || annotation.x === null || 
        annotation.z === undefined || annotation.z === null) {
      return 0;
    }
    const dx = annotation.x - position.x;
    const dy = (annotation.y || 0) - position.y;
    const dz = annotation.z - position.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  };

  // Get 3D annotations only (with z coordinate) with distance, sorted by proximity
  const annotationsWithDistance = annotations
    .filter(a => a.z !== undefined && a.z !== null) // Only 3D annotations
    .filter(a => a.x !== undefined && a.x !== null) // Ensure valid coordinates
    .map(annotation => ({
      ...annotation,
      // Normalize field names (handle both camelCase and snake_case from server)
      userId: annotation.userId || annotation.user_id,
      userName: annotation.userName || annotation.user_name,
      distance: calculateDistance(annotation)
    }))
    .filter(a => a.distance !== null && a.distance !== undefined)
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));

  const handleTeleport = (annotation) => {
    if (onTeleport && annotation.x !== undefined && annotation.z !== undefined) {
      // Teleport slightly above the annotation
      onTeleport(annotation.x, (annotation.y || 0) + 5, annotation.z);
      setSelectedAnnotation(annotation.id);
      setTimeout(() => setSelectedAnnotation(null), 1000);
    }
  };

  const handleExportPDF = () => {
    try {
      const filename = exportAnnotationsToPDF(annotations, currentUser, activeUsers);
      setExportStatus(`Exported: ${filename}`);
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setExportStatus('Export failed');
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  const handleExportSingleAnnotation = (annotation, event) => {
    event.stopPropagation(); // Prevent teleport
    try {
      const filename = exportSingleAnnotationPDF(annotation, currentUser);
      setExportStatus(`Exported: ${filename}`);
      setTimeout(() => setExportStatus(null), 3000);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      setExportStatus('Export failed');
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  const handleDeleteAnnotation = (annotation, event) => {
    event.stopPropagation(); // Prevent teleport
    if (window.confirm(`Delete annotation "${annotation.text}"?`)) {
      if (onRemoveAnnotation) {
        onRemoveAnnotation(annotation.id);
      }
    }
  };

  return (
    <div className="hud-container">
      {/* Left Side - Annotation List with Teleport */}
      <div className="hud-panel hud-left">
        <div className="hud-header">
          <div className="hud-title">Locations ({annotationsWithDistance.length})</div>
          <button 
            className="hud-export-btn"
            onClick={handleExportPDF}
            disabled={annotationsWithDistance.length === 0}
            title="Export all annotations as PDF report"
          >
            Export PDF
          </button>
        </div>
        
        {exportStatus && (
          <div className="hud-export-status">
            {exportStatus}
          </div>
        )}
        
        <div className="hud-annotations-list">
          {annotationsWithDistance.length === 0 ? (
            <div className="hud-empty-message">
              No annotations yet.<br/>
              Press <span className="hud-key-inline">E</span> to create one.
            </div>
          ) : (
            annotationsWithDistance.map((annotation) => {
              const isSelected = selectedAnnotation === annotation.id;
              const isOwn = annotation.userId === currentUserId;
              
              return (
                <div 
                  key={annotation.id}
                  className={`hud-annotation-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleTeleport(annotation)}
                >
                  <div className="hud-annotation-header">
                    <div className="hud-annotation-text">
                      {annotation.text}
                    </div>
                    {isOwn && <span className="hud-badge-own">You</span>}
                  </div>
                  
                  <div className="hud-annotation-meta">
                    <span className="hud-annotation-distance">
                      {(annotation.distance || 0).toFixed(1)}m away
                    </span>
                    {annotation.userName && (
                      <span className="hud-annotation-user">
                        by {annotation.userName}
                      </span>
                    )}
                  </div>
                  
                  <div className="hud-annotation-coords">
                    ({(annotation.x || 0).toFixed(0)}, {(annotation.y || 0).toFixed(0)}, {(annotation.z || 0).toFixed(0)})
                  </div>
                  
                  {/* <div className="hud-annotation-actions">
                    <div className="hud-teleport-hint">
                      {uiMode ? 'Click to teleport' : 'Press TAB for UI mode'} →
                    </div>
                    <div className="hud-annotation-buttons">
                      <button 
                        className="hud-annotation-export-btn"
                        onClick={(e) => handleExportSingleAnnotation(annotation, e)}
                        title="Export this location as PDF"
                      >
                        📄
                      </button>
                      {isOwn && (
                        <button 
                          className="hud-annotation-delete-btn"
                          onClick={(e) => handleDeleteAnnotation(annotation, e)}
                          title="Delete this annotation"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div> */}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Top Right - User Info */}
      <div className="hud-panel hud-top-right">
        <div className="hud-section">
          <div className="hud-label">ACTIVE USERS</div>
          <div className="hud-value-medium">{activeUsers.length}</div>
        </div>
        
        <div className="hud-section">
          <div className="hud-label">YOUR POSITION</div>
          <div className="hud-coords-compact">
            <div>X: {position.x.toFixed(1)}</div>
            <div>Y: {position.y.toFixed(1)}</div>
            <div>Z: {position.z.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* Bottom - Controls Help */}
      <div className="hud-panel hud-bottom-center">
        <div className="hud-controls">
          <span className="hud-key">WASD</span> Move
          <span className="hud-separator">•</span>
          <span className="hud-key">SPACE/SHIFT</span> Up/Down
          <span className="hud-separator">•</span>
          <span className="hud-key">E</span> Annotate
          <span className="hud-separator">•</span>
          <span className="hud-key">TAB</span> Toggle UI
          <span className="hud-separator">•</span>
          {uiMode ? (
            <>
              <span className="hud-key">Click</span> Interact
            </>
          ) : (
            <>
              <span className="hud-key">Esc</span> Exit Mode
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default HUD;
