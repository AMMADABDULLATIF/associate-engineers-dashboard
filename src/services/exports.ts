import type {
  DailyLogRecord,
  MachineryRecord,
  MaterialEntry,
  SiteRecord,
} from '../types';

export function exportSiteLogsExcel(
  site: SiteRecord,
  logs: DailyLogRecord[],
  materials: MaterialEntry[],
  showToast: (msg: string) => void
): void {
  if (!logs.length) {
    showToast('No logs available to export.');
    return;
  }

  if (!window.XLSX) {
    showToast('Excel export library unavailable offline.');
    return;
  }

  const exportData = logs.map((l) => ({
    Date: l.date,
    'Site Name': site.name,
    Supervisor: l.supervisor,
    Weather: l.weather,
    'Total Labour': l.totalLabor,
    'Site Store Materials': materials
      .filter((m) => m.date === l.date)
      .map(
        (m) =>
          `${m.materialName || 'Material'} (+${m.receivedQty ?? 0}/-${
            m.usedQty ?? 0
          } ${m.unit || ''})`
      )
      .join('; '),
    'Work Completed': l.completedTasks
      ? l.completedTasks.map((c) => c.task).join('; ')
      : '',
    'Pending Tasks': l.pendingTasks
      ? l.pendingTasks.map((p) => p.task).join('; ')
      : '',
    'Delays & Issues': l.delays
      ? l.delays.map((d) => `${d.task}: ${d.reason}`).join('; ')
      : '',
  }));

  const worksheet = window.XLSX.utils.json_to_sheet(exportData);
  const workbook = window.XLSX.utils.book_new();
  window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Site Logs');

  const filename = `Site_Logs_${site.name.replace(/[^a-zA-Z0-9]/g, '_')}_${
    new Date().toISOString().split('T')[0]
  }.xlsx`;

  window.XLSX.writeFile(workbook, filename);
  showToast('Excel spreadsheet exported successfully!');
}

export function downloadLogPDF(
  log: DailyLogRecord,
  site: SiteRecord | null,
  materials: MaterialEntry[],
  machinery: MachineryRecord[],
  showToast: (msg: string) => void
): void {
  showToast('Generating PDF report...');
  const JsPdfClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;

  if (!JsPdfClass) {
    window.print();
    return;
  }

  try {
    const doc = new JsPdfClass({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - margin * 2;
    const bottomLimit = pageHeight - 13;

    let y = 12;

    doc.setFillColor(11, 17, 34);
    doc.roundedRect(margin, y, contentWidth, 21, 3, 3, 'F');
    doc.setFillColor(98, 229, 245);
    doc.rect(margin, y, 2.5, 21, 'F');

    doc.setTextColor(98, 229, 245);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('ASSOCIATE ENGINEERS', margin + 7, y + 8.5);

    doc.setFontSize(8);
    doc.setTextColor(200, 212, 232);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'DAILY CONSTRUCTION SITE & MACHINERY ACTIVITY REPORT',
      margin + 7,
      y + 15
    );

    doc.setFillColor(98, 229, 245);
    doc.roundedRect(pageWidth - margin - 38, y + 4.5, 34, 12, 2, 2, 'F');
    doc.setTextColor(11, 17, 34);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(String(log.date || ''), pageWidth - margin - 21, y + 12, {
      align: 'center',
    });

    y += 25;

    doc.setFillColor(244, 247, 252);
    doc.setDrawColor(210, 221, 238);
    doc.roundedRect(margin, y, contentWidth, 14.5, 2, 2, 'FD');

    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('SITE:', margin + 4, y + 5.5);
    doc.text('SUPERVISOR:', margin + 4, y + 11.2);
    doc.text('WEATHER:', margin + 102, y + 5.5);
    doc.text('TOTAL LABOUR:', margin + 102, y + 11.2);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(
      String(site ? site.name : '--').substring(0, 38),
      margin + 28,
      y + 5.5
    );
    doc.setFont('helvetica', 'normal');
    doc.text(
      String(log.supervisor || '--').substring(0, 38),
      margin + 28,
      y + 11.2
    );
    doc.text(String(log.weather || 'Normal'), margin + 132, y + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`${log.totalLabor || 0} Workers`, margin + 132, y + 11.2);

    y += 19;

    const checkBreak = (needed: number) => {
      if (y + needed > bottomLimit) {
        doc.addPage();
        y = 14;
      }
    };

    const drawSectionHeader = (title: string) => {
      checkBreak(14);
      doc.setFillColor(238, 244, 253);
      doc.rect(margin, y, contentWidth, 6.2, 'F');
      doc.setFillColor(18, 66, 130);
      doc.rect(margin, y, 2, 6.2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 42, 86);
      doc.text(title, margin + 4.5, y + 4.4);
      y += 7.5;
    };

    // 1. Labour Deployment Summary
    drawSectionHeader('1. LABOUR DEPLOYMENT SUMMARY');

    const labour: Array<{ trade: string; count: number; shift: string }> = [];
    if (log.laborBreakdown) {
      Object.entries(log.laborBreakdown).forEach(([trade, d]) => {
        const count =
          typeof d === 'object' && d !== null ? Number(d.count) || 0 : Number(d) || 0;
        const shift =
          typeof d === 'object' && d !== null ? d.shift || 'Day' : 'Day';
        if (count > 0) labour.push({ trade, count, shift });
      });
    }

    if (labour.length === 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 110, 130);
      doc.text(
        'No specific trade counts entered for this date.',
        margin + 4,
        y + 3.5
      );
      y += 7;
    } else {
      const halfW = (contentWidth - 4) / 2;
      const colGap = 4;
      const pairs = Math.ceil(labour.length / 2);
      const hasRightCol = labour.length > 1;

      doc.setFillColor(227, 235, 248);
      doc.rect(margin, y, hasRightCol ? halfW : contentWidth, 5.2, 'F');
      if (hasRightCol) {
        doc.rect(margin + halfW + colGap, y, halfW, 5.2, 'F');
      }
      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 45, 75);
      doc.text('Trade Category', margin + 3, y + 3.7);
      doc.text('Shift', margin + (hasRightCol ? 58 : 100), y + 3.7);
      doc.text('Qty', margin + (hasRightCol ? halfW - 3 : contentWidth - 4), y + 3.7, {
        align: 'right',
      });

      if (hasRightCol) {
        const rx = margin + halfW + colGap;
        doc.text('Trade Category', rx + 3, y + 3.7);
        doc.text('Shift', rx + 58, y + 3.7);
        doc.text('Qty', rx + halfW - 3, y + 3.7, { align: 'right' });
      }
      y += 5.2;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      for (let i = 0; i < pairs; i++) {
        checkBreak(5.5);
        const leftItem = labour[i * 2];
        const rightItem = labour[i * 2 + 1];
        const rowW = hasRightCol ? halfW : contentWidth;

        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 254);
          doc.rect(margin, y, rowW, 4.9, 'F');
          if (hasRightCol) doc.rect(margin + halfW + colGap, y, halfW, 4.9, 'F');
        }
        doc.setDrawColor(232, 238, 248);
        doc.line(margin, y + 4.9, margin + rowW, y + 4.9);

        doc.setTextColor(25, 35, 55);
        doc.text(String(leftItem.trade).substring(0, 30), margin + 3, y + 3.5);
        doc.text(
          String(leftItem.shift),
          margin + (hasRightCol ? 58 : 100),
          y + 3.5
        );
        doc.setFont('helvetica', 'bold');
        doc.text(
          String(leftItem.count),
          margin + (hasRightCol ? halfW - 3 : contentWidth - 4),
          y + 3.5,
          { align: 'right' }
        );
        doc.setFont('helvetica', 'normal');

        if (rightItem) {
          const rx = margin + halfW + colGap;
          doc.line(rx, y + 4.9, rx + halfW, y + 4.9);
          doc.text(String(rightItem.trade).substring(0, 30), rx + 3, y + 3.5);
          doc.text(String(rightItem.shift), rx + 58, y + 3.5);
          doc.setFont('helvetica', 'bold');
          doc.text(String(rightItem.count), rx + halfW - 3, y + 3.5, {
            align: 'right',
          });
          doc.setFont('helvetica', 'normal');
        }
        y += 4.9;
      }
      y += 4;
    }

    // 2. Site Store & Materials
    drawSectionHeader(
      `2. SITE STORE & MATERIALS (LOG DATE: ${String(log.date || '')})`
    );
    const dayMats = materials.filter((m) => m.date === log.date);
    if (dayMats.length === 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 110, 130);
      doc.text('No materials logged for this date.', margin + 4, y + 3.5);
      y += 7;
    } else {
      doc.setFillColor(227, 235, 248);
      doc.rect(margin, y, contentWidth, 5.4, 'F');
      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 45, 75);
      doc.text('Material Name', margin + 3, y + 3.8);
      doc.text('Category', margin + 52, y + 3.8);
      doc.text('Open', margin + 91, y + 3.8, { align: 'right' });
      doc.text('In', margin + 106, y + 3.8, { align: 'right' });
      doc.text('Out', margin + 121, y + 3.8, { align: 'right' });
      doc.text('Balance', margin + 143, y + 3.8, { align: 'right' });
      doc.text('Supplier / Note', margin + 147, y + 3.8);
      doc.text('Status', margin + contentWidth - 3, y + 3.8, {
        align: 'right',
      });
      y += 5.4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      dayMats.forEach((m, i) => {
        checkBreak(5.5);
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 254);
          doc.rect(margin, y, contentWidth, 5.1, 'F');
        }
        doc.setDrawColor(232, 238, 248);
        doc.line(margin, y + 5.1, margin + contentWidth, y + 5.1);

        const isLow =
          (Number(m.minAlertLimit) || 0) > 0 &&
          (Number(m.balance) || 0) < (Number(m.minAlertLimit) || 0);
        const supplierTxt = m.supplier || m.note || '-';

        doc.setTextColor(25, 35, 55);
        doc.setFont('helvetica', 'bold');
        doc.text(
          String(m.materialName || '').substring(0, 27),
          margin + 3,
          y + 3.6
        );
        doc.setFont('helvetica', 'normal');
        doc.text(
          String(m.category || 'General').substring(0, 17),
          margin + 52,
          y + 3.6
        );
        doc.text(String(m.openingStock ?? 0), margin + 91, y + 3.6, {
          align: 'right',
        });
        doc.setTextColor(21, 128, 61);
        doc.text('+' + String(m.receivedQty ?? 0), margin + 106, y + 3.6, {
          align: 'right',
        });
        doc.setTextColor(180, 83, 9);
        doc.text('-' + String(m.usedQty ?? 0), margin + 121, y + 3.6, {
          align: 'right',
        });
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.text(
          `${m.balance ?? 0} ${m.unit || ''}`.trim().substring(0, 14),
          margin + 143,
          y + 3.6,
          { align: 'right' }
        );
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(String(supplierTxt).substring(0, 16), margin + 147, y + 3.6);

        if (isLow) {
          doc.setTextColor(185, 28, 28);
          doc.setFont('helvetica', 'bold');
          doc.text('LOW STOCK', margin + contentWidth - 3, y + 3.6, {
            align: 'right',
          });
        } else {
          doc.setTextColor(21, 128, 61);
          doc.setFont('helvetica', 'bold');
          doc.text('In Stock', margin + contentWidth - 3, y + 3.6, {
            align: 'right',
          });
        }
        doc.setFont('helvetica', 'normal');
        y += 5.1;
      });
      y += 4;
    }

    // 3. Plant & Machinery Log
    drawSectionHeader('3. PLANT & MACHINERY LOG');
    const dayMach = machinery.filter((m) => m.date === log.date);
    if (dayMach.length === 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 110, 130);
      doc.text(
        'No plant or heavy machinery logged for this date.',
        margin + 4,
        y + 3.5
      );
      y += 7;
    } else {
      doc.setFillColor(227, 235, 248);
      doc.rect(margin, y, contentWidth, 5.4, 'F');
      doc.setFontSize(7.2);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 45, 75);
      doc.text('Equipment Name', margin + 3, y + 3.8);
      doc.text('Hours', margin + 74, y + 3.8, { align: 'right' });
      doc.text('Fuel (Liters)', margin + 102, y + 3.8, { align: 'right' });
      doc.text('Operator / Remarks', margin + 110, y + 3.8);
      y += 5.4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);
      dayMach.forEach((m, i) => {
        checkBreak(5.5);
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 254);
          doc.rect(margin, y, contentWidth, 5.1, 'F');
        }
        doc.setDrawColor(232, 238, 248);
        doc.line(margin, y + 5.1, margin + contentWidth, y + 5.1);

        doc.setTextColor(25, 35, 55);
        doc.setFont('helvetica', 'bold');
        doc.text(String(m.name || '').substring(0, 34), margin + 3, y + 3.6);
        doc.setFont('helvetica', 'normal');
        doc.text(`${m.hours || 0} Hrs`, margin + 74, y + 3.6, { align: 'right' });
        doc.text(`${m.fuel || 0} Ltr`, margin + 102, y + 3.6, { align: 'right' });
        doc.setTextColor(71, 85, 105);
        doc.text(
          String(m.remarks || '-').substring(0, 45),
          margin + 110,
          y + 3.6
        );
        y += 5.1;
      });
      y += 4;
    }

    // 4. Work Completed Today
    drawSectionHeader('4. WORK COMPLETED TODAY');
    const comps = Array.isArray(log.completedTasks) ? log.completedTasks : [];
    if (comps.length === 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 110, 130);
      doc.text('No completed tasks specified.', margin + 4, y + 3.5);
      y += 7;
    } else {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      comps.forEach((c, idx) => {
        const txt = `${idx + 1}. ${c.task || ''}${
          c.location ? `  [Zone: ${c.location}]` : ''
        }`;
        const lines = doc.splitTextToSize(txt, contentWidth - 8);
        checkBreak(lines.length * 4.2 + 1.5);
        doc.text(lines, margin + 4, y + 3.2);
        y += lines.length * 4.2 + 1;
      });
      y += 3;
    }

    // 5. Remaining / Pending Work
    drawSectionHeader('5. REMAINING / PENDING WORK');
    const pends = Array.isArray(log.pendingTasks) ? log.pendingTasks : [];
    if (pends.length === 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 110, 130);
      doc.text('No pending tasks logged.', margin + 4, y + 3.5);
      y += 7;
    } else {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      pends.forEach((p, idx) => {
        const txt = `${idx + 1}. ${p.task || ''}${
          p.targetDate ? `  (Target: ${p.targetDate})` : ''
        }`;
        const lines = doc.splitTextToSize(txt, contentWidth - 8);
        checkBreak(lines.length * 4.2 + 1.5);
        doc.text(lines, margin + 4, y + 3.2);
        y += lines.length * 4.2 + 1;
      });
      y += 3;
    }

    // 6. Delays & Reasons Analysis (Pure ASCII)
    drawSectionHeader('6. DELAYS & REASONS ANALYSIS');
    const delays = Array.isArray(log.delays) ? log.delays : [];
    if (delays.length === 0) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 110, 130);
      doc.text('No work delays reported today.', margin + 4, y + 3.5);
      y += 7;
    } else {
      doc.setFontSize(8);
      delays.forEach((d, idx) => {
        const taskStr = String(d.task || '-').trim();
        const reasonStr = String(d.reason || '-').trim();
        const rowText = `${idx + 1}. Task: ${taskStr}   |   Reason: ${reasonStr}`;
        const lines = doc.splitTextToSize(rowText, contentWidth - 10);
        const boxH = lines.length * 4.2 + 3;
        checkBreak(boxH + 2);
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(252, 165, 165);
        doc.roundedRect(margin, y, contentWidth, boxH, 1.5, 1.5, 'FD');
        doc.setFillColor(185, 28, 28);
        doc.rect(margin, y, 1.8, boxH, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(127, 29, 29);
        doc.text(lines, margin + 4.5, y + 4);
        y += boxH + 1.8;
      });
      y += 2;
    }

    // Footer
    const totalP = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalP; p++) {
      doc.setPage(p);
      doc.setDrawColor(220, 228, 240);
      doc.line(margin, pageHeight - 11, pageWidth - margin, pageHeight - 11);
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        'Associate Engineers Worksite Dashboard | Confidential Daily Site Log',
        margin,
        pageHeight - 7
      );
      doc.text(`Page ${p} of ${totalP}`, pageWidth - margin, pageHeight - 7, {
        align: 'right',
      });
    }

    const cleanSite = (site ? site.name : 'Site').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `AE_Daily_Log_${cleanSite}_${log.date}.pdf`;
    doc.save(fileName);
    showToast('PDF downloaded successfully!');
  } catch (err) {
    console.error('PDF generation error:', err);
    window.print();
  }
}
