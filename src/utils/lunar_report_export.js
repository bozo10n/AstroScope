import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generate scientific HTML template for the report
 */
const generateScientificHTML = (annotations, currentUser, activeUsers) => {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  });
  const formattedTime = currentDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  // Calculate statistics
  const avgX = annotations.length > 0 
    ? (annotations.reduce((sum, a) => sum + (a.x || 0), 0) / annotations.length).toFixed(3)
    : 0;
  const avgY = annotations.length > 0 
    ? (annotations.reduce((sum, a) => sum + (a.y || 0), 0) / annotations.length).toFixed(3)
    : 0;
  const avgZ = annotations.length > 0 
    ? (annotations.reduce((sum, a) => sum + (a.z || 0), 0) / annotations.length).toFixed(3)
    : 0;
  
  const sortedAnnotations = [...annotations].sort((a, b) => {
    if (a.timestamp && b.timestamp) return a.timestamp - b.timestamp;
    return (a.id || '').localeCompare(b.id || '');
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          margin: 2cm;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #000;
          background: #fff;
          padding: 40px;
          max-width: 210mm;
          margin: 0 auto;
        }
        
        .header {
          text-align: center;
          border-bottom: 3px double #000;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .header h1 {
          font-size: 24pt;
          font-weight: bold;
          margin-bottom: 10px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        
        .header .subtitle {
          font-size: 14pt;
          color: #333;
          font-style: italic;
          margin-bottom: 15px;
        }
        
        .header .metadata {
          font-size: 10pt;
          color: #666;
          margin-top: 10px;
        }
        
        .header .metadata strong {
          color: #000;
        }
        
        .section {
          margin-bottom: 25px;
          page-break-inside: avoid;
        }
        
        .section-title {
          font-size: 14pt;
          font-weight: bold;
          text-transform: uppercase;
          border-bottom: 2px solid #000;
          padding-bottom: 5px;
          margin-bottom: 15px;
          letter-spacing: 0.5px;
        }
        
        .abstract {
          background: #f8f8f8;
          border-left: 4px solid #000;
          padding: 15px 20px;
          margin: 20px 0;
          font-size: 10pt;
          text-align: justify;
        }
        
        .abstract strong {
          font-weight: bold;
          text-transform: uppercase;
          font-size: 9pt;
          letter-spacing: 1px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin: 15px 0;
        }
        
        .info-item {
          padding: 8px 12px;
          background: #f5f5f5;
          border-left: 3px solid #666;
        }
        
        .info-item label {
          font-weight: bold;
          font-size: 9pt;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #444;
          display: block;
          margin-bottom: 3px;
        }
        
        .info-item value {
          font-size: 11pt;
          color: #000;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 9pt;
        }
        
        table caption {
          font-weight: bold;
          text-align: left;
          margin-bottom: 10px;
          font-size: 10pt;
        }
        
        th {
          background: #000;
          color: #fff;
          padding: 10px 8px;
          text-align: left;
          font-weight: bold;
          text-transform: uppercase;
          font-size: 8pt;
          letter-spacing: 0.5px;
        }
        
        td {
          padding: 8px;
          border-bottom: 1px solid #ddd;
        }
        
        tr:hover {
          background: #f9f9f9;
        }
        
        .annotation-entry {
          margin-bottom: 20px;
          padding: 15px;
          border: 1px solid #ddd;
          background: #fafafa;
          page-break-inside: avoid;
        }
        
        .annotation-entry h3 {
          font-size: 12pt;
          margin-bottom: 10px;
          color: #000;
        }
        
        .annotation-entry .coordinates {
          font-family: 'Courier New', monospace;
          background: #fff;
          padding: 10px;
          border-left: 3px solid #000;
          margin: 10px 0;
          font-size: 9pt;
        }
        
        .annotation-entry .meta {
          font-size: 9pt;
          color: #666;
          margin-top: 8px;
        }
        
        .statistics {
          background: #f0f0f0;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        
        .statistics h4 {
          font-size: 11pt;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .stat-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px solid #ddd;
        }
        
        .stat-row:last-child {
          border-bottom: none;
        }
        
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 2px solid #000;
          font-size: 9pt;
          color: #666;
          text-align: center;
        }
        
        .reference-number {
          font-weight: bold;
          color: #000;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Lunar Terrain Exploration Report</h1>
        <div class="subtitle">Observational Survey and Coordinate Documentation</div>
        <div class="metadata">
          <div><strong>Report ID:</strong> LTE-${currentDate.getTime().toString().slice(-8)}</div>
          <div><strong>Date:</strong> ${formattedDate}</div>
          <div><strong>Time:</strong> ${formattedTime} UTC</div>
          <div><strong>Principal Investigator:</strong> ${currentUser?.name || 'Unknown Researcher'}</div>
        </div>
      </div>
      
      <div class="abstract">
        <strong>Abstract:</strong> This report documents ${annotations.length} georeferenced observation${annotations.length !== 1 ? 's' : ''} 
        conducted during a systematic survey of the lunar surface terrain. Data collection was performed using 
        the Space Viewer platform with real-time coordinate tracking and collaborative annotation capabilities. 
        The study involved ${activeUsers?.length || 0} active team member${activeUsers?.length !== 1 ? 's' : ''} and encompasses 
        spatial analysis of identified features across the lunar coordinate system.
      </div>
      
      <div class="section">
        <h2 class="section-title">1. Mission Overview</h2>
        <div class="info-grid">
          <div class="info-item">
            <label>Mission Coordinator</label>
            <value>${currentUser?.name || 'Unknown'}</value>
          </div>
          <div class="info-item">
            <label>Total Observations</label>
            <value>${annotations.length}</value>
          </div>
          <div class="info-item">
            <label>Active Team Members</label>
            <value>${activeUsers?.length || 0}</value>
          </div>
          <div class="info-item">
            <label>Survey Region</label>
            <value>Lunar Surface</value>
          </div>
        </div>
      </div>
      
      ${annotations.length > 0 ? `
      <div class="section">
        <h2 class="section-title">2. Statistical Summary</h2>
        <div class="statistics">
          <h4>Coordinate Centroid Analysis</h4>
          <div class="stat-row">
            <span>Mean X-Coordinate:</span>
            <span class="reference-number">${avgX}</span>
          </div>
          <div class="stat-row">
            <span>Mean Y-Coordinate:</span>
            <span class="reference-number">${avgY}</span>
          </div>
          <div class="stat-row">
            <span>Mean Z-Coordinate:</span>
            <span class="reference-number">${avgZ}</span>
          </div>
        </div>
      </div>
      
      <div class="section">
        <h2 class="section-title">3. Observational Data</h2>
        <table>
          <caption>Table 1: Complete Catalog of Observed Locations</caption>
          <thead>
            <tr>
              <th>ID</th>
              <th>Location Designation</th>
              <th>X</th>
              <th>Y</th>
              <th>Z</th>
              <th>Observer</th>
            </tr>
          </thead>
          <tbody>
            ${sortedAnnotations.map((annotation, index) => `
              <tr>
                <td><strong>${String(index + 1).padStart(3, '0')}</strong></td>
                <td>${annotation.text}</td>
                <td>${(annotation.x || 0).toFixed(3)}</td>
                <td>${(annotation.y || 0).toFixed(3)}</td>
                <td>${(annotation.z || 0).toFixed(3)}</td>
                <td>${annotation.userName || 'Unknown'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="section">
        <h2 class="section-title">4. Detailed Observation Records</h2>
        ${sortedAnnotations.map((annotation, index) => `
          <div class="annotation-entry">
            <h3>Observation ${String(index + 1).padStart(3, '0')}: ${annotation.text}</h3>
            <div class="coordinates">
              <strong>Spatial Coordinates:</strong><br>
              X-axis: ${(annotation.x || 0).toFixed(6)}<br>
              Y-axis: ${(annotation.y || 0).toFixed(6)}<br>
              Z-axis: ${(annotation.z || 0).toFixed(6)}
            </div>
            <div class="meta">
              <strong>Observer:</strong> ${annotation.userName || 'Unknown Researcher'}<br>
              ${annotation.timestamp ? `<strong>Timestamp:</strong> ${new Date(annotation.timestamp).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}` : ''}
            </div>
          </div>
        `).join('')}
      </div>
      ` : `
      <div class="section">
        <h2 class="section-title">2. Observations</h2>
        <p style="font-style: italic; color: #666; text-align: center; padding: 40px 0;">
          No observational data was recorded during this survey mission.
        </p>
      </div>
      `}
      
      <div class="footer">
        <div><strong>Space Viewer - Lunar Terrain Exploration System</strong></div>
        <div>Report generated automatically from observational database</div>
        <div>Reference: LTE-${currentDate.getTime().toString().slice(-8)}</div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Export annotations as a scientific PDF report
 */
export const exportAnnotationsToPDF = async (annotations, currentUser, activeUsers) => {
  // Create temporary container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '210mm';
  container.innerHTML = generateScientificHTML(annotations, currentUser, activeUsers);
  document.body.appendChild(container);
  
  try {
    // Convert HTML to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    // Create PDF
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    let position = 0;
    const pageHeight = 297; // A4 height in mm
    
    // Add image to PDF, creating new pages as needed
    while (position < imgHeight) {
      if (position > 0) {
        pdf.addPage();
      }
      
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.95),
        'JPEG',
        0,
        -position,
        imgWidth,
        imgHeight
      );
      
      position += pageHeight;
    }
    
    // Generate filename
    const filename = `lunar-exploration-report-${new Date().getTime()}.pdf`;
    pdf.save(filename);
    
    return filename;
  } finally {
    // Clean up
    document.body.removeChild(container);
  }
};

/**
 * Export a single annotation as a detailed scientific PDF report
 */
export const exportSingleAnnotationPDF = async (annotation, currentUser) => {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric'
  });
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 12pt;
          line-height: 1.6;
          color: #000;
          background: #fff;
          padding: 40px;
          max-width: 210mm;
          margin: 0 auto;
        }
        
        .header {
          text-align: center;
          border-bottom: 3px double #000;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .header h1 {
          font-size: 22pt;
          font-weight: bold;
          margin-bottom: 10px;
          text-transform: uppercase;
        }
        
        .header .subtitle {
          font-size: 14pt;
          color: #333;
          font-style: italic;
        }
        
        .content {
          margin: 30px 0;
        }
        
        .field {
          margin: 20px 0;
          padding: 15px;
          background: #f8f8f8;
          border-left: 4px solid #000;
        }
        
        .field label {
          font-weight: bold;
          text-transform: uppercase;
          font-size: 10pt;
          letter-spacing: 0.5px;
          display: block;
          margin-bottom: 8px;
          color: #444;
        }
        
        .field value {
          font-size: 12pt;
          font-family: 'Courier New', monospace;
          display: block;
        }
        
        .coordinates {
          background: #fff;
          padding: 15px;
          border: 2px solid #000;
          margin: 20px 0;
          font-family: 'Courier New', monospace;
        }
        
        .footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 2px solid #000;
          font-size: 10pt;
          color: #666;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Location Observation Report</h1>
        <div class="subtitle">Individual Site Documentation</div>
      </div>
      
      <div class="content">
        <div class="field">
          <label>Location Designation</label>
          <value>${annotation.text}</value>
        </div>
        
        <div class="coordinates">
          <strong>Georeferenced Coordinates:</strong><br><br>
          X-axis: ${(annotation.x || 0).toFixed(8)}<br>
          Y-axis: ${(annotation.y || 0).toFixed(8)}<br>
          Z-axis: ${(annotation.z || 0).toFixed(8)}
        </div>
        
        ${annotation.userName ? `
        <div class="field">
          <label>Observer</label>
          <value>${annotation.userName}</value>
        </div>
        ` : ''}
        
        ${annotation.timestamp ? `
        <div class="field">
          <label>Observation Timestamp</label>
          <value>${new Date(annotation.timestamp).toLocaleString()}</value>
        </div>
        ` : ''}
        
        <div class="field">
          <label>Report Generated</label>
          <value>${formattedDate}</value>
        </div>
      </div>
      
      <div class="footer">
        <div><strong>Space Viewer - Lunar Terrain Exploration System</strong></div>
        <div>Single Location Report</div>
      </div>
    </body>
    </html>
  `;
  
  // Create temporary container
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.innerHTML = html;
  document.body.appendChild(container);
  
  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });
    
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    pdf.addImage(
      canvas.toDataURL('image/jpeg', 0.95),
      'JPEG',
      0,
      0,
      imgWidth,
      imgHeight
    );
    
    const filename = `location-${annotation.text.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
    pdf.save(filename);
    
    return filename;
  } finally {
    document.body.removeChild(container);
  }
};
