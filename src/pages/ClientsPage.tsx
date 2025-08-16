"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Search, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'; // Added ArrowUpDown
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { toast } from 'react-hot-toast';
import ClientForm from '@/components/ClientForm';
import { useAuth } from '@/context/AuthContext';
import useCompanySettings from '@/hooks/useCompanySettings';
import { Input } from '@/components/ui/input';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import useDebounce from '@/hooks/useDebounce';
import PaginationControls from '@/components/PaginationControls';

const ClientsPage: React.FC = () => {
  const { user } = useAuth();
  const { company, loading: companySettingsLoading, error: companySettingsError } = useCompanySettings();
  const [clients, setClients] = useState<Tables<'clients'>[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Tables<'clients'> | null>(null);

  // State for search term and debounced search term
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // State for sorting
  const [sortColumn, setSortColumn] = useState<keyof Tables<'clients'>>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const fetchClients = useCallback(async () => {
    if (!company?.id) {
      setLoadingClients(false);
      return;
    }

    setLoadingClients(true);
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .eq('company_id', company.id);

      // Apply debounced search term
      if (debouncedSearchTerm) {
        query = query.or(`name.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%,phone.ilike.%${debouncedSearchTerm}%`);
      }

      // Apply sorting
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' })
                   .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      setClients(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast.error(error.message || 'Failed to fetch clients.');
    } finally {
      setLoadingClients(false);
    }
  }, [company, debouncedSearchTerm, currentPage, itemsPerPage, sortColumn, sortDirection]);

  useEffect(() => {
    if (!companySettingsLoading && company) {
      // Reset page to 1 when search term or sort changes
      if (currentPage !== 1 && (debouncedSearchTerm !== searchTerm || sortColumn !== 'name' || sortDirection !== 'asc')) {
        setCurrentPage(1);
      } else {
        fetchClients();
      }
    } else if (!companySettingsLoading && companySettingsError) {
      toast.error(companySettingsError);
      setLoadingClients(false);
    }
  }, [company, companySettingsLoading, companySettingsError, fetchClients, debouncedSearchTerm, searchTerm, currentPage, sortColumn, sortDirection]);

  const handleSaveClient = (newClient: Tables<'clients'>) => {
    fetchClients();
    setEditingClient(null);
    setIsFormOpen(false);
  };

  const handleEditClient = (client: Tables<'clients'>) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    setLoadingClients(true);
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      toast.success('Client deleted successfully!');
      fetchClients();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast.error(error.message || 'Failed to delete client.');
      setLoadingClients(false);
    }
  };

  const handleSort = (column: keyof Tables<'clients'>) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page on new sort
  };

  const renderSortIcon = (column: keyof Tables<'clients'>) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? (
        <ArrowUpDown className="ml-2 h-4 w-4 rotate-180" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      );
    }
    return <ArrowUpDown className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />;
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  if (companySettingsLoading || loadingClients) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading clients...</p>
      </div>
    );
  }

  if (companySettingsError || !company?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Error: {companySettingsError || 'Company not found.'}</h2>
        <p className="text-muted-foreground mb-4">Please ensure your company is set up correctly in settings.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Clients</h1>
        <Button onClick={() => { setEditingClient(null); setIsFormOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Client
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Clients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 && !loadingClients ? (
            <p className="text-muted-foreground text-center py-8">No clients found. Add your first client!</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:text-primary group" onClick={() => handleSort('name')}>
                      <div className="flex items-center">
                        Name {renderSortIcon('name')}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-primary group" onClick={() => handleSort('email')}>
                      <div className="flex items-center">
                        Email {renderSortIcon('email')}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:text-primary group" onClick={() => handleSort('phone')}>
                      <div className="flex items-center">
                        Phone {renderSortIcon('phone')}
                      </div>
                    </TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell>{client.address}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditClient(client)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <ConfirmDeleteDialog
                          onConfirm={() => handleDeleteClient(client.id)}
                          description="This action cannot be undone. This will permanently delete the client."
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPreviousPage={handlePreviousPage}
                onNextPage={handleNextPage}
                disabled={loadingClients}
              />
            </>
          )}
        </CardContent>
      </Card>

      <ClientForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveClient}
        initialData={editingClient}
        companyId={company.id}
      />
    </div>
  );
};

export default ClientsPage;