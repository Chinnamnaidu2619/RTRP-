import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportToPDF = async (elementOrId, filename = 'timetable.pdf') => {
    const element = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (!element) { alert('Nothing to export.'); return; }
    try {
        const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let y = 0;
        while (y < imgHeight) {
            if (y > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, -y, imgWidth, imgHeight);
            y += pageHeight;
        }
        pdf.save(filename);
    } catch (err) {
        console.error('PDF export error:', err);
        alert('Failed to generate PDF: ' + err.message);
    }
};

export const generateExcelGrid = (classes, sectionName) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const periods = [1, 2, 3, 4, 5, 6];
    const headerRow = ['Day / Period', 'Period 1', 'Period 2', 'Period 3', 'LUNCH', 'Period 4', 'Period 5', 'Period 6'];
    const data = [
        [`Timetable for Section: ${sectionName}`],
        [],
        headerRow
    ];
    days.forEach(day => {
        const row = [day];
        periods.forEach(p => {
            const slot = classes.find(c => c.day === day && c.period === p);
            row.push(slot ? `${slot.subject_name}\n(${slot.faculty_name})\nRoom: ${slot.room_id}` : '-');
            if (p === 3) row.push('LUNCH');
        });
        data.push(row);
    });
    return XLSX.utils.aoa_to_sheet(data);
};

export const generateFacultyExcelGrid = (classes, facultyName) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const periods = [1, 2, 3, 4, 5, 6];
    const headerRow = ['Day / Period', 'Period 1', 'Period 2', 'Period 3', 'LUNCH', 'Period 4', 'Period 5', 'Period 6'];
    const data = [
        [`Personal Timetable for: ${facultyName}`],
        [],
        headerRow
    ];
    days.forEach(day => {
        const row = [day];
        periods.forEach(p => {
            const slot = classes.find(c => c.day === day && c.period === p);
            row.push(slot ? `${slot.subject_name}\nSection: ${slot.section_name}\nRoom: ${slot.room_id}` : '-');
            if (p === 3) row.push('LUNCH');
        });
        data.push(row);
    });
    return XLSX.utils.aoa_to_sheet(data);
};

export const robustDownload = (filename, base64Content, contentType) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/download';
    const fields = { filename, content: base64Content, type: contentType };
    Object.entries(fields).forEach(([name, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
};

export const downloadWorkbook = (sheets, filename) => {
    try {
        const wb = XLSX.utils.book_new();
        Object.entries(sheets).forEach(([name, ws]) => {
            XLSX.utils.book_append_sheet(wb, ws, name.substring(0, 31).replace(/[\\/?*[\]]/g, '_'));
        });
        const excelBase64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        robustDownload(filename, excelBase64, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    } catch (err) {
        console.error('Excel export error:', err);
        alert('Export failed: ' + err.message);
    }
};
