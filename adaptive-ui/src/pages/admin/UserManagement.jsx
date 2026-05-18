import { useState, useEffect } from 'react'
import TopBar from '../../components/TopBar'
import client from '../../api/client'

const ROLES = ['ADMIN', 'AUTHOR', 'LEARNER']

function UserModal({ user, onClose, onSaved }) {
  const isEdit = !!user
  const [form, setForm] = useState({ fullName: user?.fullName || '', email: user?.email || '', password: '', role: user?.role || 'LEARNER' })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.email || !form.fullName) return alert('Name and email required')
    if (!isEdit && !form.password) return alert('Password required for new users')
    setSaving(true)
    try {
      if (isEdit) {
        await client.put(`/api/auth/users/${user.id}/role`, { role: form.role })
        onSaved({ ...user, role: form.role }, 'update')
      } else {
        await client.post('/api/auth/users', form)
        onSaved(null, 'create')
      }
      onClose()
    } catch (e) {
      alert(e.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? 'Edit User' : 'Create User'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!isEdit && <>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" autoFocus value={form.fullName}
                onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Jane Smith" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 8 characters" />
            </div>
          </>}
          <div className="form-group">
            <label className="form-label">Role</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {ROLES.map(r => (
                <button key={r} onClick={() => setForm(f => ({ ...f, role: r }))}
                  className={`btn btn-sm ${form.role === r ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ flex: 1 }}>
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button id="save-user-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update Role' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')

  const fetchUsers = () => client.get('/api/auth/users').then(r => setUsers(r.data)).finally(() => setLoading(false))
  useEffect(() => { fetchUsers() }, [])

  const handleSaved = (u, type) => {
    if (type === 'update') setUsers(us => us.map(x => x.id === u.id ? u : x))
    else fetchUsers()
  }

  const handleDeactivate = async (id) => {
    if (!confirm('Deactivate this user?')) return
    await client.delete(`/api/auth/users/${id}`)
    setUsers(us => us.map(u => u.id === id ? { ...u, active: false } : u))
  }

  const filtered = users.filter(u =>
    u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  const topBarActions = (
    <button id="create-user-btn" className="btn btn-primary" onClick={() => setModal('new')}>+ Create User</button>
  )

  return (
    <>
      {modal && <UserModal user={modal === 'new' ? null : modal}
        onClose={() => setModal(null)} onSaved={handleSaved} />}
      <TopBar actions={topBarActions} />
      <div className="app-content animate-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">{users.length} registered users</p>
          </div>
        </div>

        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
          {ROLES.map(role => (
            <div key={role} className="stat-card">
              <div className="stat-label">{role.charAt(0) + role.slice(1).toLowerCase()}s</div>
              <div className="stat-value">{users.filter(u => u.role === role).length}</div>
            </div>
          ))}
        </div>

        <input id="user-search" className="form-input" placeholder="🔍 Search by name or email…"
          value={search} onChange={e => setSearch(e.target.value)} style={{ marginBottom: 16, maxWidth: 400 }} />

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? <div className="loading-page"><div className="spinner" /></div> : (
            <table className="data-table">
              <thead>
                <tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                          {u.fullName?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: 600 }}>{u.fullName}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{u.email}</td>
                    <td><span className={`badge badge-${u.role?.toLowerCase()}`}>{u.role}</span></td>
                    <td>
                      <span style={{ fontSize: 12, color: u.active !== false ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                        {u.active !== false ? '● Active' : '● Inactive'}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(u)}>✏️</button>
                        {u.active !== false && (
                          <button className="btn btn-ghost btn-sm" onClick={() => handleDeactivate(u.id)}>🚫</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
