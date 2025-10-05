# 🚀 Spaceman 3D Model Setup Guide

## Quick Start

1. **Download a spaceman/astronaut GLB model** from one of these sources:
   - [Sketchfab](https://sketchfab.com/search?q=astronaut&type=models) (Free & Paid)
   - [Poly Pizza](https://poly.pizza/search/astronaut) (Free)
   - [CGTrader](https://www.cgtrader.com/3d-models/character/sci-fi-character/astronaut) (Free & Paid)
   - [TurboSquid](https://www.turbosquid.com/Search/3D-Models/astronaut) (Free & Paid)

2. **Place the file** in: `public/models/spaceman.glb`

3. **Restart your development server** if it's running

4. **Done!** Your spaceman model will now appear for all user avatars in the 3D scene

## File Requirements

- **Format**: `.glb` (GLTF Binary format)
- **Size**: Recommended < 5MB for faster loading
- **Orientation**: Model should face forward (positive Z-axis)
- **Scale**: Approximately 1-2 units tall (will be auto-scaled to 0.8x)
- **Rigging**: Not required (models are displayed as static)

## Fallback Behavior

If no model is found at `public/models/spaceman.glb`, the system automatically uses a simple geometric placeholder:
- Colored cylinder body
- Sphere head
- Direction indicator cone

This ensures the collaboration features work even without a custom model.

## Customization

### Change Model Scale
Edit `src/components/UserAvatar3D.js`, line with `<SpacemanModel>`:
```javascript
<SpacemanModel color={avatarColor} scale={0.8} /> // Change 0.8 to your preferred scale
```

### Change Model Rotation
Edit the rotation in `src/components/UserAvatar3D.js`:
```javascript
<group rotation={[0, rot.yaw, 0]}>  // [x, y, z] rotation in radians
```

### Use Different Model Name
Edit `src/components/UserAvatar3D.js`, in the `SpacemanModel` component:
```javascript
gltf = useGLTF('/models/spaceman.glb');  // Change filename here
```

## Testing Your Model

1. Place your `spaceman.glb` file in `public/models/`
2. Start the development server: `npm start`
3. Enter the 3D collaboration view
4. Check the browser console for any loading errors
5. If the model doesn't appear, check:
   - File is named exactly `spaceman.glb`
   - File is in the correct directory
   - File is a valid `.glb` format
   - Browser console for error messages

## Recommended Free Models

Here are some great free astronaut models to try:

1. **Low Poly Astronaut** by Quaternius (Poly Pizza)
   - Free, CC0 license
   - Small file size
   - Perfect for games

2. **Astronaut** on Sketchfab
   - Search for "astronaut" + filter by "Downloadable" + "Free"
   - Many high-quality options
   - Check the license before use

## Troubleshooting

### Model doesn't appear
- Check browser console (F12) for errors
- Verify file path: `public/models/spaceman.glb`
- Try refreshing the page (Ctrl+R)
- Check that the GLB file is valid (open in Blender or online viewer)

### Model appears too large/small
- Adjust the `scale` prop in `UserAvatar3D.js`
- Common values: 0.5 (smaller), 1.0 (normal), 2.0 (larger)

### Model faces wrong direction
- Adjust the rotation values in the code
- Or edit the model in Blender to face the correct direction

### Model colors are wrong
- The system applies an emissive color overlay per user
- This is intentional to distinguish different users
- To disable, remove the color prop from `<SpacemanModel>`

## Technical Details

The spaceman model is loaded using:
- **@react-three/drei's useGLTF** hook for efficient loading
- **React Suspense** for graceful loading states
- **Error handling** with automatic fallback to geometric shapes
- **Model cloning** to support multiple users with the same model
- **Per-user coloring** for easy identification

## Need Help?

- Check the browser console for detailed error messages
- Verify your GLB file works in an online GLB viewer
- Make sure you're using a `.glb` file (not `.gltf` with separate files)
