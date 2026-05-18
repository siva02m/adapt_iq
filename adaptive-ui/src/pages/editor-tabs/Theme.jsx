import { useState } from 'react'

const FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Poppins', 'Montserrat', 'Source Sans 3']
const DEFAULTS = { primaryColor: '#6366f1', bgColor: '#0b0d14', cardColor: '#1a2236', textColor: '#f1f5f9', fontFamily: 'Inter', borderRadius: 10, buttonStyle: 'filled' }

export default function Theme({ courseId }) {
  const stored = (() => { try { return JSON.parse(localStorage.getItem(`theme_${courseId}`)) || DEFAULTS } catch { return DEFAULTS } })()
  const [theme, setTheme] = useState(stored)
  const [saved, setSaved] = useState(false)

  const set = (k, v) => setTheme(t => ({ ...t, [k]: v }))

  const handleSave = () => {
    localStorage.setItem(`theme_${courseId}`, JSON.stringify(theme))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const ColorRow = ({ label, field }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{theme[field]}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: theme[field], border: '2px solid var(--border)' }} />
        <input type="color" value={theme[field]} onChange={e => set(field, e.target.value)}
          style={{ width: 40, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
      </div>
    </div>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }} className="animate-in">
      {/* Controls */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Theme</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Customise the learner player appearance</p>
          </div>
          <button id="save-theme-btn" className="btn btn-primary" onClick={handleSave}>
            {saved ? '✓ Saved' : '💾 Save Theme'}
          </button>
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Colours</h3>
        <ColorRow label="Primary / Accent" field="primaryColor" />
        <ColorRow label="Background" field="bgColor" />
        <ColorRow label="Card / Surface" field="cardColor" />
        <ColorRow label="Text" field="textColor" />

        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '24px 0 12px' }}>Typography</h3>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Font Family</label>
          <select className="form-select" value={theme.fontFamily} onChange={e => set('fontFamily', e.target.value)}>
            {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Shape</h3>
        <div className="form-group" style={{ marginBottom: 20 }}>
          <label className="form-label">Border Radius — {theme.borderRadius}px</label>
          <input type="range" min="0" max="24" value={theme.borderRadius}
            onChange={e => set('borderRadius', parseInt(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }} />
        </div>

        <div className="form-group">
          <label className="form-label">Button Style</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {['filled', 'outline', 'soft'].map(s => (
              <button key={s} onClick={() => set('buttonStyle', s)}
                className={`btn ${theme.buttonStyle === s ? 'btn-primary' : 'btn-ghost'} btn-sm`}
                style={{ flex: 1, textTransform: 'capitalize' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="card" style={{ position: 'sticky', top: 0, alignSelf: 'flex-start' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>Live Preview</h3>
        <div style={{ background: theme.bgColor, borderRadius: theme.borderRadius, padding: 20, fontFamily: theme.fontFamily }}>
          <div style={{ background: theme.cardColor, borderRadius: theme.borderRadius, padding: 20 }}>
            <div style={{ height: 6, background: theme.bgColor, borderRadius: 3, marginBottom: 16, overflow: 'hidden' }}>
              <div style={{ width: '60%', height: '100%', background: theme.primaryColor, borderRadius: 3 }} />
            </div>
            <p style={{ color: theme.textColor, fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
              Which statement is correct about adaptive learning?
            </p>
            {['It adjusts to each learner', 'One-size-fits-all approach'].map((opt, i) => (
              <div key={i} style={{
                padding: '10px 14px', marginBottom: 8, borderRadius: theme.borderRadius,
                border: `2px solid ${i === 0 ? theme.primaryColor : theme.bgColor}`,
                background: i === 0 ? theme.primaryColor + '22' : theme.bgColor,
                color: theme.textColor, fontSize: 13
              }}>{opt}</div>
            ))}
            <button style={{
              marginTop: 12, padding: '10px 20px', borderRadius: theme.borderRadius,
              background: theme.buttonStyle === 'outline' ? 'transparent' : theme.buttonStyle === 'soft' ? theme.primaryColor + '33' : theme.primaryColor,
              color: theme.buttonStyle === 'filled' ? '#fff' : theme.primaryColor,
              border: `2px solid ${theme.primaryColor}`,
              fontFamily: theme.fontFamily, fontWeight: 600, fontSize: 13, cursor: 'default', width: '100%'
            }}>Submit Answer</button>
          </div>
        </div>
      </div>
    </div>
  )
}
