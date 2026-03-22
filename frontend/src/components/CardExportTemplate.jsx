/**
 * CardExportTemplate - renders a business card layout for html2canvas capture.
 * Uses only inline styles to ensure html2canvas compatibility.
 */
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

function CardExportTemplate({ card, organization }) {
  const meta = card.metadata || {};
  const profileSrc = card.profileImageUrl
    ? `${API_BASE}${card.profileImageUrl}`
    : null;
  const logoSrc = organization?.logoUrl
    ? `${API_BASE}${organization.logoUrl}`
    : null;

  return (
    <div
      style={{
        width: '400px',
        height: '240px',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '20px 24px',
        fontFamily: 'Arial, sans-serif',
        color: '#fff',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top row: logo + org name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {logoSrc && (
          <img
            src={logoSrc}
            alt="logo"
            crossOrigin="anonymous"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '6px',
              objectFit: 'cover',
              background: '#fff',
            }}
          />
        )}
        <span
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#e0e7ff',
            letterSpacing: '0.5px',
          }}
        >
          {organization?.name || ''}
        </span>
      </div>

      {/* Middle row: profile photo + name + details */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {profileSrc ? (
          <img
            src={profileSrc}
            alt="profile"
            crossOrigin="anonymous"
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid rgba(255,255,255,0.4)',
            }}
          />
        ) : (
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: '#fff',
              border: '2px solid rgba(255,255,255,0.3)',
            }}
          >
            {(meta.name || '?')[0].toUpperCase()}
          </div>
        )}
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '2px' }}>
            {meta.name || 'No Name'}
          </div>
          {meta.position && (
            <div style={{ fontSize: '12px', color: '#93c5fd', marginBottom: '4px' }}>
              {meta.position}
            </div>
          )}
          {meta.department && (
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
              {meta.department}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: contact info + tag ID */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderTop: '1px solid rgba(255,255,255,0.15)',
          paddingTop: '10px',
        }}
      >
        <div>
          {meta.email && (
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', marginBottom: '2px' }}>
              {meta.email}
            </div>
          )}
          {meta.phone && (
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)' }}>
              {meta.phone}
            </div>
          )}
        </div>
        <div
          style={{
            fontSize: '9px',
            color: 'rgba(255,255,255,0.35)',
            fontFamily: 'monospace',
          }}
        >
          {card.tagId}
        </div>
      </div>
    </div>
  );
}

export default CardExportTemplate;
