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
import { toSmallestUnit, fromSmallestUnit } from '@/lib/utils';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: TablesInsert<'products'> | TablesUpdate<'products'>) => void;
  initialData?: TablesUpdate<'products'> | null;
}

const ProductForm: React.FC<ProductFormProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const { user } = useAuth();
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [unit, setUnit] = useState(initialData?.unit || '');
  const [defaultPrice, setDefaultPrice] = useState(initialData ? fromSmallestUnit(initialData.default_price).toString() : '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setUnit(initialData.unit || '');
      setDefaultPrice(fromSmallestUnit(initialData.default_price).toString());
    } else {
      setName('');
      setDescription('');
      setUnit('');
      setDefaultPrice('');
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
      const productData: TablesInsert<'products'> = {
        name,
        description: description || null,
        unit: unit || null,
        default_price: toSmallestUnit(defaultPrice),
        company_id: '', // Will be set by RLS policy or server function
      };

      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('created_by', user.id)
        .single();

      if (companyError || !companyData) {
        throw new Error('Could not find company for the current user. Please ensure your company is set up.');
      }

      productData.company_id = companyData.id;

      if (initialData?.id) {
        // Update existing product
        const { data, error } = await supabase
          .from('products')
          .update(productData as TablesUpdate<'products'>)
          .eq('id', initialData.id)
          .select()
          .single();

        if (error) throw error;
        onSave(data);
        toast.success('Product updated successfully!');
      } else {
        // Create new product
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (error) throw error;
        onSave(data);
        toast.success('Product added successfully!');
      }
      onClose();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast.error(error.message || 'Failed to save product.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Product' : 'Add New Product'}</DialogTitle>
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
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="unit" className="text-right">
              Unit
            </Label>
            <Input
              id="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="col-span-3"
              placeholder="e.g., pcs, hours, kg"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="defaultPrice" className="text-right">
              Default Price
            </Label>
            <Input
              id="defaultPrice"
              type="number"
              step="0.01"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(e.target.value)}
              className="col-span-3"
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductForm;