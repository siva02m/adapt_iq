import { useState, useEffect } from 'react'
import client from '../../api/client'

function LOModal({ courseId, lo, onClose, onSaved }) {
  const [form, setForm] = useState({ title: lo?.title || '', description: lo?.description || '' })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!form.title.trim()) return alert('Title is required')
    setSaving(true)
    try {
      if (lo) {
        const res = await client.put(`/api/courses/${courseId}/learning-objectives/${lo.id}`, form)
        onSaved(res.data, 'update')
      } else {
        const res = await client.post(`/api/courses/${courseId}/learning-objectives`, form)
        onSaved(res.data, 'create')
      }
      onClose()
    } catch { alert('Save failed') } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{lo ? 'Edit Learning Objective' : 'New Learning Objective'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Title</label>
            <input className="form-input" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Understand Leadership Styles" autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" rows={3} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="What should learners be able to do after completing this?" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button id="save-lo-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : lo ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function LearningObjectives({ courseId }) {
  const [los, setLos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'new' | lo object

  useEffect(() => {
    client.get(`/api/courses/${courseId}/learning-objectives`)
      .then(r => setLos(r.data))
      .finally(() => setLoading(false))
  }, [courseId])

  const handleSaved = (lo, type) => {
    if (type === 'create') setLos(l => [...l, lo])
    else setLos(l => l.map(x => x.id === lo.id ? lo : x))
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this learning objective?')) return
    await client.delete(`/api/courses/${courseId}/learning-objectives/${id}`)
    setLos(l => l.filter(x => x.id !== id))
  }

  return (
    <div className="animate-in">
      {modal && <LOModal courseId={courseId} lo={modal === 'new' ? null : modal}
        onClose={() => setModal(null)} onSaved={handleSaved} />}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Learning Objectives</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
              {los.length} objective{los.length !== 1 ? 's' : ''} defined
            </p>
          </div>
          <button id="add-lo-btn" className="btn btn-primary" onClick={() => setModal('new')}>+ Add LO</button>
        </div>

        {loading ? <div className="loading-page"><div className="spinner" /></div>
          : los.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎯</div>
              <div className="empty-state-title">No learning objectives yet</div>
              <p className="empty-state-text">Define what learners should know or be able to do after completing this course.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {los.map((lo, i) => (
                <div key={lo.id} className="card card-sm" style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{lo.title}</div>
                    {lo.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{lo.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setModal(lo)}>✏️</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(lo.id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  )
}
