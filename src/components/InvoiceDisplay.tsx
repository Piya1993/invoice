"use client";

import React, { forwardRef } from 'react';
import { Tables } from '@/types/supabase';
import { formatCurrency, fromSmallestUnit } from '@/lib/utils';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext'; // To get user email for company info

// Extend Invoice type to include related client and invoice_items
type InvoiceWithDetails = Tables<'invoices'> & {
  clients: Tables<'clients'>;
  invoice_items: Tables<'invoice_items'>[];
};

interface InvoiceDisplayProps {
  invoice: InvoiceWithDetails;
  company: Tables<'companies'>;
  settings: Tables<'settings'> | null;
}

const InvoiceDisplay = forwardRef<HTMLDivElement, InvoiceDisplayProps>(
  ({ invoice, company, settings }, ref) => {
    const { user } = useAuth(); // Get user from auth context

    return (
      <div ref={ref} className="p-8 bg-white text-black" style={{ width: '210mm', minHeight: '297mm', margin: '0 auto', boxSizing: 'border-box' }}>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary mb-2">INVOICE</h1>
            <p className="text-sm">Invoice #{invoice.number || invoice.id.substring(0, 8)}</p>
            <p className="text-sm">Issue Date: {format(new Date(invoice.issue_date), 'PPP')}</p>
            <p className="text-sm">Due Date: {format(new Date(invoice.due_date), 'PPP')}</p>
          </div>
          <div className="text-right">
            {company.logo_url && (
              <img src={company.logo_url} alt="Company Logo" className="h-16 mb-2 ml-auto" />
            )}
            <h2 className="text-xl font-semibold">{company.name}</h2>
            <p className="text-sm">{company.address || ''}</p>
            <p className="text-sm">{company.phone || ''}</p>
            <p className="text-sm">{user?.email || ''}</p> {/* Assuming company email is user's email for now */}
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
                      (new Decimal(fromSmallestUnit(item.qty)).times(fromSmallestUnit(item.unit_price)).times(new Decimal(1).plus(new Decimal(item.tax_rate || 0).dividedBy(100)))).minus(fromSmallestUnit(item.discount || 0)),
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
    );
  }
);

InvoiceDisplay.displayName = 'InvoiceDisplay';

export default InvoiceDisplay;