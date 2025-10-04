# 3D Collaboration Features

## Overview
The Space Viewer now supports full collaboration in 3D mode! You can see other users in real-time, place and view shared annotations in 3D space, and explore the lunar terrain together in first person.

## New Components

### 1. **AnnotationMarker3D** (`src/components/AnnotationMarker3D.js`)
- Displays annotations as floating 3D markers with text labels
- Shows sphere marker with connecting line to ground
- HTML overlay for text content
- Color-coded by ownership (green for your annotations, blue for others)
- Click to view, owners can delete their annotations

### 2. **UserAvatar3D** (`src/components/UserAvatar3D.js`)
- Represents other users in the 3D space
- Shows user position, name label, and viewing direction
- Animated avatar with:
  - Cylindrical body
  - Spherical head
  - Directional cone showing where user is looking
  - Ground shadow indicator
- Unique color per user (consistent)

### 3. **CollaborativeThreeScene** (`src/CollaborativeThreeScene.js`)
- Main collaborative 3D scene component
- Integrates:
  - First-person controls with WASD movement
  - Real-time position broadcasting
  - Annotation placement via raycasting
  - User avatar rendering
  - Moon terrain with height map

## Features

### First Person Controls
- **WASD** - Move forward/backward/left/right
- **Mouse** - Look around (pointer lock required)
- **Space** - Move up
- **Shift** - Move down
- **ESC** - Exit pointer lock

### Annotation System
- **Click on terrain** - Place an annotation at that exact 3D position
- Annotations are visible to all users in the room
- Each annotation shows:
  - User's name
  - Annotation text
  - 3D position marker
- Owners can delete their own annotations

### Real-Time Collaboration
- See other users as 3D avatars
- Track their position and viewing direction in real-time
- Position updates sent 10 times per second
- Smooth avatar representation with direction indicator

### Data Synchronization
- All annotations stored in SQLite database with 3D coordinates (x, y, z)
- Position updates broadcast to all room members
- Support for both 2D (x, y) and 3D (x, y, z) annotations
- Backward compatible with existing 2D annotations

## Technical Details

### Collaboration Store Extensions
The `useCollaborationStore` hook now includes:
- `updatePosition3D(x, y, z, pitch, yaw)` - Broadcast 3D position and camera rotation
- `addAnnotation(text, x, y, z)` - Create annotations with optional z coordinate
- Support for 3D position tracking in `userPositions` map

### Server Updates
The backend server (`backend/server.js`) now supports:
- `position-update-3d` event - Receive and broadcast 3D positions
- Updated annotation schema with optional `z` coordinate
- Backward compatibility with 2D annotations

### Raycasting
- Uses Three.js raycasting to detect click position on terrain
- Converts screen space clicks to 3D world coordinates
- Places annotations exactly where user clicks

## Usage

1. **Join a collaboration room** (same as 2D mode)
   - Enter your name
   - Enter a room ID
   - Click "Join Room"

2. **Switch to 3D View**
   - Click "Show 3D View" button
   - The collaborative 3D scene will load

3. **Start exploring**
   - Click on the screen to enable pointer lock
   - Use WASD to move around
   - Look around with your mouse

4. **Place annotations**
   - Click on any terrain surface
   - Enter your annotation text
   - Press Enter or click Save

5. **See other users**
   - Other users appear as colored avatars
   - Their name and viewing direction are visible
   - Watch them move in real-time!

## Future Enhancements
- Voice chat integration
- Object manipulation in 3D
- Drawing tools in 3D space
- Minimap showing user positions
- VR support

## Notes
- The 3D view requires WebGL support
- Performance scales with number of annotations and users
- Position updates are throttled to 10/second for bandwidth efficiency
- Both 2D and 3D annotations are stored in the same database
