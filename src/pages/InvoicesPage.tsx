"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Eye, Search } from 'lucide-react'; // Import Search icon
import { supabase } from '@/lib/supabase/client';
import { Tables, Enums } from '@/types/supabase'; // Import Enums for invoice_status
import { toast } from 'react-hot-toast';
import InvoiceForm from '@/components/InvoiceForm';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import useCompany from '@/hooks/useCompany';
import { Input } from '@/components/ui/input'; // Import Input for search
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // Import Select for filter

// Extend Invoice type to include related client and invoice_items
type InvoiceWithDetails = Tables<'invoices'> & {
  clients: Tables<'clients'>;
  invoice_items: Tables<'invoice_items'>[];
};

const InvoicesPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { company, loading: companyLoading, error: companyError } = useCompany();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceWithDetails | null>(null);

  // State for search and filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<Enums<'invoice_status'> | 'all'>('all');

  const invoiceStatuses: (Enums<'invoice_status'> | 'all')[] = ['all', 'draft', 'sent', 'paid', 'overdue', 'void'];

  const fetchInvoices = useCallback(async () => {
    if (!company?.id) {
      setLoadingInvoices(false);
      return;
    }

    setLoadingInvoices(true);
    try {
      let query = supabase
        .from('invoices')
        .select('*, clients(*), invoice_items(*)')
        .eq('company_id', company.id);

      // Apply search term
      if (searchTerm) {
        query = query.or(`number.ilike.%${searchTerm}%,clients.name.ilike.%${searchTerm}%`);
      }

      // Apply status filter
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      query = query.order('issue_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      toast.error(error.message || 'Failed to fetch invoices.');
    } finally {
      setLoadingInvoices(false);
    }
  }, [company, searchTerm, filterStatus]); // Add searchTerm and filterStatus to dependencies

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!companyLoading && company) {
      fetchInvoices();
    } else if (!companyLoading && companyError) {
      toast.error(companyError);
      setLoadingInvoices(false);
    }
  }, [user, authLoading, company, companyLoading, companyError, navigate, fetchInvoices]);

  const handleSaveInvoice = (newInvoice: InvoiceWithDetails) => {
    if (editingInvoice) {
      setInvoices(invoices.map((invoice) => (invoice.id === newInvoice.id ? newInvoice : invoice)));
    } else {
      setInvoices([newInvoice, ...invoices]); // Add new invoice to the top
    }
    setEditingInvoice(null);
    setIsFormOpen(false);
  };

  const handleEditInvoice = (invoice: InvoiceWithDetails) => {
    setEditingInvoice(invoice);
    setIsFormOpen(true);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!window.confirm('Are you sure you want to delete this invoice? This will also delete all associated items and payments.')) return;

    const originalInvoices = [...invoices];
    setInvoices(invoices.filter((invoice) => invoice.id !== invoiceId)); // Optimistic UI

    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;
      toast.success('Invoice deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      toast.error(error.message || 'Failed to delete invoice.');
      setInvoices(originalInvoices); // Revert on error
    }
  };

  const handleViewInvoice = (invoiceId: string) => {
    navigate(`/invoices/${invoiceId}`);
  };

  if (authLoading || companyLoading || loadingInvoices) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading invoices...</p>
      </div>
    );
  }

  if (companyError || !company?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Error: {companyError || 'Company not found.'}</h2>
        <p className="text-muted-foreground mb-4">Please ensure your company is set up correctly in settings.</p>
        <Button onClick={() => navigate('/setup-company')}>Go to Company Setup</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <Button onClick={() => { setEditingInvoice(null); setIsFormOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Invoice
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filter Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number or client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as Enums<'invoice_status'> | 'all')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {invoiceStatuses.map(statusOption => (
                  <SelectItem key={statusOption} value={statusOption}>
                    {statusOption === 'all' ? 'All Statuses' : statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No invoices found. Create your first invoice!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.number || 'N/A'}</TableCell>
                    <TableCell>{invoice.clients?.name || 'Unknown Client'}</TableCell>
                    <TableCell>{format(new Date(invoice.issue_date), 'PPP')}</TableCell>
                    <TableCell>{format(new Date(invoice.due_date), 'PPP')}</TableCell>
                    <TableCell>{formatCurrency(invoice.total, invoice.currency)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        invoice.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice.id)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEditInvoice(invoice)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteInvoice(invoice.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <InvoiceForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveInvoice}
        initialData={editingInvoice}
        companyId={company.id}
      />
    </div>
  );
};

export default InvoicesPage;