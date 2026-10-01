import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Incident, Assignment, Officer, Report, User } from '../types';
import { Language } from '../lib/translations';

export interface PDFExportOptions {
  incidents?: Incident[];
  assignments?: Assignment[];
  officers?: Officer[];
  reports?: Report[];
  user?: User | null;
  lang?: Language;
  summaryType?: 'all' | 'incidents' | 'assignments' | 'reports';
  dateFilter?: 'all' | 'today' | '7days' | '30days' | 'month' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
  officerFilter?: string;
  incidentTypeFilter?: 'all' | 'Crime' | 'Traffic';
  statusFilter?: 'all' | 'active' | 'closed' | 'Submitted' | 'Pending Review';
  includeStats?: boolean;
  includeSignatures?: boolean;
  customTitle?: string;
  activeFilterSummary?: {
    dateRangeText?: string;
    officerName?: string;
    incidentType?: string;
    searchTerm?: string;
  };
}

// Clean text helper to prevent character encode glitches
function safeText(val: any, fallback = '-'): string {
  if (val === undefined || val === null || val === '') return fallback;
  return String(val).trim();
}

/**
 * Generates and downloads the Official Incident and Assignment Summary PDF
 * formatted for official West Gojjam Zone Police Department record-keeping.
 */
export function exportIncidentAssignmentSummaryPDF(options: PDFExportOptions): void {
  const {
    incidents = [],
    assignments = [],
    officers = [],
    reports = [],
    user,
    lang = 'en',
    summaryType = 'all',
    dateFilter = 'all',
    startDate,
    endDate,
    officerFilter = 'all',
    incidentTypeFilter = 'all',
    statusFilter = 'all',
    includeStats = true,
    includeSignatures = true,
    customTitle,
    activeFilterSummary
  } = options;

  const now = new Date();

  // Helper map for officer names
  const officerMap = new Map<string, Officer>();
  officers.forEach(o => officerMap.set(o.id, o));

  const filterByDate = (dateStr: string) => {
    if (!dateStr) return true;
    if (dateFilter === 'all' && !startDate && !endDate) return true;

    // Direct custom date range comparison
    if (startDate || endDate) {
      const cleanDate = dateStr.slice(0, 10);
      if (startDate && cleanDate < startDate) return false;
      if (endDate && cleanDate > endDate) return false;
      return true;
    }

    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;

      if (dateFilter === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        return dateStr.startsWith(todayStr);
      }

      const diffMs = now.getTime() - d.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (dateFilter === '7days') return diffDays >= 0 && diffDays <= 7.5;
      if (dateFilter === '30days') return diffDays >= 0 && diffDays <= 30.5;
      if (dateFilter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (dateFilter === 'year') return d.getFullYear() === now.getFullYear();
    } catch {
      return true;
    }
    return true;
  };

  // Helper to match officer
  const matchesOfficer = (officerId?: string, recordingOfficerName?: string) => {
    if (!officerFilter || officerFilter === 'all') return true;
    if (officerId === officerFilter) return true;
    const selectedOfficer = officerMap.get(officerFilter);
    if (selectedOfficer && recordingOfficerName) {
      if (recordingOfficerName.toLowerCase().includes(selectedOfficer.name.toLowerCase())) {
        return true;
      }
    }
    return false;
  };

  // Helper to match incident type
  const matchesType = (type?: string) => {
    if (!incidentTypeFilter || incidentTypeFilter === 'all') return true;
    return type === incidentTypeFilter;
  };

  // Filter reports
  const filteredReports = reports.filter(rep => {
    const matchDate = filterByDate(rep.date);
    const matchOfficer = matchesOfficer(rep.officerId, rep.recordingOfficerName);
    const matchType = matchesType(rep.type);

    let matchStatus = true;
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'active') {
        matchStatus = rep.status === 'Pending Review';
      } else if (statusFilter === 'closed') {
        matchStatus = rep.status === 'Submitted';
      } else {
        matchStatus = rep.status === statusFilter;
      }
    }

    return matchDate && matchOfficer && matchType && matchStatus;
  });

  // Filter incidents
  const filteredIncidents = incidents.filter(inc => {
    const matchDate = filterByDate(inc.date);
    const matchOfficer = matchesOfficer(inc.officerId, inc.recordingOfficerName);
    const matchType = matchesType(inc.type);

    let matchStatus = true;
    if (statusFilter === 'active' || statusFilter === 'Pending Review') {
      matchStatus = inc.status === 'Open' || inc.status === 'In Progress';
    } else if (statusFilter === 'closed' || statusFilter === 'Submitted') {
      matchStatus = inc.status === 'Closed';
    } else if (statusFilter !== 'all') {
      matchStatus = (inc.status as string) === statusFilter;
    }
    return matchDate && matchOfficer && matchType && matchStatus;
  });

  // Filter assignments
  const filteredAssignments = assignments.filter(asg => {
    const matchDate = filterByDate(asg.dueDate);
    const matchOfficer = !officerFilter || officerFilter === 'all' || asg.officerId === officerFilter;

    let matchStatus = true;
    if (statusFilter === 'active') {
      matchStatus = asg.status === 'Pending';
    } else if (statusFilter === 'closed') {
      matchStatus = asg.status === 'Completed';
    }
    return matchDate && matchOfficer && matchStatus;
  });

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Colors
  const navyColor = [10, 25, 47];       // Primary official dark blue #0A192F
  const goldColor = [212, 175, 55];     // Gold police accent #D4AF37
  const slateText = [60, 64, 75];       // Secondary text
  const lightGrayBg = [245, 247, 250];  // Subtle zebra stripe

  // 1. TOP HEADER BANNER
  doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Gold accent stripe
  doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Header Typography
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA', pageWidth / 2, 7, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('AMHARA REGIONAL STATE POLICE COMMISSION | WEST GOJJAM ZONE POLICE DEPARTMENT', pageWidth / 2, 13, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
  const docTitle = customTitle || (summaryType === 'reports' ? 'OFFICIAL INCIDENT REPORTS SUMMARY DOCKET' : 'OFFICIAL INCIDENT & ASSIGNMENT RECORD SUMMARY');
  doc.text(docTitle, pageWidth / 2, 21, { align: 'center' });

  // 2. DOCUMENT METADATA BOX
  let currentY = 36;
  const refCode = `WGPD/REC-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
  const genDateStr = now.toLocaleDateString('en-GB', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric' 
  }) + ` ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

  // Construct active filter description
  const filterParts: string[] = [];
  if (incidentTypeFilter && incidentTypeFilter !== 'all') {
    filterParts.push(`Type: ${incidentTypeFilter}`);
  }
  if (officerFilter && officerFilter !== 'all') {
    const off = officerMap.get(officerFilter);
    filterParts.push(`Officer: ${off ? off.name : officerFilter}`);
  }
  if (startDate || endDate) {
    filterParts.push(`Date: ${startDate || 'Any'} to ${endDate || 'Any'}`);
  } else if (dateFilter !== 'all') {
    const dateLabels: Record<string, string> = {
      today: 'Today',
      '7days': 'Past 7 Days',
      '30days': 'Past 30 Days',
      month: 'This Month',
      year: 'Current Year'
    };
    filterParts.push(`Period: ${dateLabels[dateFilter] || dateFilter}`);
  }
  if (statusFilter && statusFilter !== 'all') {
    filterParts.push(`Status: ${statusFilter}`);
  }

  const hasFilters = filterParts.length > 0;
  const metaBoxHeight = hasFilters ? 29 : 23;

  doc.setDrawColor(210, 215, 225);
  doc.setFillColor(250, 252, 255);
  doc.roundedRect(margin, currentY, pageWidth - (margin * 2), metaBoxHeight, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('DOCUMENT REF:', margin + 4, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text(refCode, margin + 35, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text('CLASSIFICATION:', pageWidth / 2 + 5, currentY + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 40, 40);
  doc.text('OFFICIAL LAW ENFORCEMENT RECORD', pageWidth / 2 + 38, currentY + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text('GENERATED ON:', margin + 4, currentY + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  doc.text(genDateStr, margin + 35, currentY + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text('AUTHORIZED BY:', pageWidth / 2 + 5, currentY + 11.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  const adminName = user?.name ? `${user.name} (${user.role || 'Admin'})` : 'Department Administrator';
  doc.text(adminName, pageWidth / 2 + 38, currentY + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text('REPORT SCOPE:', margin + 4, currentY + 17.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(slateText[0], slateText[1], slateText[2]);
  const scopeDesc = summaryType === 'reports'
    ? 'Official Crime & Traffic Incident Reports Repository'
    : summaryType === 'all' 
    ? 'Comprehensive Police Incidents, Crimes, Traffic Cases & Duty Assignments'
    : summaryType === 'incidents'
    ? 'Police Incidents, Criminal Investigations & Traffic Occurrences'
    : 'Tactical Officer Duty Assignments & Field Deployments';
  doc.text(scopeDesc, margin + 35, currentY + 17.5);

  if (hasFilters) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.text('APPLIED FILTERS:', margin + 4, currentY + 23.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 40, 40);
    doc.text(filterParts.join('   |   '), margin + 35, currentY + 23.5);
  }

  currentY += metaBoxHeight + 5;

  // 3. STATISTICAL KPI OVERVIEW (if included)
  if (includeStats) {
    const isReportsMode = summaryType === 'reports' || (summaryType === 'all' && filteredIncidents.length === 0 && filteredReports.length > 0);
    
    let cards: { label: string; val: string; sub: string }[] = [];

    if (isReportsMode) {
      const totalReps = filteredReports.length;
      const crimeReps = filteredReports.filter(r => r.type === 'Crime').length;
      const trafficReps = filteredReports.filter(r => r.type === 'Traffic').length;
      const submittedReps = filteredReports.filter(r => r.status === 'Submitted').length;
      const pendingReps = filteredReports.filter(r => r.status === 'Pending Review').length;

      cards = [
        { label: 'FILTERED REPORTS', val: totalReps.toString(), sub: `${crimeReps} Crime | ${trafficReps} Traffic` },
        { label: 'SUBMITTED (OFFICIAL)', val: submittedReps.toString(), sub: 'Fully Processed Files' },
        { label: 'PENDING REVIEW', val: pendingReps.toString(), sub: 'Under Administrative Audit' },
        { label: 'ACTIVE PERSONNEL', val: officers.filter(o => o.status === 'Active').length.toString(), sub: 'In Active Duty Service' }
      ];
    } else {
      const totalInc = filteredIncidents.length;
      const crimeCount = filteredIncidents.filter(i => i.type === 'Crime').length;
      const trafficCount = filteredIncidents.filter(i => i.type === 'Traffic').length;
      const openInc = filteredIncidents.filter(i => i.status === 'Open' || i.status === 'In Progress').length;
      const closedInc = filteredIncidents.filter(i => i.status === 'Closed').length;

      const totalAsg = filteredAssignments.length;
      const pendingAsg = filteredAssignments.filter(a => a.status === 'Pending').length;
      const completedAsg = filteredAssignments.filter(a => a.status === 'Completed').length;

      cards = [
        { label: 'TOTAL INCIDENTS', val: totalInc.toString(), sub: `${crimeCount} Crime | ${trafficCount} Traffic` },
        { label: 'ACTIVE / OPEN CASES', val: openInc.toString(), sub: `${closedInc} Resolved / Closed` },
        { label: 'TOTAL ASSIGNMENTS', val: totalAsg.toString(), sub: `${pendingAsg} Pending | ${completedAsg} Done` },
        { label: 'ACTIVE PERSONNEL', val: officers.filter(o => o.status === 'Active').length.toString(), sub: 'In Active Duty Service' }
      ];
    }

    // Stat card grid
    const cardWidth = (pageWidth - (margin * 2) - 9) / 4;
    const cardHeight = 16;

    cards.forEach((card, index) => {
      const x = margin + index * (cardWidth + 3);
      doc.setFillColor(248, 250, 253);
      doc.setDrawColor(215, 222, 235);
      doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(slateText[0], slateText[1], slateText[2]);
      doc.text(card.label, x + 3, currentY + 4.5);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
      doc.text(card.val, x + 3, currentY + 10);

      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(110, 115, 125);
      doc.text(card.sub, x + 3, currentY + 14);
    });

    currentY += 21;
  }

  // 4. SECTION: INCIDENT / REPORT RECORDS SUMMARY
  const shouldUseReportsList = summaryType === 'reports' || (summaryType !== 'assignments' && filteredIncidents.length === 0 && filteredReports.length > 0);

  if (summaryType === 'reports' || summaryType === 'all' || summaryType === 'incidents') {
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
    
    const sectionCount = shouldUseReportsList ? filteredReports.length : filteredIncidents.length;
    const sectionTitle = shouldUseReportsList 
      ? `1. INCIDENT REPORTS ARCHIVE (${sectionCount} Records)`
      : `1. INCIDENT RECORDS SUMMARY (${sectionCount} Records)`;
    doc.text(sectionTitle, margin, currentY);

    // Subtle divider
    doc.setDrawColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY + 1.5, margin + 95, currentY + 1.5);

    let incidentTableBody: string[][];

    if (shouldUseReportsList) {
      incidentTableBody = filteredReports.map((rep, idx) => {
        const officer = officerMap.get(rep.officerId);
        const officerDesc = rep.recordingOfficerName || officer?.name || 'Unassigned';
        const rank = rep.recordingOfficerRank || officer?.rank || '';
        const officerWithRank = rank ? `${officerDesc} (${rank})` : officerDesc;

        return [
          (idx + 1).toString(),
          safeText(rep.date),
          `${safeText(rep.title)}\n[${safeText(rep.type)} - ${safeText(rep.category)}]`,
          `${safeText(rep.filingStation, 'West Gojjam')}${rep.location ? `\n${safeText(rep.location)}` : ''}`,
          officerWithRank,
          safeText(rep.status)
        ];
      });
    } else {
      incidentTableBody = filteredIncidents.map((inc, idx) => {
        const officer = officerMap.get(inc.officerId);
        const officerDesc = inc.recordingOfficerName || officer?.name || 'Unassigned';
        const rank = inc.recordingOfficerRank || officer?.rank || '';
        const officerWithRank = rank ? `${officerDesc} (${rank})` : officerDesc;

        return [
          (idx + 1).toString(),
          safeText(inc.date),
          `${safeText(inc.title)}\n[${safeText(inc.type)} - ${safeText(inc.category)}]`,
          `${safeText(inc.location)}\n${safeText(inc.filingStation, 'West Gojjam')}`,
          officerWithRank,
          safeText(inc.status)
        ];
      });
    }

    if (incidentTableBody.length === 0) {
      incidentTableBody.push(['-', '-', 'No incident records found matching criteria', '-', '-', '-']);
    }

    autoTable(doc, {
      startY: currentY + 4,
      head: [['#', 'Date', 'Incident & Category', 'Location / Station', 'Officer in Charge', 'Status']],
      body: incidentTableBody,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [navyColor[0], navyColor[1], navyColor[2]],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left',
        cellPadding: 2.5
      },
      bodyStyles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [40, 44, 52]
      },
      alternateRowStyles: {
        fillColor: [lightGrayBg[0], lightGrayBg[1], lightGrayBg[2]]
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 20 },
        2: { cellWidth: 50 },
        3: { cellWidth: 42 },
        4: { cellWidth: 40 },
        5: { cellWidth: 22, halign: 'center', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const statusText = data.cell.raw as string;
          if (statusText === 'Closed' || statusText === 'Completed' || statusText === 'Submitted') {
            data.cell.styles.textColor = [34, 139, 34]; // Forest Green
          } else if (statusText === 'Open' || statusText === 'Pending') {
            data.cell.styles.textColor = [190, 40, 40]; // Crimson Red
          } else if (statusText === 'In Progress' || statusText === 'Pending Review') {
            data.cell.styles.textColor = [200, 120, 20]; // Amber
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 5. SECTION: DUTY ASSIGNMENTS & MISSIONS
  if (summaryType === 'all' || summaryType === 'assignments') {
    // Check if new page is needed
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 20;
    }

    const sectionNum = summaryType === 'all' ? '2' : '1';
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.text(`${sectionNum}. TACTICAL ASSIGNMENTS & OFFICER DEPLOYMENTS (${filteredAssignments.length} Records)`, margin, currentY);

    // Subtle divider
    doc.setDrawColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY + 1.5, margin + 115, currentY + 1.5);

    // Map incident titles for quick reference
    const incidentMap = new Map<string, Incident>();
    incidents.forEach(i => incidentMap.set(i.id, i));

    const assignmentTableBody = filteredAssignments.map((asg, idx) => {
      const officer = officerMap.get(asg.officerId);
      const officerDesc = officer ? `${officer.name} (${officer.badgeNumber || officer.rank})` : 'Assigned Officer';
      const relatedIncident = incidentMap.get(asg.incidentId);
      const linkedCase = relatedIncident ? relatedIncident.title : 'General Operation';

      return [
        (idx + 1).toString(),
        safeText(asg.title),
        officerDesc,
        linkedCase,
        safeText(asg.dueDate),
        safeText(asg.status)
      ];
    });

    if (assignmentTableBody.length === 0) {
      assignmentTableBody.push(['-', 'No assignment records found matching criteria', '-', '-', '-', '-']);
    }

    autoTable(doc, {
      startY: currentY + 4,
      head: [['#', 'Assignment / Mission', 'Assigned Officer', 'Linked Case / Duty', 'Due Date', 'Status']],
      body: assignmentTableBody,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: {
        fillColor: [24, 48, 89],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left',
        cellPadding: 2.5
      },
      bodyStyles: {
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [40, 44, 52]
      },
      alternateRowStyles: {
        fillColor: [lightGrayBg[0], lightGrayBg[1], lightGrayBg[2]]
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 46 },
        3: { cellWidth: 44 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const statusText = data.cell.raw as string;
          if (statusText === 'Completed') {
            data.cell.styles.textColor = [34, 139, 34];
          } else if (statusText === 'Pending') {
            data.cell.styles.textColor = [190, 40, 40];
          }
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // 6. OFFICIAL VERIFICATION & SIGN-OFF BLOCK
  if (includeSignatures) {
    // If not enough room for signatures (requires ~42mm), start new page
    if (currentY > pageHeight - 45) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFillColor(252, 252, 254);
    doc.setDrawColor(210, 215, 225);
    const boxHeight = 36;
    doc.roundedRect(margin, currentY, pageWidth - (margin * 2), boxHeight, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.text('OFFICIAL ATTESTATION & POLICE DEPARTMENT VERIFICATION', margin + 4, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 105, 115);
    doc.text(
      'I hereby certify that the statistics, incident listings, and tactical assignments documented above reflect official entries in the West Gojjam Zone Police Management System.',
      margin + 4,
      currentY + 9,
      { maxWidth: pageWidth - (margin * 2) - 8 }
    );

    // Left Signature: Recording Officer / Administrator
    const sigY = currentY + 22;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.text('PREPARED BY (ADMINISTRATOR):', margin + 6, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Name: ${user?.name || 'Chief Administrator'}`, margin + 6, sigY + 4.5);
    doc.text(`Signature: __________________________`, margin + 6, sigY + 9);

    // Center Seal Box
    const sealX = pageWidth / 2 - 18;
    doc.setDrawColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(sealX, currentY + 15, 36, 17, 1.5, 1.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
    doc.text('[ POLICE SEAL / ማህተም ]', pageWidth / 2, currentY + 22, { align: 'center' });
    doc.setFontSize(5.5);
    doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.text('WEST GOJJAM ZONE POLICE', pageWidth / 2, currentY + 26, { align: 'center' });
    doc.text('Finote Selam, Ethiopia', pageWidth / 2, currentY + 29.5, { align: 'center' });

    // Right Signature: Department Commander
    const rightSigX = pageWidth / 2 + 25;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.text('REVIEWED & APPROVED BY:', rightSigX, sigY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Chief Sergeant Mengesha Yimam Abera', rightSigX, sigY + 4.5);
    doc.text('Signature: __________________________', rightSigX, sigY + 9);
  }

  // 7. FOOTER & PAGE NUMBERING ON ALL PAGES
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Subtle bottom line
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(130, 135, 145);
    doc.text(
      'West Gojjam Zone Police Management System | Finote Selam, Amhara, Ethiopia | Official Confidential Record',
      margin,
      pageHeight - 6
    );

    doc.setFont('helvetica', 'bold');
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: 'right' }
    );
  }

  // 8. Trigger download
  const filename = `West_Gojjam_Police_Summary_${now.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Generates an official single-case Report Docket PDF
 */
export function exportSingleReportPDF(report: Report, officers: Officer[], lang: Language = 'en'): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const navyColor = [10, 25, 47];
  const goldColor = [212, 175, 55];

  // Header
  doc.setFillColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setFillColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.rect(0, 26, pageWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('FEDERAL DEMOCRATIC REPUBLIC OF ETHIOPIA', pageWidth / 2, 7, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('WEST GOJJAM ZONE POLICE DEPARTMENT | OFFICIAL CASE DOCKET', pageWidth / 2, 13, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(goldColor[0], goldColor[1], goldColor[2]);
  doc.text(`CASE FILE: ${report.title.toUpperCase()}`, pageWidth / 2, 20, { align: 'center' });

  let currentY = 35;

  // Metadata Table
  const officer = officers.find(o => o.id === report.officerId);
  const officerName = report.recordingOfficerName || officer?.name || 'Officer';
  const officerRank = report.recordingOfficerRank || officer?.rank || 'Sergeant';

  const metaRows = [
    ['Case Title:', report.title, 'Status:', report.status],
    ['Case Type:', `${report.type} (${report.category})`, 'Date Filed:', report.date],
    ['Filing Station:', report.filingStation || 'West Gojjam Central Station', 'Location:', report.location || 'N/A'],
    ['Recording Officer:', `${officerName} (${officerRank})`, 'Station:', officer?.station || 'Finote Selam']
  ];

  autoTable(doc, {
    startY: currentY,
    body: metaRows,
    theme: 'plain',
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32, textColor: [10, 25, 47] },
      1: { cellWidth: 60, textColor: [50, 50, 50] },
      2: { fontStyle: 'bold', cellWidth: 26, textColor: [10, 25, 47] },
      3: { cellWidth: 60, textColor: [50, 50, 50] }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Description / Narrative
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text('OFFICIAL CASE INVESTIGATION NARRATIVE / መግለጫ:', margin, currentY);

  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(40, 44, 52);
  const narrative = report.description || 'No detailed written narrative filed for this report.';
  const splitText = doc.splitTextToSize(narrative, pageWidth - (margin * 2));
  doc.text(splitText, margin, currentY);

  currentY += splitText.length * 4.5 + 8;

  // Traffic Details if available
  if (report.trafficDetails) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
    doc.text('TRAFFIC ACCIDENT SPECIFICATIONS:', margin, currentY);

    const td = report.trafficDetails;
    const trafficRows = [
      ['Accident Type:', safeText(td.accidentType), 'Impact Severity:', safeText(td.accidentImpact)],
      ['Casualties:', `Deaths: ${td.numDeaths || 0} | Heavy: ${td.numHeavyInjuries || 0} | Light: ${td.numLightInjuries || 0}`, 'Property Damage:', safeText(td.propertyDamageEstimate, '0 ETB')],
      ['Vehicle Type:', safeText(td.vehicleType), 'Plate Number:', safeText(td.plateNumber)],
      ['Driver Experience:', safeText(td.driverExperience), 'License Grade:', safeText(td.licenseGrade)]
    ];

    autoTable(doc, {
      startY: currentY + 3,
      body: trafficRows,
      theme: 'grid',
      margin: { left: margin, right: margin },
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [10, 25, 47] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 32 },
        1: { cellWidth: 60 },
        2: { fontStyle: 'bold', cellWidth: 30 },
        3: { cellWidth: 56 }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Official signatures
  const sigY = pageHeight - 35;
  doc.setDrawColor(210, 215, 225);
  doc.line(margin, sigY - 5, pageWidth - margin, sigY - 5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navyColor[0], navyColor[1], navyColor[2]);
  doc.text(`RECORDING OFFICER: ${officerName}`, margin, sigY);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature: __________________________', margin, sigY + 6);
  doc.text(`Date: ${report.date}`, margin, sigY + 11);

  doc.setFont('helvetica', 'bold');
  doc.text('COMMANDING OFFICER APPROVAL:', pageWidth / 2 + 15, sigY);
  doc.setFont('helvetica', 'normal');
  doc.text('Signature: __________________________', pageWidth / 2 + 15, sigY + 6);
  doc.text('Seal: [ WEST GOJJAM POLICE ]', pageWidth / 2 + 15, sigY + 11);

  doc.save(`Police_Report_${report.id.slice(0, 8)}.pdf`);
}
