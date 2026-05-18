import { useState } from 'react'
import client from '../../api/client'

export default function Settings({ course, setCourse }) {
  const [form, setForm] = useState({
    roundSize: course.roundSize ?? 5,
    isQuestionsRandomized: course.isQuestionsRandomized ?? true,
    isOptionsRandomized: course.isOptionsRandomized ?? true,
    passingScorePercent: course.passingScorePercent ?? 80,
    maxAttempts: course.maxAttempts ?? 3,
    enableLearningModules: course.enableLearningModules ?? true,
    enableFinalExam: course.enableFinalExam ?? false,
    navigationMode: course.navigationMode ?? 'PROGRESSIVE',
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

  const navModeOptions = [
    { value: 'PROGRESSIVE', label: '🔒 Progressive Unlock', hint: 'Each item unlocks only after completing the previous step.' },
    { value: 'OPEN', label: '🔓 Fully Open', hint: 'Learner can jump to any section at any time.' },
    { value: 'READ_ONLY', label: '🚫 Read Only', hint: 'Sidebar hidden — learner navigates only with Next / Previous buttons.' },
  ]

  return (
    <div className="card animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Course Settings</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Configure adaptive engine behaviour and course structure</p>
        </div>
        <button id="save-settings-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saved ? '✓ Saved' : saving ? 'Saving…' : '💾 Save'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Numeric settings */}
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
            <span className="form-hint">Required to pass final exam</span>
          </div>
          <div className="form-group">
            <label className="form-label">Max Attempts</label>
            <input className="form-input" type="number" min="1"
              value={form.maxAttempts}
              onChange={e => setForm(f => ({ ...f, maxAttempts: parseInt(e.target.value) }))} />
            <span className="form-hint">Final exam attempt limit</span>
          </div>
        </div>

        {/* Section: Course Structure */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Course Structure
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Toggle field="enableLearningModules" label="Enable Learning Modules"
              hint="Adaptive modules are unlocked based on unmastered question LOs after each round" />
            <Toggle field="enableFinalExam" label="Enable Final Exam"
              hint="A certification exam is shown after all adaptive questions are mastered" />
          </div>
        </div>

        {/* Section: Navigation Mode */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Sidebar Navigation Mode
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {navModeOptions.map(opt => (
              <div
                key={opt.value}
                onClick={() => setForm(f => ({ ...f, navigationMode: opt.value }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                  borderRadius: 10, cursor: 'pointer', border: '1px solid',
                  borderColor: form.navigationMode === opt.value ? 'var(--accent)' : 'var(--border)',
                  background: form.navigationMode === opt.value ? 'rgba(99,102,241,0.06)' : 'var(--bg-input)',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', border: '2px solid',
                  borderColor: form.navigationMode === opt.value ? 'var(--accent)' : 'var(--border)',
                  background: form.navigationMode === opt.value ? 'var(--accent)' : 'transparent',
                  flexShrink: 0, transition: 'all 0.15s'
                }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</div>
                  <div className="form-hint" style={{ marginTop: 2 }}>{opt.hint}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Randomisation */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Randomisation
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Toggle field="isQuestionsRandomized" label="Randomize Question Order"
              hint="Questions appear in random order each round" />
            <Toggle field="isOptionsRandomized" label="Randomize Answer Options"
              hint="Answer choices are shuffled each time a question appears" />
          </div>
        </div>

      </div>
    </div>
  )
}
