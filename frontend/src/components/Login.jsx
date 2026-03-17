import { useState } from 'react';
import { authAPI, tenantAPI } from '../services/api';

export default function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    tenantId: ''
  });
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load tenants for registration
  const loadTenants = async () => {
    try {
      const response = await tenantAPI.getAll();
      setTenants(response.data.data);
    } catch (err) {
      console.error('Failed to load tenants:', err);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login
        const response = await authAPI.login(formData.email, formData.password);
        const { token, ...user } = response.data.data;
        
        // Save to localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        onLoginSuccess(user, token);
      } else {
        // Register
        if (!formData.tenantId) {
          setError('Please select a tenant');
          setLoading(false);
          return;
        }
        
        const response = await authAPI.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          tenantId: formData.tenantId
        });
        
        const { token, ...user } = response.data.data;
        
        // Save to localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        onLoginSuccess(user, token);
      }
    } catch (err) {
      setError(err.response?.data?.error || `${isLogin ? 'Login' : 'Registration'} failed`);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({
      email: '',
      password: '',
      name: '',
      tenantId: ''
    });
    
    if (isLogin) {
      // Switching to register mode, load tenants
      loadTenants();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h2>🏷️ NFC Platform</h2>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          {error && <div className="message message-error">{error}</div>}

          <h3>{isLogin ? 'Login' : 'Create Account'}</h3>

          {!isLogin && (
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="John Doe"
              />
            </div>
          )}

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="your@email.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="••••••••"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>Select Organization *</label>
              <select
                name="tenantId"
                value={formData.tenantId}
                onChange={handleChange}
                required
              >
                <option value="">Select an organization...</option>
                {tenants.map(tenant => (
                  <option key={tenant.tenantId} value={tenant.tenantId}>
                    {tenant.name} ({tenant.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={switchMode}
              style={{ width: '100%' }}
            >
              {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
            </button>
          </div>

          {isLogin && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#666' }}>
              <strong>Demo Accounts (password: password123):</strong><br/>
              admin@lincoln.edu (Admin)<br/>
              sarah@citymedical.com (Manager)<br/>
              mike@techcorp.com (Viewer)
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
