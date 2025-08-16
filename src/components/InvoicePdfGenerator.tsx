"use client";

import React, { useRef } from 'react';
import html2canvas from 'html22canvas';
import jsPDF from 'jspdf';
import { Button } from '@/components/ui/button';
import { Tables } from '@/types/supabase';
import { formatCurrency, fromSmallestUnit } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

// Extend Invoice type to include related client and invoice_items
type InvoiceWithDetails = Tables<'invoices'> & {
  clients: Tables<'clients'>;
  invoice_items: Tables<'invoice_items'>[];
};

interface InvoicePdfGeneratorProps {
  invoice: InvoiceWithDetails;
}

const InvoicePdfGenerator: React.FC<InvoicePdfGeneratorProps> = ({ invoice }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  const generatePdf = async () => {
    if (!invoiceRef.current) {
      toast.error('Could not find invoice content to print.');
      return;
    }

    toast.loading('Generating PDF...', { id: 'pdf-gen' });

    try {
      const canvas = await html2canvas(invoiceRef.current, {
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

      pdf.save(`invoice-${invoice.number || invoice.id.substring(0, 8)}.pdf`);
      toast.success('PDF generated successfully!', { id: 'pdf-gen' });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error(`Failed to generate PDF: ${error.message}`, { id: 'pdf-gen' });
    }
  };

  return (
    <>
      <Button onClick={generatePdf}>
        <Printer className="mr-2 h-4 w-4" /> Print Invoice
      </Button>

      {/* Hidden content for PDF generation */}
      <div ref={invoiceRef} className="p-8 bg-white text-black hidden print:block" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto' }}>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">INVOICE</h1>
            <p className="text-sm">Invoice #{invoice.number || invoice.id.substring(0, 8)}</p>
            <p className="text-sm">Issue Date: {format(new Date(invoice.issue_date), 'PPP')}</p>
            <p className="text-sm">Due Date: {format(new Date(invoice.due_date), 'PPP')}</p>
          </div>
          <div className="text-right">
            {/* You might want to fetch and display your company's logo and details here */}
            <h2 className="text-xl font-semibold">{invoice.clients?.companies?.name || 'Your Company Name'}</h2>
            <p className="text-sm">{invoice.clients?.companies?.address || 'Your Company Address'}</p>
            <p className="text-sm">{invoice.clients?.companies?.phone || 'Your Company Phone'}</p>
            <p className="text-sm">{invoice.clients?.companies?.email || 'Your Company Email'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-2">Bill To:</h3>
            <p className="font-medium">{invoice.clients?.name}</p>
            <p className="text-sm">{invoice.clients?.address}</p>
            <p className="text-sm">{invoice.clients?.email}</p>
            <p className="text-sm">{invoice.clients?.phone}</p>
          </div>
          <div className="text-right">
            <h3 className="text-lg font-semibold mb-2">Invoice Summary:</h3>
            <p>Status: <span className={`font-semibold ${
                invoice.status === 'paid' ? 'text-green-600' :
                invoice.status === 'overdue' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </p>
            <p>Currency: {invoice.currency}</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-2">Items:</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200">
                <th className="py-2 px-4 text-left text-sm font-medium">Title</th>
                <th className="py-2 px-4 text-left text-sm font-medium">Qty</th>
                <th className="py-2 px-4 text-right text-sm font-medium">Unit Price</th>
                <th className="py-2 px-4 text-right text-sm font-medium">Tax Rate</th>
                <th className="py-2 px-4 text-right text-sm font-medium">Discount</th>
                <th className="py-2 px-4 text-right text-sm font-medium">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.invoice_items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2 px-4 text-sm">{item.title}</td>
                  <td className="py-2 px-4 text-sm">{item.qty}</td>
                  <td className="py-2 px-4 text-right text-sm">{formatCurrency(item.unit_price, invoice.currency)}</td>
                  <td className="py-2 px-4 text-right text-sm">{item.tax_rate}%</td>
                  <td className="py-2 px-4 text-right text-sm">{formatCurrency(item.discount, invoice.currency)}</td>
                  <td className="py-2 px-4 text-right text-sm">
                    {formatCurrency(
                      (fromSmallestUnit(item.qty * item.unit_price) * (1 + item.tax_rate / 100)) - fromSmallestUnit(item.discount),
                      invoice.currency
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mb-8">
          <div className="w-full max-w-xs">
            <div className="flex justify-between py-1 text-sm">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span>Tax Total:</span>
              <span className="font-semibold">{formatCurrency(invoice.tax_total, invoice.currency)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm">
              <span>Discount Total:</span>
              <span className="font-semibold">{formatCurrency(invoice.discount_total, invoice.currency)}</span>
            </div>
            <div className="flex justify-between py-2 border-t border-gray-200 mt-2 text-lg font-bold">
              <span>TOTAL:</span>
              <span>{formatCurrency(invoice.total, invoice.currency)}</span>
            </div>
            <div className="flex justify-between py-1 text-sm text-muted-foreground">
              <span>Amount Paid:</span>
              <span className="font-semibold">{formatCurrency(invoice.amount_paid, invoice.currency)}</span>
            </div>
            <div className="flex justify-between py-1 text-lg font-bold text-primary">
              <span>AMOUNT DUE:</span>
              <span>{formatCurrency(invoice.amount_due, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-1">Notes:</h3>
            <p className="text-sm">{invoice.notes}</p>
          </div>
        )}

        {invoice.terms && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-1">Terms & Conditions:</h3>
            <p className="text-sm">{invoice.terms}</p>
          </div>
        )}

        <div className="text-center text-xs text-gray-500 mt-8">
          Thank you for your business!
        </div>
      </div>
    </>
  );
};

export default InvoicePdfGenerator;