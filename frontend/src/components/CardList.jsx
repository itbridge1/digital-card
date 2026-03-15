import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cardAPI } from '../services/api';

export default function CardList({ tenantId, onEdit, refreshTrigger }) {
  const navigate = useNavigate();
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
    return <div className="text-center py-8 text-gray-600">Loading cards...</div>;
  }

  if (error) {
    return <div className="p-4 mb-4 bg-red-100 text-red-800 border border-red-200 rounded-md">{error}</div>;
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600">
        <h3 className="text-xl mb-4 text-gray-400">No cards registered yet</h3>
        <p>Click "Register New Card" to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse mt-4">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-4 text-left border-b border-gray-200 font-semibold text-gray-600 uppercase text-xs">Tag ID</th>
            <th className="p-4 text-left border-b border-gray-200 font-semibold text-gray-600 uppercase text-xs">Name</th>
            <th className="p-4 text-left border-b border-gray-200 font-semibold text-gray-600 uppercase text-xs">Title</th>
            <th className="p-4 text-left border-b border-gray-200 font-semibold text-gray-600 uppercase text-xs">Tap Count</th>
            <th className="p-4 text-left border-b border-gray-200 font-semibold text-gray-600 uppercase text-xs">Status</th>
            <th className="p-4 text-left border-b border-gray-200 font-semibold text-gray-600 uppercase text-xs">Short URL</th>
            <th className="p-4 text-left border-b border-gray-200 font-semibold text-gray-600 uppercase text-xs">Actions</th>
          </tr>
        </thead>
        <tbody>
          {cards.map((card) => (
            <tr key={card._id} className="hover:bg-gray-50">
              <td className="p-4 border-b border-gray-200">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">{card.tagId}</span>
              </td>
              <td className="p-4 border-b border-gray-200">{card.metadata?.name || '-'}</td>
              <td className="p-4 border-b border-gray-200">{card.metadata?.title || '-'}</td>
              <td className="p-4 border-b border-gray-200">{card.tapCount}</td>
              <td className="p-4 border-b border-gray-200">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${card.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {card.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="p-4 border-b border-gray-200">
                <button
                  className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md text-sm hover:bg-gray-200"
                  onClick={() => copyToClipboard(`http://localhost:5000/t/${card.tagId}`)}
                  title="Copy short URL"
                >
                  Copy URL
                </button>
              </td>
              <td className="p-4 border-b border-gray-200">
                <button
                  className="px-4 py-2 bg-linear-to-r from-purple-600 to-purple-800 text-white rounded-md text-sm mr-2 hover:-translate-y-0.5 hover:shadow-md transition-all"
                  onClick={() => navigate(`/card/${encodeURIComponent(card.tagId)}?tenantId=${tenantId}`)}
                >
                  View
                </button>
                <button
                  className="px-4 py-2 bg-linear-to-r from-purple-600 to-purple-800 text-white rounded-md text-sm mr-2 hover:-translate-y-0.5 hover:shadow-md transition-all"
                  onClick={() => onEdit(card)}
                >
                  Edit
                </button>
                <button
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
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
