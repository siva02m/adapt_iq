import { useLocation, useNavigate } from 'react-router-dom'

export default function TopBar({ actions }) {
  const location = useLocation()
  const navigate = useNavigate()

  const crumbs = location.pathname
    .split('/')
    .filter(Boolean)
    .map((seg, i, arr) => ({
      label: seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      path: '/' + arr.slice(0, i + 1).join('/'),
      isLast: i === arr.length - 1
    }))

  return (
    <header className="topbar">
      <nav className="topbar-breadcrumb" aria-label="Breadcrumb">
        <span style={{ cursor: 'pointer', opacity: 0.6 }} onClick={() => navigate('/courses')}>🏠</span>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            {c.isLast
              ? <span className="topbar-breadcrumb-current">{c.label}</span>
              : <span style={{ cursor: 'pointer' }} onClick={() => navigate(c.path)}>{c.label}</span>
            }
          </span>
        ))}
      </nav>
      <div className="topbar-spacer" />
      {actions && <div className="topbar-actions">{actions}</div>}
    </header>
  )
}
