import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import client from '../api/client'
import CustomMediaPlayer from './CustomMediaPlayer'

const BLOCK_TYPES = [
  { type: 'heading', label: 'Heading', icon: '📝', default: { text: 'New Heading', level: 2 } },
  { type: 'paragraph', label: 'Paragraph', icon: '¶', default: { text: 'Start typing...' } },
  { type: 'image', label: 'Image', icon: '🖼️', default: { url: '', caption: '' } },
  { type: 'video', label: 'Video', icon: '🎥', default: { url: '', ccUrl: '', playbackMode: 'OPEN' } },
  { type: 'alert', label: 'Callout', icon: '💡', default: { text: 'Important note here', variant: 'info' } }
]

export default function BlockEditor({ 
  courseId,
  initialTitle = '', 
  initialDescription = '', 
  initialContent = '', 
  showDescription = true,
  onClose, 
  onSave, 
  saving = false 
}) {
  const [title, setTitle] = useState(initialTitle)
  const [description, setDescription] = useState(initialDescription)
  const editorRef = useRef(null)

  // Resource Picker State
  const [pickerOpenFor, setPickerOpenFor] = useState(null) // blockId
  const [pickerType, setPickerType] = useState(null) // 'IMAGE' or 'VIDEO'
  const [resources, setResources] = useState([])
  const [uploadingRes, setUploadingRes] = useState(false)

  useEffect(() => {
    // Trap focus inside the editor
    if (editorRef.current) {
      editorRef.current.focus()
    }
    // Prevent scrolling on the body while the editor is open
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    // Fetch resources if courseId exists
    if (courseId) {
      Promise.all([
        client.get(`/api/courses/${courseId}/resources`),
        client.get('/api/resources/global')
      ]).then(([cRes, gRes]) => {
        setResources([...cRes.data, ...gRes.data])
      }).catch(console.error)
    }

    return () => {
      document.body.style.overflow = originalStyle;
    }
  }, [courseId])
  
  const [blocks, setBlocks] = useState(() => {
    if (!initialContent) return []
    try {
      const parsed = JSON.parse(initialContent)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return [{ id: 'legacy', type: 'html', content: initialContent }]
    }
  })
  
  const handleSave = () => {
    if (!title.trim()) return alert('Title is required')
    onSave({ title, description, htmlContent: JSON.stringify(blocks) })
  }

  const addBlock = (blockDef) => {
    setBlocks([...blocks, { id: Math.random().toString(36).substr(2, 9), type: blockDef.type, ...blockDef.default }])
  }

  const updateBlock = (id, changes) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...changes } : b))
  }

  const removeBlock = (id) => {
    setBlocks(blocks.filter(b => b.id !== id))
  }

  const moveBlock = (index, dir) => {
    if (index + dir < 0 || index + dir >= blocks.length) return
    const newBlocks = [...blocks]
    const temp = newBlocks[index]
    newBlocks[index] = newBlocks[index + dir]
    newBlocks[index + dir] = temp
    setBlocks(newBlocks)
  }

  const handleResourceSelect = (resource) => {
    // The backend stores URLs as /uploads/... or external
    const absoluteUrl = resource.url.startsWith('/') ? `http://localhost:8080${resource.url}` : resource.url;
    
    if (pickerType === 'VIDEO') {
      const ccAbsolute = resource.ccUrl ? (resource.ccUrl.startsWith('/') ? `http://localhost:8080${resource.ccUrl}` : resource.ccUrl) : ''
      updateBlock(pickerOpenFor, { url: absoluteUrl, ccUrl: ccAbsolute })
    } else {
      updateBlock(pickerOpenFor, { url: absoluteUrl })
    }
    setPickerOpenFor(null)
  }

  const handleResourceUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !courseId) return
    setUploadingRes(true)
    try {
      const formData = new FormData()
      formData.append('name', file.name.split('.')[0])
      formData.append('type', pickerType)
      formData.append('file', file)
      const res = await client.post(`/api/courses/${courseId}/resources`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResources(prev => [...prev, res.data])
      handleResourceSelect(res.data)
    } catch (err) {
      alert('Failed to upload file')
    } finally {
      setUploadingRes(false)
    }
  }

  return createPortal(
    <div 
      ref={editorRef}
      tabIndex="-1"
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
        background: 'var(--bg-base)', zIndex: 99999,
        display: 'flex', flexDirection: 'column',
        outline: 'none'
      }}
      onKeyDown={(e) => {
        // Prevent tab from escaping if it's hitting the document body bounds
        // (A simple trap: we just stop propagation to outer containers, though true focus trapping requires more logic)
        e.stopPropagation()
      }}
    >
      <div style={{
        height: 60, borderBottom: '1px solid var(--border)', display: 'flex', 
        alignItems: 'center', justifyContent: 'space-between', padding: '0 24px',
        background: 'var(--bg-secondary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="btn btn-ghost" onClick={onClose}>← Go Back</button>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Authoring Canvas</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{
          width: 280, borderRight: '1px solid var(--border)', background: 'var(--bg-secondary)',
          padding: 24, overflowY: 'auto'
        }}>
          <h3 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: 0.5, marginBottom: 16 }}>
            Add Content Block
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {BLOCK_TYPES.map(b => (
              <div key={b.type} onClick={() => addBlock(b)} style={{
                padding: 16, background: 'var(--bg-base)', border: '1px solid var(--border)',
                borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                transition: 'all 0.2s',
              }} className="hover-lift">
                <span style={{ fontSize: 24 }}>{b.icon}</span>
                <span style={{ fontWeight: 500, fontSize: 14 }}>{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 0', background: 'var(--bg-input)' }}>
          <div style={{ maxWidth: 760, margin: '0 auto', background: 'var(--bg-base)', borderRadius: 12, padding: 48, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', minHeight: '100%' }}>
            
            <div style={{ marginBottom: 40, paddingBottom: 40, borderBottom: '2px dashed var(--border)' }}>
              <input 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                placeholder="Page Title..."
                style={{ fontSize: 42, fontWeight: 800, width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', marginBottom: 16 }}
              />
              {showDescription && (
                <textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description (optional)..."
                  rows={2}
                  style={{ fontSize: 18, width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-secondary)', resize: 'none' }}
                />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {blocks.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0', border: '2px dashed var(--border)', borderRadius: 12 }}>
                  <div style={{ fontSize: 40, marginBottom: 16 }}>🧩</div>
                  <h3>No content blocks yet</h3>
                  <p>Click a block type on the left to start building your content.</p>
                </div>
              )}

              {blocks.map((block, index) => (
                <div key={block.id} className="block-container" style={{ position: 'relative', padding: '16px', border: '1px solid transparent', borderRadius: 8, transition: 'all 0.2s' }}>
                  
                  <div className="block-controls" style={{ position: 'absolute', top: -12, right: 16, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 20, display: 'none', padding: '4px', gap: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <button className="btn-icon" onClick={() => moveBlock(index, -1)} disabled={index === 0}>⬆️</button>
                    <button className="btn-icon" onClick={() => moveBlock(index, 1)} disabled={index === blocks.length - 1}>⬇️</button>
                    <button className="btn-icon" onClick={() => removeBlock(block.id)} style={{ color: '#ef4444' }}>🗑️</button>
                  </div>

                  {block.type === 'heading' && (
                    <input 
                      value={block.text} onChange={e => updateBlock(block.id, { text: e.target.value })}
                      style={{ fontSize: 28, fontWeight: 700, width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)' }}
                    />
                  )}
                  {block.type === 'paragraph' && (
                    <textarea 
                      value={block.text} onChange={e => updateBlock(block.id, { text: e.target.value })}
                      style={{ fontSize: 16, lineHeight: 1.6, width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-primary)', minHeight: 100, resize: 'vertical' }}
                    />
                  )}
                  {block.type === 'image' && (
                    <div style={{ background: 'var(--bg-input)', padding: 24, borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        <input className="form-input" style={{ flex: 1 }} placeholder="Image URL..." value={block.url} onChange={e => updateBlock(block.id, { url: e.target.value })} />
                        <button className="btn btn-secondary" onClick={() => { setPickerType('IMAGE'); setPickerOpenFor(block.id); }}>
                          Browse Resources
                        </button>
                      </div>
                      <input className="form-input" placeholder="Caption (optional)..." value={block.caption} onChange={e => updateBlock(block.id, { caption: e.target.value })} />
                      {block.url && <img src={block.url} alt={block.caption} style={{ maxWidth: '100%', marginTop: 16, borderRadius: 8 }} />}
                    </div>
                  )}
                  {block.type === 'video' && (
                    <div style={{ background: 'var(--bg-input)', padding: 24, borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                        <input className="form-input" style={{ flex: 1 }} placeholder="Video MP4 or YouTube URL..." value={block.url} onChange={e => updateBlock(block.id, { url: e.target.value })} />
                        <button className="btn btn-secondary" onClick={() => { setPickerType('VIDEO'); setPickerOpenFor(block.id); }}>
                          Browse Resources
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        <select className="form-select" value={block.playbackMode || 'OPEN'} onChange={e => updateBlock(block.id, { playbackMode: e.target.value })}>
                          <option value="OPEN">Playback: Fully Open (Allow seeking)</option>
                          <option value="WATCHED">Playback: Watched-Only (Can seek backwards)</option>
                          <option value="LOCKED">Playback: Fully Locked (No seeking allowed)</option>
                        </select>
                      </div>
                      {block.url && (
                        <div style={{ marginTop: 16 }}>
                          <CustomMediaPlayer src={block.url} ccSrc={block.ccUrl} mode={block.playbackMode || 'OPEN'} type="VIDEO" />
                        </div>
                      )}
                    </div>
                  )}
                  {block.type === 'alert' && (
                    <div style={{ background: 'var(--accent-light)', padding: 24, borderRadius: 8, borderLeft: '4px solid var(--accent)', display: 'flex', gap: 16 }}>
                      <div style={{ fontSize: 24 }}>💡</div>
                      <textarea 
                        value={block.text} onChange={e => updateBlock(block.id, { text: e.target.value })}
                        style={{ fontSize: 16, width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--accent)' }}
                      />
                    </div>
                  )}
                  {block.type === 'html' && (
                    <div dangerouslySetInnerHTML={{ __html: block.content }} style={{ color: 'var(--text-primary)' }} />
                  )}

                  <style dangerouslySetInnerHTML={{__html: `
                    .block-container:hover { border-color: var(--border); background: var(--bg-secondary); }
                    .block-container:hover .block-controls { display: flex; }
                    .btn-icon { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
                    .btn-icon:hover { background: var(--border); }
                  `}} />
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>

      {/* Resource Picker Modal */}
      {pickerOpenFor && (
        <div className="modal-overlay" style={{ zIndex: 999999, background: 'rgba(0,0,0,0.8)' }} onClick={() => setPickerOpenFor(null)}>
          <div className="modal" style={{ maxWidth: 800, width: '100%', padding: 24 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Select {pickerType === 'IMAGE' ? 'Image' : 'Video'}</h3>
              <button className="btn-icon" onClick={() => setPickerOpenFor(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '16px', background: 'var(--bg-input)', borderRadius: 8, border: '1px dashed var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Upload New File</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Upload a file directly to course resources.</div>
              </div>
              <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                {uploadingRes ? 'Uploading...' : 'Browse Computer'}
                <input type="file" style={{ display: 'none' }} accept={pickerType === 'IMAGE' ? '.jpg,.jpeg,.png,.gif,.webp,.svg' : '.mp4,.webm,.ogg,.mov,.avi'} onChange={handleResourceUpload} disabled={uploadingRes} />
              </label>
            </div>

            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                {resources.filter(r => r.type === pickerType).length === 0 && (
                  <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No {pickerType.toLowerCase()} resources found.
                  </div>
                )}
                {resources.filter(r => r.type === pickerType).map(r => (
                  <div key={r.id} onClick={() => handleResourceSelect(r)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', cursor: 'pointer' }} className="hover-lift">
                    <div style={{ height: 120, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {pickerType === 'IMAGE' ? (
                        <img src={r.url.startsWith('/') ? `http://localhost:8080${r.url}` : r.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={r.name} />
                      ) : (
                        <div style={{ fontSize: 32 }}>🎥</div>
                      )}
                    </div>
                    <div style={{ padding: 12 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.isGlobal ? 'Global' : 'Course'} Resource</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>,
    document.body
  )
}
