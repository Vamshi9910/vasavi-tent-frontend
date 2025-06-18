import React, { useState } from 'react';
import CustomerForm from './components/CustomerForm';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

function App() {
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <div className="App">
      <button 
        className="admin-toggle-btn"
        onClick={() => setShowAdmin(!showAdmin)}
      >
        {showAdmin ? 'Hide Admin' : 'Show Admin'}
      </button>
      <div className="main-content">
        <CustomerForm />
        {showAdmin && (
          <div className="admin-panel">
            <AdminDashboard />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
