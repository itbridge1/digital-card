import { useState, useEffect } from 'react';
import CardList from '../components/CardList';
import CardForm from '../components/CardForm';
import { tenantAPI, cardAPI } from '../services/api';

function Dashboard({ onLogout }) {
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
      
      // Try to restore previously selected tenant from localStorage
      const savedTenantId = localStorage.getItem('selectedTenantId');
      
      if (savedTenantId && response.data.data.length > 0) {
        const savedTenant = response.data.data.find(t => t.tenantId === savedTenantId);
        if (savedTenant) {
          setSelectedTenant(savedTenant);
        } else {
          // If saved tenant not found, auto-select first tenant
          setSelectedTenant(response.data.data[0]);
          localStorage.setItem('selectedTenantId', response.data.data[0].tenantId);
        }
      } else if (response.data.data.length > 0) {
        // No saved tenant, auto-select first tenant
        setSelectedTenant(response.data.data[0]);
        localStorage.setItem('selectedTenantId', response.data.data[0].tenantId);
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
    
    // Save to localStorage
    if (tenant) {
      localStorage.setItem('selectedTenantId', tenant.tenantId);
    }
    
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-linear-to-r from-purple-600 to-purple-800 text-white p-6 shadow-lg">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold mb-2">IT Bridge NFC</h1>
          {onLogout && (
            <button 
              onClick={onLogout}
              className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-md transition-all"
            >
              Logout
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 mt-4">
          <label className="font-medium">Tenant:</label>
          <select 
            value={selectedTenant?.tenantId || ''} 
            onChange={handleTenantChange}
            className="px-4 py-2 border-none rounded-md text-base cursor-pointer bg-white text-gray-800"
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

      <div className="max-w-7xl mx-auto p-8">
        {!selectedTenant ? (
          <div className="text-center py-12 text-gray-600">
            <h3 className="text-xl mb-4 text-gray-400">No Tenant Selected</h3>
            <p>Please select a tenant from the dropdown above</p>
          </div>
        ) : (
          <div className="grid gap-8">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-sm text-gray-600 uppercase mb-2">Total Cards</h3>
                <div className="text-4xl font-bold text-purple-600">{stats.total}</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-sm text-gray-600 uppercase mb-2">Active Cards</h3>
                <div className="text-4xl font-bold text-purple-600">{stats.active}</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-sm text-gray-600 uppercase mb-2">Total Taps</h3>
                <div className="text-4xl font-bold text-purple-600">{stats.totalTaps}</div>
              </div>
            </div>

            {/* Cards Section */}
            <div className="bg-white p-8 rounded-xl shadow-md">
              <div className="flex justify-between items-center mb-6 flex-col md:flex-row gap-4">
                <h2 className="text-2xl text-gray-800">Registered Cards</h2>
                <button className="px-6 py-3 bg-linear-to-r from-purple-600 to-purple-800 text-white rounded-md font-medium hover:-translate-y-0.5 hover:shadow-lg transition-all" onClick={handleNewCard}>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white p-8 rounded-xl max-w-2xl w-11/12 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl text-gray-800">{editingCard ? 'Edit Card' : 'Register New Card'}</h2>
              <button className="bg-transparent border-none text-2xl cursor-pointer text-gray-400 p-0 w-8 h-8 flex items-center justify-center hover:text-gray-800" onClick={() => setShowForm(false)}>
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

export default Dashboard;
