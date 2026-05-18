import { useState, useEffect } from 'react'
import client from '../../api/client'
import BlockEditor from '../../components/BlockEditor'

export default function IntroPages({ courseId }) {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPage, setEditingPage] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPages()
  }, [courseId])

  const loadPages = () => {
    client.get(`/api/courses/${courseId}/intro-pages`)
      .then(r => setPages(r.data.sort((a, b) => a.displayOrder - b.displayOrder)))
      .finally(() => setLoading(false))
  }

  const handleSave = async (payload) => {
    setSaving(true)
    try {
      const dbPayload = {
        title: payload.title,
        content: payload.htmlContent, // Map htmlContent to content
      }

      if (editingPage?.id) {
        dbPayload.displayOrder = editingPage.displayOrder
        const res = await client.put(`/api/courses/${courseId}/intro-pages/${editingPage.id}`, dbPayload)
        setPages(p => p.map(x => x.id === res.data.id ? res.data : x).sort((a, b) => a.displayOrder - b.displayOrder))
      } else {
        dbPayload.displayOrder = pages.length > 0 ? Math.max(...pages.map(p => p.displayOrder || 0)) + 1 : 1
        const res = await client.post(`/api/courses/${courseId}/intro-pages`, dbPayload)
        setPages(p => [...p, res.data].sort((a, b) => a.displayOrder - b.displayOrder))
      }
      setEditingPage(null)
    } catch (err) {
      alert('Failed to save page')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this intro page?')) return
    await client.delete(`/api/courses/${courseId}/intro-pages/${id}`)
    setPages(p => p.filter(x => x.id !== id))
  }

  const handleDuplicate = async (page) => {
    const payload = {
      title: page.title + ' (Copy)',
      content: page.content,
      displayOrder: pages.length > 0 ? Math.max(...pages.map(p => p.displayOrder || 0)) + 1 : 1
    }
    const res = await client.post(`/api/courses/${courseId}/intro-pages`, payload)
    setPages(p => [...p, res.data].sort((a, b) => a.displayOrder - b.displayOrder))
  }

  const handleMove = async (index, dir) => {
    if (index + dir < 0 || index + dir >= pages.length) return
    const newPages = [...pages]
    const temp = newPages[index]
    newPages[index] = newPages[index + dir]
    newPages[index + dir] = temp
    
    // Update orders immediately in UI
    const updated = newPages.map((p, i) => ({ ...p, displayOrder: i + 1 }))
    setPages(updated)

    // Save orders to backend
    for (const p of updated) {
      await client.put(`/api/courses/${courseId}/intro-pages/${p.id}`, p)
    }
  }

  if (editingPage) {
    return (
      <BlockEditor 
        courseId={courseId}
        initialTitle={editingPage.title || ''}
        initialContent={editingPage.content || ''}
        showDescription={false}
        onClose={() => setEditingPage(null)}
        onSave={handleSave}
        saving={saving}
      />
    )
  }

  return (
    <div className="animate-in card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Intro Pages</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
            Displayed before the course begins — welcome, objectives, WIIFM
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditingPage({ title: '', content: '' })}>+ Add Page</button>
      </div>

      {loading ? <div className="loading-page"><div className="spinner" /></div>
        : pages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🖼️</div>
            <div className="empty-state-title">No intro pages yet</div>
            <p className="empty-state-text">Add welcome pages, course objectives, or WIIFM content using the visual editor.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pages.map((page, i) => (
              <div key={page.id} style={{ 
                display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', 
                background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8 
              }}>
                <div style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>{page.title}</div>
                </div>
                
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleMove(i, -1)} disabled={i === 0}>⬆️</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleMove(i, 1)} disabled={i === pages.length - 1}>⬇️</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDuplicate(page)}>Duplicate</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingPage(page)}>Edit Page</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(page.id)} style={{ color: '#ef4444' }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}
