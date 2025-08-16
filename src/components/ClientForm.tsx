"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { TablesInsert, TablesUpdate } from '@/types/supabase';
import { useAuth } from '@/context/AuthContext';

interface ClientFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: TablesInsert<'clients'> | TablesUpdate<'clients'>) => void;
  initialData?: TablesUpdate<'clients'> | null;
}

const ClientForm: React.FC<ClientFormProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const { user } = useAuth();
  const [name, setName] = useState(initialData?.name || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setEmail(initialData.email || '');
      setPhone(initialData.phone || '');
      setAddress(initialData.address || '');
      setNotes(initialData.notes || '');
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setNotes('');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('User not authenticated.');
      return;
    }

    setLoading(true);
    try {
      const clientData: TablesInsert<'clients'> = {
        name,
        email: email || null,
        phone: phone || null,
        address: address || null,
        notes: notes || null,
        company_id: '', // This will be set by RLS policy or a server function later
      };

      // For now, we'll fetch the company_id directly.
      // In a more robust setup, this might be handled by a server function or a user's context.
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('created_by', user.id)
        .single();

      if (companyError || !companyData) {
        throw new Error('Could not find company for the current user. Please ensure your company is set up.');
      }

      clientData.company_id = companyData.id;

      if (initialData?.id) {
        // Update existing client
        const { data, error } = await supabase
          .from('clients')
          .update(clientData as TablesUpdate<'clients'>)
          .eq('id', initialData.id)
          .select()
          .single();

        if (error) throw error;
        onSave(data);
        toast.success('Client updated successfully!');
      } else {
        // Create new client
        const { data, error } = await supabase
          .from('clients')
          .insert(clientData)
          .select()
          .single();

        if (error) throw error;
        onSave(data);
        toast.success('Client added successfully!');
      }
      onClose();
    } catch (error: any) {
      console.error('Error saving client:', error);
      toast.error(error.message || 'Failed to save client.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Client' : 'Add New Client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">
              Phone
            </Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right">
              Address
            </Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientForm;