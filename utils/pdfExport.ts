/**
 * PDF export utilities for generating professional critique reports.
 * Uses jsPDF for document generation and html2canvas for capturing visual elements.
 * @module utils/pdfExport
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { CritiqueAnalysis } from '../types';

/**
 * Generates and downloads a professionally formatted PDF report of the video critique.
 * The report includes verdict, summary sections, timeline issues, director style analysis,
 * music sync data, and shot-by-shot breakdown.
 *
 * @async
 * @param {CritiqueAnalysis} critique - The complete critique analysis to include in the report
 * @param {string} videoName - Original name of the analyzed video file
 * @returns {Promise<void>} Resolves when the PDF is generated and download is triggered
 *
 * @example
 * await generatePDFReport(critiqueData, 'my-music-video.mp4');
 * // Downloads: CineCritique_my-music-video_2025-01-15.pdf
 */
export const generatePDFReport = async (
  critique: CritiqueAnalysis,
  videoName: string
): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  /**
   * Helper function to add text to the PDF with automatic line wrapping and page breaks.
   * Handles pagination automatically when content exceeds page boundaries.
   *
   * @param {string} text - The text content to add
   * @param {number} fontSize - Font size in points
   * @param {boolean} [isBold=false] - Whether to use bold font weight
   */
  const addText = (text: string, fontSize: number, isBold = false) => {
    pdf.setFontSize(fontSize);
    if (isBold) {
      pdf.setFont('helvetica', 'bold');
    } else {
      pdf.setFont('helvetica', 'normal');
    }

    const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);

    // Check if we need a new page
    if (yPosition + lines.length * fontSize * 0.35 > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.text(lines, margin, yPosition);
    yPosition += lines.length * fontSize * 0.35 + 5;
  };

  /**
   * Adds vertical spacing in the PDF document.
   *
   * @param {number} height - Height of spacing in millimeters
   */
  const addSpacer = (height: number) => {
    yPosition += height;
  };

  // Header
  pdf.setFillColor(79, 70, 229); // Indigo
  pdf.rect(0, 0, pageWidth, 40, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CineCritique AI', margin, 25);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Professional Video Analysis Report', margin, 33);

  yPosition = 50;
  pdf.setTextColor(0, 0, 0);

  // Video Info
  addText(`Video: ${videoName}`, 14, true);
  addText(`Analysis Date: ${new Date().toLocaleDateString()}`, 10);
  addSpacer(5);

  // Verdict Section
  pdf.setFillColor(238, 242, 255); // Light indigo
  pdf.rect(margin - 5, yPosition - 5, pageWidth - 2 * margin + 10, 15, 'F');
  addText('📊 VERDICT', 16, true);
  addText(critique.summary.verdict, 11);
  addSpacer(10);

  // Summary Sections
  const sections = [
    { title: '🎬 Storytelling & Concept', content: critique.summary.storytelling },
    { title: '✂️ Editing & Rhythm', content: critique.summary.editing },
    { title: '🎥 Cinematography', content: critique.summary.cinematography },
    { title: '🎵 Music Integration', content: critique.summary.musicIntegration },
  ];

  sections.forEach(section => {
    addText(section.title, 14, true);
    addText(section.content, 10);
    addSpacer(8);
  });

  // Director Style (if available)
  if (critique.directorStyle && critique.directorStyle.length > 0) {
    pdf.addPage();
    yPosition = margin;

    addText('🎨 DIRECTOR STYLE ANALYSIS', 16, true);
    addSpacer(5);

    critique.directorStyle.forEach(match => {
      addText(`${match.director}: ${match.percentage}%`, 12, true);
      addText(match.characteristics.join(', '), 10);
      addSpacer(5);
    });
    addSpacer(10);
  }

  // Music Sync Analysis (if available)
  if (critique.musicSync) {
    addText('🎵 MUSIC SYNC ANALYSIS', 16, true);
    addText(`BPM: ${critique.musicSync.bpm}`, 12);
    addText(`Sync Score: ${critique.musicSync.syncScore}/100`, 12);
    addSpacer(5);

    if (critique.musicSync.offBeatCuts.length > 0) {
      addText('Off-Beat Cuts:', 12, true);
      critique.musicSync.offBeatCuts.forEach(cut => {
        addText(`• ${cut.timestamp} (${cut.offset > 0 ? '+' : ''}${cut.offset.toFixed(2)}s off beat)`, 10);
      });
      addSpacer(5);
    }

    if (critique.musicSync.suggestions.length > 0) {
      addText('Suggestions:', 12, true);
      critique.musicSync.suggestions.forEach(suggestion => {
        addText(`• ${suggestion}`, 10);
      });
      addSpacer(10);
    }
  }

  // Timeline Issues
  pdf.addPage();
  yPosition = margin;

  addText('⏱️ TIMELINE ISSUES & FIXES', 16, true);
  addSpacer(5);

  critique.timeline.forEach((event, index) => {
    // Color-code by severity
    if (event.severity > 7) {
      pdf.setTextColor(239, 68, 68); // Red
    } else if (event.severity > 4) {
      pdf.setTextColor(245, 158, 11); // Amber
    } else {
      pdf.setTextColor(59, 130, 246); // Blue
    }

    addText(`${index + 1}. ${event.timestamp} - ${event.title}`, 12, true);
    pdf.setTextColor(0, 0, 0);

    addText(`Issue: ${event.issue}`, 10);
    addText(`Reason: ${event.reason}`, 10);

    pdf.setFillColor(220, 252, 231); // Light green
    const fixYPos = yPosition;
    addText(`✓ Fix: ${event.fix}`, 10, true);

    addSpacer(8);
  });

  // Shot Breakdown (if available)
  if (critique.shots && critique.shots.length > 0) {
    pdf.addPage();
    yPosition = margin;

    addText('🎬 SHOT-BY-SHOT BREAKDOWN', 16, true);
    addSpacer(5);

    critique.shots.forEach(shot => {
      addText(`Shot ${shot.shotNumber}: ${shot.startTime} - ${shot.endTime}`, 12, true);
      addText(`Type: ${shot.shotType} | Movement: ${shot.movement}`, 10);
      addText(`Description: ${shot.description}`, 10);
      addText(`Lighting: ${shot.lighting}`, 10);
      addText(`Composition: ${shot.composition}`, 10);
      addSpacer(8);
    });
  }

  // Footer on each page
  const totalPages = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `Page ${i} of ${totalPages} • Generated by CineCritique AI`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  const fileName = `CineCritique_${videoName.replace(/\.[^/.]+$/, '')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
};

/**
 * Captures a DOM element as a PNG image for inclusion in reports.
 * Primarily used for capturing timeline charts and visualizations.
 *
 * @async
 * @param {string} elementId - The DOM element ID to capture
 * @returns {Promise<string | null>} Data URL of the captured image, or null if capture fails
 *
 * @example
 * const chartImage = await captureTimelineChart('timeline-chart');
 * if (chartImage) {
 *   // Use the data URL in PDF or elsewhere
 * }
 */
export const captureTimelineChart = async (elementId: string): Promise<string | null> => {
  const element = document.getElementById(elementId);
  if (!element) return null;

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#1e293b',
      scale: 2,
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to capture timeline chart:', error);
    return null;
  }
};
