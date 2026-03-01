import { useState, useEffect } from 'react';
import CardList from './components/CardList';
import CardForm from './components/CardForm';
import { tenantAPI, cardAPI } from './services/api';
import './App.css';

function App() {
  const [tenants, setTenants] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0, totalTaps: 0 });

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    if (selectedTenant) {
      fetchStats();
    }
  }, [selectedTenant, refreshTrigger]);

  const fetchTenants = async () => {
    try {
      const response = await tenantAPI.getAll();
      setTenants(response.data.data);
      
      // Auto-select first tenant
      if (response.data.data.length > 0) {
        setSelectedTenant(response.data.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await cardAPI.getAll(selectedTenant.tenantId);
      const cards = response.data.data;
      setStats({
        total: cards.length,
        active: cards.filter(c => c.isActive).length,
        totalTaps: cards.reduce((sum, card) => sum + card.tapCount, 0)
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleTenantChange = (e) => {
    const tenant = tenants.find(t => t.tenantId === e.target.value);
    setSelectedTenant(tenant);
    setRefreshTrigger(prev => prev + 1); // Trigger cards refresh
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingCard(null);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEdit = (card) => {
    setEditingCard(card);
    setShowForm(true);
  };

  const handleNewCard = () => {
    setEditingCard(null);
    setShowForm(true);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>IT Bridge NFC</h1>
        <div className="tenant-selector">
          <label>Tenant:</label>
          <select 
            value={selectedTenant?.tenantId || ''} 
            onChange={handleTenantChange}
          >
            <option value="">Select Tenant</option>
            {tenants.map(tenant => (
              <option key={tenant.tenantId} value={tenant.tenantId}>
                {tenant.name} ({tenant.type})
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="container">
        {!selectedTenant ? (
          <div className="empty-state">
            <h3>No Tenant Selected</h3>
            <p>Please select a tenant from the dropdown above</p>
          </div>
        ) : (
          <div className="dashboard">
            {/* Stats */}
            <div className="stats">
              <div className="stat-card">
                <h3>Total Cards</h3>
                <div className="value">{stats.total}</div>
              </div>
              <div className="stat-card">
                <h3>Active Cards</h3>
                <div className="value">{stats.active}</div>
              </div>
              <div className="stat-card">
                <h3>Total Taps</h3>
                <div className="value">{stats.totalTaps}</div>
              </div>
            </div>

            {/* Cards Section */}
            <div className="cards-section">
              <div className="section-header">
                <h2>Registered Cards</h2>
                <button className="btn btn-primary" onClick={handleNewCard}>
                  + Register New Card
                </button>
              </div>

              <CardList 
                tenantId={selectedTenant.tenantId}
                onEdit={handleEdit} 
                refreshTrigger={refreshTrigger}
              />
            </div>
          </div>
        )}
      </div>

      {/* Modal for Card Form */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCard ? 'Edit Card' : 'Register New Card'}</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>
                ×
              </button>
            </div>
            <CardForm
              card={editingCard}
              tenantId={selectedTenant.tenantId}
              tenantType={selectedTenant?.type}
              onSuccess={handleFormSuccess}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
