"use client";

import React, { RefObject } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { Printer } from 'lucide-react';

interface InvoicePdfGeneratorProps {
  invoiceContentRef: RefObject<HTMLDivElement>; // Now accepts a ref to the content
  invoiceNumber: string | null;
  invoiceId: string;
}

const InvoicePdfGenerator: React.FC<InvoicePdfGeneratorProps> = ({ invoiceContentRef, invoiceNumber, invoiceId }) => {
  const generatePdf = async () => {
    if (!invoiceContentRef.current) {
      toast.error('Could not find invoice content to print.');
      return;
    }

    toast.loading('Generating PDF...', { id: 'pdf-gen' });

    try {
      const canvas = await html2canvas(invoiceContentRef.current, {
        scale: 2, // Increase scale for better quality
        useCORS: true, // Enable CORS for images if any
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`invoice-${invoiceNumber || invoiceId.substring(0, 8)}.pdf`);
      toast.success('PDF generated successfully!', { id: 'pdf-gen' });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error(`Failed to generate PDF: ${error.message}`, { id: 'pdf-gen' });
    }
  };

  return (
    <Button onClick={generatePdf}>
      <Printer className="mr-2 h-4 w-4" /> Print Invoice
    </Button>
  );
};

export default InvoicePdfGenerator;