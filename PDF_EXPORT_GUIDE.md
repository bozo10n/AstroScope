# PDF Export Feature

## Overview
Added comprehensive PDF export functionality for lunar terrain exploration annotations.

## Features

### 1. Full Report Export
- Click the "📄 Export PDF" button in the HUD header
- Generates a complete exploration report with:
  - Report title and timestamp
  - Explorer name and team size
  - All annotations sorted chronologically
  - Detailed coordinates for each location
  - Creator information
  - Professional formatting with page numbers

### 2. Individual Location Export
- Each annotation has a "📄" button (appears on hover)
- Exports a single location as a detailed PDF report
- Includes full coordinates and metadata

## Report Contents

### Full Report Includes:
- **Header Section**
  - Title: "Lunar Terrain Exploration Report"
  - Generation timestamp
  - Explorer name
  - Total annotations count
  - Active team members count

- **Annotations Section**
  - Numbered list of all locations
  - For each annotation:
    - Location name
    - X, Y, Z coordinates (to 2 decimal places)
    - Discovered by (user name)
    - Timestamp (if available)
    - Visual separation between entries

- **Footer**
  - Page numbers
  - "Space Viewer - Lunar Terrain Exploration" branding

### Single Location Report Includes:
- Location name as title
- Precise coordinates (4 decimal places)
- Discoverer name
- Timestamp

## Usage

### Export All Annotations:
1. Enter the 3D scene (pointer locked mode)
2. Look for the HUD on the left side
3. Click "📄 Export PDF" button in the header
4. PDF downloads automatically with filename: `lunar-exploration-report-[timestamp].pdf`

### Export Single Annotation:
1. Hover over any annotation in the list
2. Click the "📄" button that appears
3. PDF downloads automatically with filename: `location-[name]-[timestamp].pdf`

## Technical Implementation

- **Library**: jsPDF
- **Location**: `src/utils/pdfExport.js`
- **Functions**:
  - `exportAnnotationsToPDF()` - Full report
  - `exportSingleAnnotationPDF()` - Single location

## Styling
- Professional layout with margins and spacing
- Gray boxes around annotation details
- Page breaks handled automatically
- Responsive to content length
- Consistent typography using Helvetica
