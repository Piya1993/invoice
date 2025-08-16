"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { toast } from 'react-hot-toast';
import ProductForm from '@/components/ProductForm';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/utils';

const ProductsPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [products, setProducts] = useState<Tables<'products'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Tables<'products'> | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // First, get the user's company_id
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('created_by', user.id)
        .single();

      if (companyError || !companyData) {
        throw new Error('Could not find company for the current user. Please ensure your company is set up.');
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyData.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error(error.message || 'Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchProducts();
    }
  }, [user, authLoading, fetchProducts]);

  const handleSaveProduct = (newProduct: Tables<'products'>) => {
    if (editingProduct) {
      setProducts(products.map((product) => (product.id === newProduct.id ? newProduct : product)));
    } else {
      setProducts([...products, newProduct]);
    }
    setEditingProduct(null);
    setIsFormOpen(false);
  };

  const handleEditProduct = (product: Tables<'products'>) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    const originalProducts = [...products];
    setProducts(products.filter((product) => product.id !== productId)); // Optimistic UI

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      toast.success('Product deleted successfully!');
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || 'Failed to delete product.');
      setProducts(originalProducts); // Revert on error
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Products</h1>
        <Button onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Products</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No products found. Add your first product!</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Default Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.description}</TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell>{formatCurrency(product.default_price)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product.id)}>
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

      <ProductForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveProduct}
        initialData={editingProduct}
      />
    </div>
  );
};

export default ProductsPage;