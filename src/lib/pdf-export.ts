import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Define a global interface to extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function exportToPdf(
  title: string,
  headers: string[][],
  body: (string | number)[][]
) {
  const doc = new jsPDF();
  
  doc.text(title, 14, 15);

  doc.autoTable({
    head: headers,
    body: body,
    startY: 25,
    theme: 'grid',
    headStyles: {
      fillColor: '#020617', // Corresponds to a dark blue/black
      textColor: '#ffffff', // White
    },
  });

  doc.save(`${title.replace(/ /g, '_')}.pdf`);
}
