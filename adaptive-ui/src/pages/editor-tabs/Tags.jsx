import { useState, useEffect } from 'react'
import client from '../../api/client'

export default function Tags({ courseId }) {
  const [tags, setTags] = useState([])
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    client.get(`/api/courses/${courseId}/tags`)
      .then(r => setTags(r.data || []))
      .catch(() => setTags([]))
  }, [courseId])

  const addTag = () => {
    const val = input.trim()
    if (!val || tags.includes(val)) return
    setTags(t => [...t, val])
    setInput('')
  }

  const removeTag = tag => setTags(t => t.filter(x => x !== tag))

  const handleSave = async () => {
    setSaving(true)
    try {
      await client.put(`/api/courses/${courseId}/tags`, { tags })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch { alert('Save failed') } finally { setSaving(false) }
  }

  return (
    <div className="card animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Tags</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>Categorise this course for discovery and reporting</p>
        </div>
        <button id="save-tags-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saved ? '✓ Saved' : saving ? 'Saving…' : '💾 Save'}
        </button>
      </div>

      {/* Tag chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 48, padding: '12px', background: 'var(--bg-input)', borderRadius: 8, border: '1.5px solid var(--border)', marginBottom: 16 }}>
        {tags.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 13, alignSelf: 'center' }}>No tags yet — add some below</span>}
        {tags.map(tag => (
          <span key={tag} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--accent-light)', color: 'var(--accent)',
            padding: '4px 10px', borderRadius: 100, fontSize: 13, fontWeight: 500
          }}>
            🏷 {tag}
            <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontWeight: 700, lineHeight: 1 }}>×</button>
          </span>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 10 }}>
        <input id="tag-input" className="form-input" placeholder="Type a tag and press Enter…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
          style={{ flex: 1 }} />
        <button id="add-tag-btn" className="btn btn-secondary" onClick={addTag}>Add Tag</button>
      </div>

      <p className="form-hint" style={{ marginTop: 10 }}>
        Suggested: Compliance, Leadership, Safety, Onboarding, Technical, Soft Skills
      </p>
    </div>
  )
}
