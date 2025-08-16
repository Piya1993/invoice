"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { toast } from 'react-hot-toast';
import ClientForm from '@/components/ClientForm';
import { useAuth } from '@/context/AuthContext';
import useCompany from '@/hooks/useCompany'; // Import the new hook

const ClientsPage: React.FC = () => {
  const { user } = useAuth();
  const { company, loading: companyLoading, error: companyError } = useCompany(); // Use the new hook
  const [clients, setClients] = useState<Tables<'clients'>[]>([]);
  const [loadingClients, setLoadingClients] = useState(true); // Renamed to avoid conflict
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Tables<'clients'> | null>(null);

  const fetchClients = useCallback(async () => {
    if (!company?.id) {
      setLoadingClients(false);
      return;
    }

    setLoadingClients(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', company.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast.error(error.message || 'Failed to fetch clients.');
    } finally {
      setLoadingClients(false);
    }
  }, [company]);

  useEffect(() => {
    if (!companyLoading && company) {
      fetchClients();
    } else if (!companyLoading && companyError) {
      toast.error(companyError);
      setLoadingClients(false);
    }
  }, [company, companyLoading, companyError, fetchClients]);

  const handleSaveClient = (newClient: Tables<'clients'>) => {
    if (editingClient) {
      setClients(clients.map((client) => (client.id === newClient.id ? newClient : client)));
    } else {
      setClients([...clients, newClient]);
    }
    setEditingClient(null);
    setIsFormOpen(false);
  };

  const handleEditClient = (client: Tables<'clients'>) => {
    setEditingClient(client);
    setIsFormOpen(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!window.confirm('Are you sure you want to delete this client?')) return;

    const originalClients = [...clients];
    setClients(clients.filter((client) => client.id !== clientId)); // Optimistic UI

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;
      toast.success('Client deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast.error(error.message || 'Failed to delete client.');
      setClients(originalClients); // Revert on error
    }
  };

  if (companyLoading || loadingClients) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading clients...</p>
      </div>
    );
  }

  if (companyError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 text-center">
        <h2 className="text-xl font-semibold text-red-600 mb-4">Error: {companyError}</h2>
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

      <Card>
        <CardHeader>
          <CardTitle>Your Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No clients found. Add your first client!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
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
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteClient(client.id)}>
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

      <ClientForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveClient}
        initialData={editingClient}
      />
    </div>
  );
};

export default ClientsPage;