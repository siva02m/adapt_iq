import { useState, useEffect } from 'react'
import client from '../../api/client'
import BlockEditor from '../../components/BlockEditor'

export default function LearningModules({ courseId }) {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingMod, setEditingMod] = useState(null)
  const [saving, setSaving] = useState(false)
  
  useEffect(() => {
    loadModules()
  }, [courseId])

  const loadModules = () => {
    client.get(`/api/courses/${courseId}/learning-modules`)
      .then(r => setModules(r.data))
      .finally(() => setLoading(false))
  }

  const handleSave = async (payload) => {
    setSaving(true)
    try {
      if (editingMod?.id) {
        payload.displayOrder = editingMod.displayOrder
        const res = await client.put(`/api/courses/${courseId}/learning-modules/${editingMod.id}`, payload)
        setModules(m => m.map(x => x.id === res.data.id ? res.data : x))
      } else {
        payload.displayOrder = modules.length
        const res = await client.post(`/api/courses/${courseId}/learning-modules`, payload)
        setModules(m => [...m, res.data])
      }
      setEditingMod(null)
    } catch (err) {
      alert('Failed to save module')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this module?')) return
    await client.delete(`/api/courses/${courseId}/learning-modules/${id}`)
    setModules(m => m.filter(x => x.id !== id))
  }

  const handleDuplicate = async (mod) => {
    const payload = {
      title: mod.title + ' (Copy)',
      description: mod.description,
      htmlContent: mod.htmlContent,
      displayOrder: modules.length
    }
    const res = await client.post(`/api/courses/${courseId}/learning-modules`, payload)
    setModules(m => [...m, res.data])
  }

  const handleMove = async (index, dir) => {
    if (index + dir < 0 || index + dir >= modules.length) return
    const newMods = [...modules]
    const temp = newMods[index]
    newMods[index] = newMods[index + dir]
    newMods[index + dir] = temp
    
    // Update orders immediately in UI
    const updated = newMods.map((m, i) => ({ ...m, displayOrder: i }))
    setModules(updated)

    // Save orders to backend
    for (const m of updated) {
      await client.put(`/api/courses/${courseId}/learning-modules/${m.id}`, m)
    }
  }

  if (editingMod) {
    return (
      <BlockEditor 
        courseId={courseId}
        initialTitle={editingMod.title || ''}
        initialDescription={editingMod.description || ''}
        initialContent={editingMod.htmlContent || ''}
        showDescription={true}
        onClose={() => setEditingMod(null)}
        onSave={handleSave}
        saving={saving}
      />
    )
  }

  return (
    <div className="animate-in card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Learning Modules</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
            Manage the sequence of your dynamic learning modules.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditingMod({ title: '', description: '', htmlContent: '' })}>+ Add Module</button>
      </div>

      {loading ? <div className="loading-page"><div className="spinner" /></div>
        : modules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🧩</div>
            <div className="empty-state-title">No modules yet</div>
            <p className="empty-state-text">Build your course content with rich dynamic blocks — text, images, videos and callouts.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {modules.map((mod, i) => (
              <div key={mod.id} style={{ 
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', 
                background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8 
              }}>
                <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{mod.title}</div>
                </div>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleMove(i, -1)} disabled={i === 0}>⬆️</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleMove(i, 1)} disabled={i === modules.length - 1}>⬇️</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDuplicate(mod)}>Duplicate</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingMod(mod)}>Edit Module</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(mod.id)} style={{ color: '#ef4444' }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
