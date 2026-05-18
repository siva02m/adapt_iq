import { useState } from 'react'
import client from '../../api/client'

export default function Overview({ course, setCourse }) {
  const [form, setForm] = useState({ ...course })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await client.put(`/api/courses/${course.id}`, form)
      setCourse(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { alert('Save failed') } finally { setSaving(false) }
  }

  const field = (key, label, type = 'text', hint) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {type === 'textarea'
        ? <textarea className="form-textarea" value={form[key] || ''} rows={4}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
        : <input className="form-input" type={type} value={form[key] || ''}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
      }
      {hint && <span className="form-hint">{hint}</span>}
    </div>
  )

  return (
    <div className="card animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Course Overview</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Core metadata visible to learners</p>
        </div>
        <button id="save-overview-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saved ? '✓ Saved' : saving ? 'Saving…' : '💾 Save Changes'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {field('title', 'Course Title', 'text')}
        {field('description', 'Description', 'textarea', 'A brief overview shown on the course card')}
        {field('wiifm', "What's In It For Me (WIIFM)", 'textarea', 'Motivational hook for learners — why should they care?')}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status || 'DRAFT'}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Language</label>
            <select className="form-select" value={form.language || 'en'}
              onChange={e => setForm(f => ({ ...f, language: e.target.value }))}>
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ar">Arabic</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Version</label>
            <input className="form-input" value={form.version || '1.0'}
              onChange={e => setForm(f => ({ ...f, version: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Duration (minutes)</label>
            <input className="form-input" type="number" min="1"
              value={form.estimatedDurationMinutes || ''}
              onChange={e => setForm(f => ({ ...f, estimatedDurationMinutes: parseInt(e.target.value) || null }))} />
          </div>
        </div>

        {field('thumbnailUrl', 'Thumbnail URL', 'url', 'Paste an image URL for the course card thumbnail')}
      </div>
    </div>
  )
}
