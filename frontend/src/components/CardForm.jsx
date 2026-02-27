import { useState } from 'react';
import { cardAPI } from '../services/api';

export default function CardForm({ onSuccess, onCancel, card = null, tenantType }) {
  const [formData, setFormData] = useState({
    tagId: card?.tagId || '',
    businessUrl: card?.businessUrl || '',
    // Common metadata
    name: card?.metadata?.name || '',
    title: card?.metadata?.title || '',
    email: card?.metadata?.email || '',
    phone: card?.metadata?.phone || '',
    // School-specific
    studentId: card?.metadata?.studentId || '',
    grade: card?.metadata?.grade || '',
    section: card?.metadata?.section || '',
    guardianName: card?.metadata?.guardianName || '',
    guardianPhone: card?.metadata?.guardianPhone || '',
    // Hospital-specific
    employeeId: card?.metadata?.employeeId || '',
    department: card?.metadata?.department || '',
    specialization: card?.metadata?.specialization || '',
    licenseNumber: card?.metadata?.licenseNumber || '',
    emergencyContact: card?.metadata?.emergencyContact || '',
    // Business-specific
    company: card?.metadata?.company || '',
    position: card?.metadata?.position || '',
    linkedIn: card?.metadata?.linkedIn || '',
    website: card?.metadata?.website || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const metadata = {
        name: formData.name,
        title: formData.title,
        email: formData.email,
        phone: formData.phone
      };

      // Add type-specific fields based on tenant type
      if (tenantType === 'SCHOOL') {
        metadata.studentId = formData.studentId;
        metadata.grade = formData.grade;
        metadata.section = formData.section;
        metadata.guardianName = formData.guardianName;
        metadata.guardianPhone = formData.guardianPhone;
      } else if (tenantType === 'HOSPITAL') {
        metadata.employeeId = formData.employeeId;
        metadata.department = formData.department;
        metadata.specialization = formData.specialization;
        metadata.licenseNumber = formData.licenseNumber;
        metadata.emergencyContact = formData.emergencyContact;
      } else if (tenantType === 'BUSINESS') {
        metadata.company = formData.company;
        metadata.position = formData.position;
        metadata.linkedIn = formData.linkedIn;
        metadata.website = formData.website;
      }

      if (card) {
        // Update existing card
        await cardAPI.update(card.tagId, {
          businessUrl: formData.businessUrl,
          metadata
        });
      } else {
        // Create new card
        await cardAPI.create({
          tagId: formData.tagId,
          businessUrl: formData.businessUrl,
          metadata
        });
      }

      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      {error && <div className="message message-error">{error}</div>}

      <div className="form-row">
        <div className="form-group">
          <label>Tag ID (NFC UID) *</label>
          <input
            type="text"
            name="tagId"
            value={formData.tagId}
            onChange={handleChange}
            required
            disabled={!!card}
            placeholder="e.g., A1B2C3D4"
          />
        </div>

        <div className="form-group">
          <label>Business URL *</label>
          <input
            type="url"
            name="businessUrl"
            value={formData.businessUrl}
            onChange={handleChange}
            required
            placeholder="https://example.com/profile"
          />
        </div>
      </div>

      <h3>Common Information</h3>
      <div className="form-row">
        <div className="form-group">
          <label>Full Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="John Doe"
          />
        </div>

        <div className="form-group">
          <label>Title/Role</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., Doctor, Teacher, Manager"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="email@example.com"
          />
        </div>

        <div className="form-group">
          <label>Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+1234567890"
          />
        </div>
      </div>

      {/* School-specific fields */}
      {tenantType === 'SCHOOL' && (
        <>
          <h3>School Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Student/Staff ID</label>
              <input
                type="text"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Grade/Class</label>
              <input
                type="text"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Section</label>
              <input
                type="text"
                name="section"
                value={formData.section}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Guardian Name</label>
              <input
                type="text"
                name="guardianName"
                value={formData.guardianName}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Guardian Phone</label>
              <input
                type="tel"
                name="guardianPhone"
                value={formData.guardianPhone}
                onChange={handleChange}
              />
            </div>
          </div>
        </>
      )}

      {/* Hospital-specific fields */}
      {tenantType === 'HOSPITAL' && (
        <>
          <h3>Hospital Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Employee ID</label>
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Department</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="e.g., Cardiology"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Specialization</label>
              <input
                type="text"
                name="specialization"
                value={formData.specialization}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>License Number</label>
              <input
                type="text"
                name="licenseNumber"
                value={formData.licenseNumber}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Emergency Contact</label>
            <input
              type="text"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleChange}
            />
          </div>
        </>
      )}

      {/* Business-specific fields */}
      {tenantType === 'BUSINESS' && (
        <>
          <h3>Business Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Company</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Position</label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>LinkedIn URL</label>
              <input
                type="url"
                name="linkedIn"
                value={formData.linkedIn}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div className="form-group">
              <label>Website</label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://example.com"
              />
            </div>
          </div>
        </>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Saving...' : card ? 'Update Card' : 'Register Card'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
