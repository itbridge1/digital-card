import { useState, useEffect } from 'react';
import { cardAPI } from '../services/api';

export default function CardList({ tenantId, onEdit, refreshTrigger }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tenantId) {
      fetchCards();
    }
  }, [tenantId, refreshTrigger]);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await cardAPI.getAll(tenantId);
      setCards(response.data.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch cards');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tagId) => {
    if (!confirm('Are you sure you want to deactivate this card?')) return;

    try {
      await cardAPI.delete(tagId, tenantId);
      fetchCards();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete card');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (loading) {
    return <div className="loading">Loading cards...</div>;
  }

  if (error) {
    return <div className="message message-error">{error}</div>;
  }

  if (cards.length === 0) {
    return (
      <div className="empty-state">
        <h3>No cards registered yet</h3>
        <p>Click "Register New Card" to get started</p>
      </div>
    );
  }

  return (
    <div className="cards-table-container">
      <table className="cards-table">
        <thead>
          <tr>
            <th>Tag ID</th>
            <th>Name</th>
            <th>Title</th>
            <th>Tap Count</th>
            <th>Status</th>
            <th>Short URL</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card._id}>
              <td>
                <span className="tag-id">{card.tagId}</span>
              </td>
              <td>{card.metadata?.name || '-'}</td>
              <td>{card.metadata?.title || '-'}</td>
              <td>{card.tapCount}</td>
              <td>
                <span className={`status-badge ${card.isActive ? 'status-active' : 'status-inactive'}`}>
                  {card.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => copyToClipboard(`http://localhost:5000/t/${card.tagId}`)}
                  title="Copy short URL"
                >
                  Copy URL
                </button>
              </td>
              <td>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => onEdit(card)}
                  style={{ marginRight: '0.5rem' }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(card.tagId)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
