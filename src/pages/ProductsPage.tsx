"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { Tables } from '@/types/supabase';
import { toast } from 'react-hot-toast';
import ProductForm from '@/components/ProductForm';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/lib/utils';
import useCompanySettings from '@/hooks/useCompanySettings';
import { Input } from '@/components/ui/input';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import useDebounce from '@/hooks/useDebounce';
import PaginationControls from '@/components/PaginationControls'; // Import the new component

const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const { company, loading: companySettingsLoading, error: companySettingsError } = useCompanySettings();
  const [products, setProducts] = useState<Tables<'products'>[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Tables<'products'> | null>(null);

  // State for search term and debounced search term
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  const fetchProducts = useCallback(async () => {
    if (!company?.id) {
      setLoadingProducts(false);
      return;
    }

    setLoadingProducts(true);
    try {
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from('products')
        .select('*', { count: 'exact' })
        .eq('company_id', company.id);

      // Apply debounced search term
      if (debouncedSearchTerm) {
        query = query.or(`name.ilike.%${debouncedSearchTerm}%,description.ilike.%${debouncedSearchTerm}%`);
      }

      query = query.order('name', { ascending: true })
                   .range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;
      setProducts(data || []);
      setTotalCount(count || 0);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      toast.error(error.message || 'Failed to fetch products.');
    } finally {
      setLoadingProducts(false);
    }
  }, [company, debouncedSearchTerm, currentPage, itemsPerPage]);

  useEffect(() => {
    if (!companySettingsLoading && company) {
      // Reset page to 1 when search term changes
      if (currentPage !== 1 && debouncedSearchTerm !== searchTerm) {
        setCurrentPage(1);
      } else {
        fetchProducts();
      }
    } else if (!companySettingsLoading && companySettingsError) {
      toast.error(companySettingsError);
      setLoadingProducts(false);
    }
  }, [company, companySettingsLoading, companySettingsError, fetchProducts, debouncedSearchTerm, searchTerm, currentPage]);

  const handleSaveProduct = (newProduct: Tables<'products'>) => {
    fetchProducts();
    setEditingProduct(null);
    setIsFormOpen(false);
  };

  const handleEditProduct = (product: Tables<'products'>) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDeleteProduct = async (productId: string) => {
    setLoadingProducts(true);
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;
      toast.success('Product deleted successfully!');
      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      toast.error(error.message || 'Failed to delete product.');
      setLoadingProducts(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  if (companySettingsLoading || loadingProducts) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p>Loading products...</p>
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
        <h1 className="text-3xl font-bold">Products</h1>
        <Button onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Search Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Products</CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 && !loadingProducts ? (
            <p className="text-muted-foreground text-center py-8">No products found. Add your first product!</p>
          ) : (
            <>
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
                        <ConfirmDeleteDialog
                          onConfirm={() => handleDeleteProduct(product.id)}
                          description="This action cannot be undone. This will permanently delete the product."
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
                disabled={loadingProducts}
              />
            </>
          )}
        </CardContent>
      </Card>

      <ProductForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveProduct}
        initialData={editingProduct}
        companyId={company.id}
      />
    </div>
  );
};

export default ProductsPage;