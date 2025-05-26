import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BaseLayout from './layouts/BaseLayout';
import HolderVerification from './components/flows/HolderVerification';
import VerifierVerification from './components/flows/VerifierVerification';
import TRQPVerification from './components/flows/TRQPVerification';
import HomePage from './components/HomePage';

function App() {
  return (
    <Router>
      <BaseLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/holder" element={<HolderVerification />} />
          <Route path="/verifier" element={<VerifierVerification />} />
          <Route path="/trqp" element={<TRQPVerification />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BaseLayout>
    </Router>
  );
}

export default App;
