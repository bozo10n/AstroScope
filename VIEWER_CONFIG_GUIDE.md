# Viewer Configuration System Guide

## Overview
The Space Viewer application now uses a JSON-based configuration system to manage different space viewers dynamically. This makes it easy to add, remove, or modify viewers without changing the core application code.

## Configuration File Location
`src/viewerConfig.json`

## Configuration Structure

### Viewer Object Properties

```json
{
  "id": "unique_identifier",
  "title": "Display Name",
  "description": "Brief description of the viewer",
  "type": "2D" | "2D-3D",
  "category": "2D" | "2D and 3D",
  "enabled": true | false,
  "has3D": true | false,
  "tileSource": { /* for 2D viewers */ },
  "moon3D": { /* for 3D moon terrain */ }
}
```

### Property Descriptions

- **id** (string): Unique identifier used in the URL route (`/viewer/:id`)
- **title** (string): Display name shown on the home page and viewer page
- **description** (string): Brief description shown on the tile
- **type** (string): Either "2D" for 2D-only or "2D-3D" for combined viewers
- **category** (string): Groups viewers on the home page ("2D" or "2D and 3D")
- **enabled** (boolean): 
  - `true`: Viewer is active and can be launched
  - `false`: Shows as "Coming soon..."
- **has3D** (boolean):
  - `true`: Shows 3D toggle button and allows 3D view
  - `false`: Only shows 2D view (no toggle button)
- **tileSource** (object | null): Configuration for 2D deep zoom images
- **moon3D** (object | null): Configuration for 3D terrain rendering

### Tile Source Configuration (for 2D viewers)

```json
"tileSource": {
  "type": "dzi",
  "width": 10121,
  "height": 7085,
  "tileSize": 254,
  "tileOverlap": 1,
  "minLevel": 0,
  "maxLevel": 6,
  "getTileUrl": "/space1/space1_files/{level}/{x}_{y}.jpg",
  "dziPath": "/space1/space1.dzi"
}
```

**URL Template Variables:**
- `{level}`: Zoom level
- `{x}`: X coordinate
- `{y}`: Y coordinate

### 3D Configuration (for moon/terrain viewers)

```json
"moon3D": {
  "colorTexture": "/moon_data/moon_color.png",
  "heightTexture": "/moon_data/moon_height.png",
  "heightScale": 0.15
}
```

## How to Add a New Viewer

### Example 1: Adding a 2D-only Viewer

```json
{
  "id": "9",
  "title": "Hubble Deep Field",
  "description": "Ultra-deep space observation",
  "type": "2D",
  "category": "2D",
  "enabled": true,
  "has3D": false,
  "tileSource": {
    "type": "dzi",
    "width": 15000,
    "height": 12000,
    "tileSize": 256,
    "tileOverlap": 1,
    "minLevel": 0,
    "maxLevel": 7,
    "getTileUrl": "/hubble/hubble_files/{level}/{x}_{y}.jpg",
    "dziPath": "/hubble/hubble.dzi"
  }
}
```

### Example 2: Adding a 3D Viewer

```json
{
  "id": "10",
  "title": "Mars Terrain",
  "description": "Interactive 3D Mars surface",
  "type": "2D-3D",
  "category": "2D and 3D",
  "enabled": true,
  "has3D": true,
  "tileSource": null,
  "mars3D": {
    "colorTexture": "/mars_data/mars_color.png",
    "heightTexture": "/mars_data/mars_height.png",
    "heightScale": 0.2
  }
}
```

## Home Page Features

The home page now includes:

1. **Dynamic Tile Generation**: Automatically creates tiles from the JSON configuration
2. **Category Grouping**: Viewers are organized by their `category` property
3. **Visual Badges**: Shows "2D" or "2D + 3D" badges on each tile
4. **Statistics Dashboard**: 
   - Active Viewers count
   - 3D Experiences count
   - Coming Soon count
5. **Enhanced Styling**: 
   - Hover effects with elevation
   - Type-specific color coding
   - Disabled state for coming soon items

## Viewer Page Features

The viewer page automatically:

1. Loads the correct configuration based on the URL `id` parameter
2. Shows/hides the 3D toggle button based on `has3D` flag
3. Displays the viewer title and description
4. Loads the appropriate tile source for 2D views
5. Loads the appropriate 3D configuration for 3D views
6. Shows error messages for invalid viewer IDs

## File Structure

```
src/
├── viewerConfig.json          # Main configuration file
├── Home.js                    # Dynamic home page
├── Viewer.js                  # Dynamic viewer component
└── App.js                     # Routing (unchanged)

public/
├── space1/                    # Galaxy viewer tiles
│   └── space1_files/
├── moon_data/                 # Moon textures
│   ├── moon_color.png
│   └── moon_height.png
└── [your-viewer-data]/        # Add new viewer assets here
```

## Adding Image Assets

1. Create a new folder in `public/` for your viewer
2. For 2D viewers:
   - Generate Deep Zoom Image (DZI) tiles
   - Place tiles in a structured folder (e.g., `/viewer_files/`)
3. For 3D viewers:
   - Add color texture (PNG/JPG)
   - Add height map texture (grayscale PNG/JPG)
4. Update `viewerConfig.json` with the correct paths

## Benefits of This System

✅ **Easy to Maintain**: Add new viewers by editing JSON, no code changes needed
✅ **Scalable**: Can add unlimited viewers without modifying components
✅ **Flexible**: Supports both 2D and 3D viewer types
✅ **Type-Safe**: Configuration structure is consistent and documented
✅ **User-Friendly**: Coming soon items are clearly marked
✅ **Dynamic**: Home page automatically updates with new content

## Future Enhancements

Potential additions to the configuration system:
- Thumbnail images for each viewer
- Custom color schemes per viewer
- Metadata (author, date, source)
- Multiple 3D terrain types
- Support for video/animated content
- Collaborative features toggle per viewer
