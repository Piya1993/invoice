"use client";

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import Index from '@/pages/Index'; // Assuming this is your default landing page
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          {/* Add other routes here as we build them */}
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;