import { useState } from 'react'
import client from '../../api/client'

export default function Settings({ course, setCourse }) {
  const [form, setForm] = useState({
    roundSize: course.roundSize ?? 5,
    isQuestionsRandomized: course.isQuestionsRandomized ?? true,
    isOptionsRandomized: course.isOptionsRandomized ?? true,
    passingScorePercent: course.passingScorePercent ?? 80,
    maxAttempts: course.maxAttempts ?? 3,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await client.put(`/api/courses/${course.id}`, { ...course, ...form })
      setCourse(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { alert('Save failed') } finally { setSaving(false) }
  }

  const Toggle = ({ label, hint, field }) => (
    <div className="card card-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        {hint && <div className="form-hint" style={{ marginTop: 2 }}>{hint}</div>}
      </div>
      <button
        id={`toggle-${field}`}
        style={{
          width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
          background: form[field] ? 'var(--accent)' : 'var(--border)',
          position: 'relative', transition: 'background 0.2s', flexShrink: 0
        }}
        onClick={() => setForm(f => ({ ...f, [field]: !f[field] }))}
        aria-pressed={form[field]}
      >
        <span style={{
          position: 'absolute', top: 3, left: form[field] ? 24 : 4,
          width: 20, height: 20, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
        }} />
      </button>
    </div>
  )

  return (
    <div className="card animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Course Settings</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Configure adaptive engine behaviour</p>
        </div>
        <button id="save-settings-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saved ? '✓ Saved' : saving ? 'Saving…' : '💾 Save'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Round Size</label>
            <input className="form-input" type="number" min="1" max="50"
              value={form.roundSize}
              onChange={e => setForm(f => ({ ...f, roundSize: parseInt(e.target.value) }))} />
            <span className="form-hint">Questions per adaptive round</span>
          </div>
          <div className="form-group">
            <label className="form-label">Passing Score (%)</label>
            <input className="form-input" type="number" min="1" max="100"
              value={form.passingScorePercent}
              onChange={e => setForm(f => ({ ...f, passingScorePercent: parseInt(e.target.value) }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Max Attempts</label>
            <input className="form-input" type="number" min="1"
              value={form.maxAttempts}
              onChange={e => setForm(f => ({ ...f, maxAttempts: parseInt(e.target.value) }))} />
          </div>
        </div>

        <Toggle field="isQuestionsRandomized" label="Randomize Question Order"
          hint="Questions appear in random order each round" />
        <Toggle field="isOptionsRandomized" label="Randomize Answer Options"
          hint="Answer choices are shuffled each time a question appears" />
      </div>
    </div>
  )
}
