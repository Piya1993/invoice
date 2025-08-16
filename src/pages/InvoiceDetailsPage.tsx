"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency, fromSmallestUnit } from '@/lib/utils';
import { format } from 'date-fns';
import { ArrowLeft, Edit, Printer, DollarSign, CheckCircle } from 'lucide-react';
import PaymentForm from '@/components/PaymentForm';
import InvoiceForm from '@/components/InvoiceForm';
import InvoicePdfGenerator from '@/components/InvoicePdfGenerator';
import InvoiceDisplay from '@/components/InvoiceDisplay';
import Decimal from 'decimal.js';
import useCompanySettings from '@/hooks/useCompanySettings';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog'; // Import the new component

// Extend Invoice type to include related client and invoice_items
type InvoiceWithDetails = Tables<'invoices'> & {
  clients: Tables<'clients'>;
  invoice_items: Tables<'invoice_items'>[];
  payments: Tables<'payments'>[];
};

const InvoiceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { company, settings, loading: companySettingsLoading, error: companySettingsError, refetch: refetchCompanySettings } = useCompanySettings();
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [loadingInvoiceDetails, setLoadingInvoiceDetails] = useState(true);
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);

  const invoiceDisplayRef = useRef<HTMLDivElement>(null);

  const fetchInvoiceDetails = useCallback(async () => {
    if (!user?.id || !id || !company?.id) {
      setLoadingInvoiceDetails(false);
      return;
    }

    setLoadingInvoiceDetails(true);
    try {
      // Fetch invoice details
      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients(*), invoice_items(*), payments(*)')
        .eq('id', id)
        .eq('company_id', company.id)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error('Invoice not found or you do not have permission to view it.');
        navigate('/invoices');
        return;
      }
      setInvoice(data);
    } catch (error: any) {
      console.error('Error fetching invoice details:', error);
      toast.error(error.message || 'Failed to fetch invoice details.');
      navigate('/invoices');
    } finally {
      setLoadingInvoiceDetails(false);
    }
  }, [user, id, company, navigate]);

  useEffect(() => {
    if (!authLoading && user && !companySettingsLoading) {
      if (company) {
        fetchInvoiceDetails();
      } else if (companySettingsError) {
        toast.error(companySettingsError);
        setLoadingInvoiceDetails(false);
        navigate('/setup-company');
      }
    }
  }, [user, authLoading, company, companySettingsLoading, companySettingsError, navigate, fetchInvoiceDetails]);

  const handleRecordPayment = () => {
    setIsPaymentFormOpen(true);
  };

  const handleSavePayment = (newPayment: Tables<'payments'>) => {
    fetchInvoiceDetails(); // Re-fetch invoice details to update totals and status
    setIsPaymentFormOpen(false);
  };

  const handleEditInvoice = () => {
    setIsEditFormOpen(true);
  };

  const handleSaveInvoice = (updatedInvoice: InvoiceWithDetails) => {
    fetchInvoiceDetails(); // Re-fetch invoice details to update
    setIsEditFormOpen(false);
  };

  const handleMarkAsPaid = async () => {
    if (!invoice) return;

    setLoadingInvoiceDetails(true);
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          amount_paid: invoice.total,
          amount_due: 0,
        })
        .eq('id', invoice.id)
        .select()
        .single();

      if (error) throw error;
      toast.success('Invoice marked as paid successfully!');
      fetchInvoiceDetails();
    } catch (error: any) {
      console.error('Error marking invoice as paid:', error);
      toast.error(error.message || 'Failed to mark invoice as paid.');
    } finally {
      setLoadingInvoiceDetails(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoice) return;

    setLoadingInvoiceDetails(true);
    try {
      // Delete associated payments first
      const { error: paymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('invoice_id', invoice.id);
      if (paymentsError) throw paymentsError;

      // Delete associated invoice items
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoice.id);
      if (itemsError) throw itemsError;

      // Finally, delete the invoice
      const { error: invoiceError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id);

      if (invoiceError) throw invoiceError;
      toast.success('Invoice and all associated data deleted successfully!');
      navigate('/invoices');
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      toast.error(error.message || 'Failed to delete invoice.');
    } finally {
      setLoadingInvoiceDetails(false);
    }
  };

  if (authLoading || companySettingsLoading || loadingInvoiceDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading invoice details...</p>
      </div>
    );
  }

  if (companySettingsError || !company?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Error: {companySettingsError || 'Company not found.'}</h2>
        <p className="text-muted-foreground mb-4">Please ensure your company is set up correctly in settings.</p>
        <Button onClick={() => navigate('/setup-company')}>Go to Company Setup</Button>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const isPaid = invoice.amount_due <= 0 || invoice.status === 'paid';

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
        </Button>
        <h1 className="text-3xl font-bold">Invoice #{invoice.number || invoice.id.substring(0, 8)}</h1>
        <div className="space-x-2">
          {company && settings && (
            <InvoicePdfGenerator
              invoiceContentRef={invoiceDisplayRef}
              invoiceNumber={invoice.number}
              invoiceId={invoice.id}
            />
          )}
          <Button onClick={handleEditInvoice}>
            <Edit className="mr-2 h-4 w-4" /> Edit Invoice
          </Button>
          <Button variant="secondary" onClick={handleRecordPayment} disabled={isPaid}>
            <DollarSign className="mr-2 h-4 w-4" /> Record Payment
          </Button>
          <ConfirmDeleteDialog
            onConfirm={handleMarkAsPaid}
            title="Mark Invoice as Paid?"
            description="This action will set the invoice status to 'Paid' and the amount due to zero. Are you sure you want to proceed?"
            buttonText="Mark as Paid"
            buttonVariant="success"
            buttonIcon={<CheckCircle className="mr-2 h-4 w-4" />}
            disabled={isPaid}
          />
          <ConfirmDeleteDialog
            onConfirm={handleDeleteInvoice}
            description="This action cannot be undone. This will permanently delete this invoice and all associated payments and items from your account."
            buttonText="Delete Invoice"
            buttonVariant="destructive"
            disabled={loadingInvoiceDetails}
          />
        </div>
      </div>

      {/* Invoice Display Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Invoice Preview</CardTitle>
          <CardDescription>A visual representation of your invoice.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {company && settings && (
            <InvoiceDisplay
              ref={invoiceDisplayRef}
              invoice={invoice}
              company={company}
              settings={settings}
            />
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Invoice Overview</CardTitle>
          <CardDescription>Details for invoice #{invoice.number || invoice.id.substring(0, 8)}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong>Client:</strong> {invoice.clients?.name || 'N/A'}</p>
            <p><strong>Client Email:</strong> {invoice.clients?.email || 'N/A'}</p>
            <p><strong>Client Phone:</strong> {invoice.clients?.phone || 'N/A'}</p>
            <p><strong>Client Address:</strong> {invoice.clients?.address || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Issue Date:</strong> {format(new Date(invoice.issue_date), 'PPP')}</p>
            <p><strong>Due Date:</strong> {format(new Date(invoice.due_date), 'PPP')}</p>
            <p><strong>Status:</strong> <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
              </span>
            </p>
            <p><strong>Currency:</strong> {invoice.currency}</p>
          </div>
          <div className="col-span-full">
            <p><strong>Notes:</strong> {invoice.notes || 'N/A'}</p>
            <p><strong>Terms:</strong> {invoice.terms || 'N/A'}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.invoice_items.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No items for this invoice.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Tax Rate</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.invoice_items.map((item) => {
                  const qty = new Decimal(item.qty || 0);
                  const unitPrice = new Decimal(item.unit_price || 0); // Already in smallest unit
                  const taxRate = new Decimal(item.tax_rate || 0).dividedBy(100);
                  const discount = new Decimal(item.discount || 0); // Already in smallest unit

                  const lineTotalBeforeTax = qty.times(unitPrice);
                  const lineTax = lineTotalBeforeTax.times(taxRate);
                  const lineTotal = lineTotalBeforeTax.plus(lineTax).minus(discount);

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>{item.qty}</TableCell>
                      <TableCell>{formatCurrency(item.unit_price, invoice.currency)}</TableCell>
                      <TableCell>{item.tax_rate}%</TableCell>
                      <TableCell>{formatCurrency(item.discount, invoice.currency)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(lineTotal.toNumber(), invoice.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <div className="flex justify-end mt-4 text-lg font-semibold">
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              <span>Subtotal:</span>
              <span className="text-right">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
              <span>Tax Total:</span>
              <span className="text-right">{formatCurrency(invoice.tax_total, invoice.currency)}</span>
              <span>Discount Total:</span>
              <span className="text-right">{formatCurrency(invoice.discount_total, invoice.currency)}</span>
              <Separator className="col-span-2 my-2" />
              <span className="text-xl font-bold">Total:</span>
              <span className="text-right text-xl font-bold">{formatCurrency(invoice.total, invoice.currency)}</span>
              <span className="text-muted-foreground">Amount Paid:</span>
              <span className="text-right text-muted-foreground">{formatCurrency(invoice.amount_paid, invoice.currency)}</span>
              <span className="text-xl font-bold text-primary">Amount Due:</span>
              <span className="text-right text-xl font-bold text-primary">{formatCurrency(invoice.amount_due, invoice.currency)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.payments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No payments recorded for this invoice.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{format(new Date(payment.date), 'PPP')}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.amount, invoice.currency)}</TableCell>
                    <TableCell>{payment.notes || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {invoice && company && (
        <>
          <PaymentForm
            isOpen={isPaymentFormOpen}
            onClose={() => setIsPaymentFormOpen(false)}
            onSave={handleSavePayment}
            invoiceId={invoice.id}
            invoiceCurrency={invoice.currency}
            invoiceAmountDue={invoice.amount_due}
          />
          <InvoiceForm
            isOpen={isEditFormOpen}
            onClose={() => setIsEditFormOpen(false)}
            onSave={handleSaveInvoice}
            initialData={invoice}
            companyId={company.id}
            refetchCompanySettings={refetchCompanySettings}
          />
        </>
      )}
    </div>
  );
};

export default InvoiceDetailsPage;