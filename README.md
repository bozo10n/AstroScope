# Astro Scope

<a href="https://unlrealities.ca/">View our Live Website</a>

The Astro Scope is a web-based platform for the collaborative exploration of high-resolution geological data, featuring both a 2D deep-zoom image viewer and an immersive 3D/VR moon terrain visualization. It is designed for real-time teamwork, allowing multiple users to explore, annotate, and share findings simultaneously.

## Table of Contents
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Setup and Installation](#setup-and-installation)
- [Running the Application](#running-the-application)
- [Utilities](#utilities)
  - [TIFF to Deep Zoom Converter](#tiff-to-deep-zoom-converter)
- [Deployment](#deployment)
- [Features and Controls](#features-and-controls)
  - [3D/VR Collaborative Scene](#3dvr-collaborative-scene)
  - [2D Viewer](#2d-viewer)
  - [PDF Export](#pdf-export)

## Key Features

- **Real-time Collaboration:** See user cursors/avatars move in real-time in both 2D and 3D views.
- **2D Deep Zoom Viewer:** Utilizes OpenSeadragon to explore massive images with deep zoom capabilities.
- **3D/VR Moon Terrain:** An immersive, first-person view of a realistic lunar surface, generated from a 16-bit height map, with VR support.
- **Shared Annotations:** Create and share text annotations and image overlays that are visible to all users in a room.
- **Multi-modal Controls:** Supports both keyboard/mouse for desktop and VR controllers.
- **PDF Report Generation:** Export individual annotations or a full session report into a professionally formatted PDF.

## Tech Stack

- **Frontend:**
  - **Framework:** React
  - **3D Rendering:** Three.js, React Three Fiber
  - **VR:** React Three XR
  - **2D Viewer:** OpenSeadragon
  - **2D Annotations:** Annotorious
  - **Real-time:** Socket.IO Client
  - **PDF Generation:** jsPDF
- **Backend:**
  - **Framework:** Node.js, Express
  - **Real-time:** Socket.IO
  - **Database:** SQLite3
- **Deployment:**
  - **Process:** Manual script via SSH
  - **Process Manager:** PM2

## Project Structure

```
space-viewer/
├── backend/              # Node.js backend server, database, and uploads
├── build/                # Production build of the React app
├── public/               # Static assets, including moon_data/ and space1/
├── src/                  # React frontend source code
│   ├── components/       # Shared React components (avatars, markers, etc.)
│   ├── hooks/            # Custom React hooks (e.g., useCollaborationStore)
│   ├── utils/            # Utility functions (e.g., pdfExport.js)
│   ├── App.js            # Main router
│   ├── CollaborativeThreeScene.js # 3D/VR moon terrain scene
│   └── Viewer.js         # 2D OpenSeadragon viewer
├── converter.py          # Utility to convert TIFFs to Deep Zoom format
├── deploy.bat            # Deployment script for Windows
└── README.md             # This file
```

## Application Versions

This repository contains two primary versions of the application, managed in separate branches:

### 1. Main Desktop Version (`production` branch)
- This is the stable version of the application.
- It features the 2D deep-zoom viewer and a 3D first-person desktop mode with mouse and keyboard controls.
- All core collaboration and annotation features are available here.

### 2. VR Version (`vr-feat` branch)
- This is an experimental version that adds WebXR support for an immersive VR experience.
- It replaces the desktop-first controls with VR-native controls (headset tracking, thumbstick movement).
- To use this version, check out the `vr-feat` branch:
  ```bash
  git checkout vr-feat
  ```

## Setup and Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or later recommended)
- [Python](https://www.python.org/) (for the `converter.py` script)
  - `Pillow` library: `pip install Pillow`

### 1. Backend Setup
```bash
# Navigate to the backend directory
cd backend

# Install dependencies
npm install
```
This will set up the Express server and initialize the `nasa_viewer.db` SQLite database file.

### 2. Frontend Setup
```bash
# Navigate to the project root directory
cd ..

# Install dependencies
npm install
```

## Running the Application

You must run both the backend and frontend servers concurrently in separate terminal windows.

### 1. Run the Backend
```bash
# In the /backend directory
npm start
```
The backend server will start, typically on `http://localhost:3000`.

### 2. Run the Frontend
```bash
# In the project root directory
npm start
```
The React development server will start, typically on `http://localhost:3000` (it may ask to use another port if the backend is on 3000).

Open your browser to the frontend URL to use the application.

## Utilities

### TIFF to Deep Zoom Converter
The `converter.py` script is a command-line tool used to convert very large TIFF images into the Deep Zoom Image (DZI) format required by the OpenSeadragon viewer.

**Usage:**
1.  Run the script from your terminal: `python converter.py`
2.  Follow the prompts to provide the input TIFF file path and an output directory name.
3.  The script will generate a `.dzi` file and a corresponding `_files` directory containing the image tiles.
4.  Place the output folder (e.g., `my_image/` and `my_image_files/`) into the `public/` directory to make it accessible to the viewer.

## Deployment

Deployment is handled by the `deploy.bat` script (for Windows). It automates the following process:
1.  Installs dependencies.
2.  Creates a production build of the React app.
3.  Commits the changes to the `production` branch of the Git repository.
4.  Pushes the changes to GitHub.
5.  Connects to the production server (`165.22.230.192`) via SSH.
6.  On the server, it pulls the latest code, installs backend dependencies, and restarts the backend service using PM2.

To deploy, simply run `deploy.bat` from the project root.

## Features and Controls

### 3D/VR Collaborative Scene
- **Movement (Desktop):**
  - **WASD:** Move forward/backward/left/right
  - **Mouse:** Look around (after clicking the screen to lock pointer)
  - **Space/Shift:** Move up/down
- **Movement (VR):**
  - **Right Thumbstick:** Move around the terrain.
  - **Head Tracking:** Look around naturally.
- **Annotations:**
  - **E Key (Desktop):** Press `E` while aiming at the terrain to place an annotation.
  - Annotations are visible to all users in real-time as 3D markers.
- **UI Interaction:**
  - **TAB Key (Desktop):** Toggles "UI Mode," which frees the mouse to interact with the HUD (Heads-Up Display). In UI mode, you can click on annotations in the list to teleport to them.
  - **ESC Key:** Exits pointer lock/camera control.

### 2D Viewer
The 2D viewer uses OpenSeadragon for a pannable, zoomable interface.
- **Collaboration:** See other users' cursors as they move around the image.
- **Annotations:** Create, view, and move annotations directly on the 2D image.

### PDF Export
- **Full Report:** In the 3D view HUD, click the " Export PDF" button to download a report of all annotations.
- **Single Annotation:** In the HUD, hover over an annotation and click its icon to export a PDF for just that location.
