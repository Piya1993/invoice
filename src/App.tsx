"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import Index from '@/pages/Index';
import InvoicesPage from '@/pages/InvoicesPage';
import ClientsPage from '@/pages/ClientsPage';
import ProductsPage from '@/pages/ProductsPage';
import ReportsPage from '@/pages/ReportsPage';
import SettingsPage from '@/pages/SettingsPage';
import InvoiceDetailsPage from '@/pages/InvoiceDetailsPage';
import CompanySetupPage from '@/pages/CompanySetupPage';
import ProfilePage from '@/pages/ProfilePage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import UpdatePasswordPage from '@/pages/UpdatePasswordPage'; // Import the new page
import Layout from '@/components/Layout';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} /> {/* New route for password updates */}
          {/* Protected routes using the Layout component */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailsPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/setup-company" element={<CompanySetupPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          {/* Add other routes here as we build them */}
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;