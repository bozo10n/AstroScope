import jsPDF from 'jspdf';

/**
 * Export annotations as a PDF report
 */
export const exportAnnotationsToPDF = (annotations, currentUser, activeUsers) => {
  const doc = new jsPDF();
  
  // Page settings
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (2 * margin);
  let yPosition = margin;
  
  // Helper function to check if we need a new page
  const checkNewPage = (requiredSpace = 20) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };
  
  // Helper function to add text with word wrap
  const addWrappedText = (text, x, y, maxWidth, fontSize = 10) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line, index) => {
      if (index > 0) checkNewPage();
      doc.text(line, x, y + (index * 6));
    });
    return lines.length * 6; // Return height used
  };
  
  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Lunar Terrain Exploration Report', margin, yPosition);
  yPosition += 15;
  
  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Generated: ${currentDate}`, margin, yPosition);
  yPosition += 10;
  
  // Draw separator line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 15;
  
  // Report Summary Section
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Exploration Summary', margin, yPosition);
  yPosition += 10;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Explorer: ${currentUser?.name || 'Unknown'}`, margin, yPosition);
  yPosition += 7;
  doc.text(`Total Annotations: ${annotations.length}`, margin, yPosition);
  yPosition += 7;
  doc.text(`Active Team Members: ${activeUsers?.length || 0}`, margin, yPosition);
  yPosition += 7;
  doc.text(`Terrain: Lunar Surface`, margin, yPosition);
  yPosition += 15;
  
  // Annotations Section
  checkNewPage(30);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Discovered Locations', margin, yPosition);
  yPosition += 12;
  
  if (annotations.length === 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    doc.text('No annotations recorded during this exploration.', margin, yPosition);
  } else {
    // Sort annotations by creation time or id
    const sortedAnnotations = [...annotations].sort((a, b) => {
      if (a.timestamp && b.timestamp) return a.timestamp - b.timestamp;
      return (a.id || '').localeCompare(b.id || '');
    });
    
    sortedAnnotations.forEach((annotation, index) => {
      checkNewPage(40);
      
      // Annotation number and title
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(`${index + 1}. ${annotation.text}`, margin, yPosition);
      yPosition += 8;
      
      // Draw a subtle box around annotation details
      const boxStartY = yPosition - 2;
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, boxStartY, contentWidth, 28, 'F');
      
      // Coordinates
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(`Coordinates:`, margin + 5, yPosition + 5);
      doc.text(`X: ${(annotation.x || 0).toFixed(2)}`, margin + 40, yPosition + 5);
      doc.text(`Y: ${(annotation.y || 0).toFixed(2)}`, margin + 75, yPosition + 5);
      doc.text(`Z: ${(annotation.z || 0).toFixed(2)}`, margin + 110, yPosition + 5);
      yPosition += 10;
      
      // Creator
      if (annotation.userName) {
        doc.text(`Discovered by: ${annotation.userName}`, margin + 5, yPosition + 5);
      } else {
        doc.text(`Discovered by: Unknown Explorer`, margin + 5, yPosition + 5);
      }
      yPosition += 10;
      
      // Timestamp if available
      if (annotation.timestamp) {
        const annotationDate = new Date(annotation.timestamp).toLocaleString();
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(`Recorded: ${annotationDate}`, margin + 5, yPosition + 5);
      }
      
      yPosition += 18;
      
      // Separator line between annotations
      if (index < sortedAnnotations.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 8;
      }
    });
  }
  
  // Footer on each page
  const addFooter = () => {
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        'Space Viewer - Lunar Terrain Exploration',
        margin,
        pageHeight - 10
      );
    }
  };
  
  addFooter();
  
  // Generate filename with timestamp
  const filename = `lunar-exploration-report-${new Date().getTime()}.pdf`;
  
  // Save the PDF
  doc.save(filename);
  
  return filename;
};

/**
 * Export a single annotation as a detailed PDF report
 */
export const exportSingleAnnotationPDF = (annotation, currentUser) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = margin;
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Location Report', margin, yPosition);
  yPosition += 15;
  
  // Location name
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 200);
  doc.text(annotation.text, margin, yPosition);
  yPosition += 15;
  
  // Details
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  doc.text(`Coordinates:`, margin, yPosition);
  yPosition += 8;
  doc.text(`  X: ${(annotation.x || 0).toFixed(4)}`, margin, yPosition);
  yPosition += 6;
  doc.text(`  Y: ${(annotation.y || 0).toFixed(4)}`, margin, yPosition);
  yPosition += 6;
  doc.text(`  Z: ${(annotation.z || 0).toFixed(4)}`, margin, yPosition);
  yPosition += 12;
  
  if (annotation.userName) {
    doc.text(`Discovered by: ${annotation.userName}`, margin, yPosition);
    yPosition += 8;
  }
  
  if (annotation.timestamp) {
    const date = new Date(annotation.timestamp).toLocaleString();
    doc.text(`Recorded: ${date}`, margin, yPosition);
  }
  
  const filename = `location-${annotation.text.replace(/\s+/g, '-')}-${Date.now()}.pdf`;
  doc.save(filename);
  
  return filename;
};
