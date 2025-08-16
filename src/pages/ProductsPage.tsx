"use client";

import React from 'react';

const ProductsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Products</h1>
      <p className="text-muted-foreground">Manage your products here.</p>
      {/* Product list, filters, search, new product button will go here */}
    </div>
  );
};

export default ProductsPage;