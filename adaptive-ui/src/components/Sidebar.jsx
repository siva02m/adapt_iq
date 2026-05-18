import { NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

const NAV = {
  ADMIN: [
    { section: 'Overview', items: [
      { to: '/courses', icon: '📚', label: 'Course Library' },
      { to: '/admin/reports', icon: '📊', label: 'Reports' },
    ]},
    { section: 'Administration', items: [
      { to: '/admin/users', icon: '👥', label: 'Users' },
    ]}
  ],
  AUTHOR: [
    { section: 'Authoring', items: [
      { to: '/courses', icon: '📚', label: 'My Courses' },
    ]}
  ],
  LEARNER: [
    { section: 'Learning', items: [
      { to: '/learn', icon: '🎓', label: 'My Courses' },
    ]}
  ]
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const sections = NAV[user?.role] || []
  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?'

  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    if (isCollapsed) document.body.classList.add('sidebar-collapsed')
    else document.body.classList.remove('sidebar-collapsed')
  }, [isCollapsed])

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <div className="sidebar-logo-icon">A</div>
          <div className="sidebar-logo-text">Adapt<span>IQ</span></div>
        </div>
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="btn-icon" style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>
          {isCollapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {sections.map(sec => (
          <div key={sec.section}>
            <div className="sidebar-section-label">{sec.section}</div>
            {sec.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
              >
                <span className="sidebar-item-icon" title={isCollapsed ? item.label : ''}>{item.icon}</span>
                <span className="sidebar-item-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={handleLogout} title="Click to sign out">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.fullName}</div>
            <div className="sidebar-user-role">{user?.role?.toLowerCase()} · Sign out</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
