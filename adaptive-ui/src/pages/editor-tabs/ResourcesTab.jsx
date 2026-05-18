import { useState, useEffect } from 'react'
import client from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'
import CustomMediaPlayer from '../../components/CustomMediaPlayer'

export default function ResourcesTab({ course, setCourse }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [courseResources, setCourseResources] = useState([])
  const [globalResources, setGlobalResources] = useState([])
  const [loading, setLoading] = useState(true)

  const [newRes, setNewRes] = useState({ name: '', url: '', type: 'DOCUMENT', isGlobal: false })
  const [file, setFile] = useState(null)
  const [ccFile, setCcFile] = useState(null)
  const [adding, setAdding] = useState(false)
  const [activeMedia, setActiveMedia] = useState(null) // For custom MediaViewer
  const [activeTab, setActiveTab] = useState('ALL') // Filter tab
  const [isDragging, setIsDragging] = useState(false)

  // Edit State
  const [editingResource, setEditingResource] = useState(null)
  const [editFile, setEditFile] = useState(null)
  const [editCcFile, setEditCcFile] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)

  // Auto-lock type based on tab
  useEffect(() => {
    if (activeTab !== 'ALL') {
      setNewRes(prev => ({ ...prev, type: activeTab }))
    }
  }, [activeTab])

  useEffect(() => {
    loadResources()
  }, [course.id])

  const loadResources = async () => {
    try {
      const [cRes, gRes] = await Promise.all([
        client.get(`/api/courses/${course.id}/resources`),
        client.get('/api/resources/global')
      ])
      setCourseResources(cRes.data)
      setGlobalResources(gRes.data)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleGlobal = async () => {
    try {
      const updated = { ...course, globalResourcesEnabled: !course.globalResourcesEnabled }
      await client.put(`/api/courses/${course.id}`, updated)
      setCourse(updated)
    } catch (e) { alert('Failed to update setting') }
  }

  const handleAddResource = async (e) => {
    e.preventDefault()
    if (!newRes.name) return alert('Name is required')
    if (!file && !newRes.url) return alert('Please provide a URL or upload a file')

    setAdding(true)
    try {
      const formData = new FormData()
      formData.append('name', newRes.name)
      formData.append('type', newRes.type)
      if (newRes.isGlobal) formData.append('isGlobal', true)
      
      if (file) formData.append('file', file)
      else if (newRes.url) formData.append('url', newRes.url)

      if (ccFile) formData.append('ccFile', ccFile)

      const endpoint = newRes.isGlobal ? '/api/resources/global' : `/api/courses/${course.id}/resources`
      const res = await client.post(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (newRes.isGlobal) setGlobalResources([...globalResources, res.data])
      else setCourseResources([...courseResources, res.data])
      
      setNewRes({ name: '', url: '', type: 'DOCUMENT', isGlobal: false })
      setFile(null)
      setCcFile(null)
    } catch (err) {
      console.error(err)
      alert('Failed to add resource')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id, isGlobal) => {
    if (!confirm('Delete this resource?')) return
    try {
      await client.delete(`/api/resources/${id}`)
      if (isGlobal) setGlobalResources(g => g.filter(r => r.id !== id))
      else setCourseResources(c => c.filter(r => r.id !== id))
    } catch (e) { alert('Failed to delete') }
  }

  const getIcon = (type) => {
    switch(type) {
      case 'VIDEO': return '🎥'
      case 'AUDIO': return '🎵'
      case 'IMAGE': return '🖼️'
      default: return '📄'
    }
  }

  const getAcceptType = (type) => {
    switch(type) {
      case 'VIDEO': return '.mp4,.webm,.ogg,.mov,.avi';
      case 'AUDIO': return '.mp3,.wav,.ogg,.m4a';
      case 'IMAGE': return '.jpg,.jpeg,.png,.gif,.webp,.svg';
      case 'DOCUMENT': return '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv';
      default: return '';
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0]
      setFile(droppedFile)
      if (!newRes.name) {
        setNewRes({ ...newRes, name: droppedFile.name.split('.')[0] })
      }
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setSavingEdit(true)
    try {
      const formData = new FormData()
      formData.append('name', editingResource.name)
      if (editFile) formData.append('file', editFile)
      if (editCcFile) formData.append('ccFile', editCcFile)

      const res = await client.put(`/api/resources/${editingResource.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      // Update state
      if (editingResource.isGlobal) {
        setGlobalResources(prev => prev.map(r => r.id === editingResource.id ? res.data : r))
      } else {
        setCourseResources(prev => prev.map(r => r.id === editingResource.id ? res.data : r))
      }

      setEditingResource(null)
      setEditFile(null)
      setEditCcFile(null)
    } catch (err) {
      console.error(err)
      alert('Failed to update resource')
    } finally {
      setSavingEdit(false)
    }
  }

  const filteredCourseResources = courseResources.filter(r => activeTab === 'ALL' || r.type === activeTab)
  const filteredGlobalResources = globalResources.filter(r => activeTab === 'ALL' || r.type === activeTab)

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Type Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        {['ALL', 'VIDEO', 'AUDIO', 'IMAGE', 'DOCUMENT'].map(tab => (
          <button 
            key={tab} 
            className={`btn btn-sm ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'ALL' ? 'All Resources' : tab.charAt(0) + tab.slice(1).toLowerCase() + 's'}
          </button>
        ))}
      </div>

      {/* Course Resources */}
      <div className="card">
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Course Resources</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Media files and documents available only for this course.
        </p>

        {loading ? <div className="loading-page"><div className="spinner" /></div> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {filteredCourseResources.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', background: 'var(--bg-input)', borderRadius: 8, color: 'var(--text-muted)' }}>
                No {activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} resources found for this course.
              </div>
            ) : (
              filteredCourseResources.map(r => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <div style={{ fontSize: 20 }}>{getIcon(r.type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.url.startsWith('/') ? 'Local File' : 'External Link'}</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveMedia(r)}>Open / Play</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingResource(r)}>Edit / Replace</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(r.id, false)} style={{ color: '#ef4444' }}>🗑️</button>
                </div>
              ))
            )}
          </div>
        )}

        <form 
          onSubmit={handleAddResource} 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ 
            display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end', 
            background: isDragging ? 'var(--accent-light)' : 'var(--bg-secondary)', 
            padding: 16, borderRadius: 8, border: isDragging ? '2px dashed var(--accent)' : '2px dashed transparent',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ width: '100%', fontSize: 12, color: 'var(--accent)', fontWeight: 600, display: isDragging ? 'block' : 'none', textAlign: 'center', paddingBottom: 8 }}>
            Drop file here to attach
          </div>
          <div className="form-group" style={{ minWidth: 200, flex: 1 }}>
            <label className="form-label">Name</label>
            <input className="form-input" value={newRes.name} onChange={e => setNewRes({...newRes, name: e.target.value})} placeholder="e.g. Sales PDF" required />
          </div>
          
          {activeTab === 'ALL' && (
            <div className="form-group" style={{ width: 140 }}>
              <label className="form-label">Type</label>
              <select className="form-select" value={newRes.type} onChange={e => setNewRes({...newRes, type: e.target.value})}>
                <option value="DOCUMENT">Document</option>
                <option value="VIDEO">Video</option>
                <option value="AUDIO">Audio</option>
                <option value="IMAGE">Image</option>
              </select>
            </div>
          )}

          <div style={{ width: '100%', height: 0, margin: 0 }} /> {/* Force break */}

          <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">Upload File (Drag & Drop supported)</label>
            <input type="file" className="form-input" accept={getAcceptType(newRes.type)} onChange={e => setFile(e.target.files[0])} />
            {file && <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>Selected: {file.name}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', height: 42, color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>OR</div>
          <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">External URL</label>
            <input className="form-input" value={newRes.url} onChange={e => setNewRes({...newRes, url: e.target.value})} placeholder="https://..." disabled={!!file} />
          </div>

          {newRes.type === 'VIDEO' && (
            <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
              <label className="form-label">Upload Subtitles (CC / VTT)</label>
              <input type="file" className="form-input" accept=".vtt,.srt" onChange={e => setCcFile(e.target.files[0])} />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {isAdmin && (
              <label style={{ display: 'flex', gap: 8, fontSize: 13, cursor: 'pointer', alignItems: 'center', height: 42 }}>
                <input type="checkbox" checked={newRes.isGlobal} onChange={e => setNewRes({...newRes, isGlobal: e.target.checked})} />
                Global Resource?
              </label>
            )}
            <button type="submit" className="btn btn-primary" style={{ height: 42 }} disabled={adding}>
              {adding ? 'Uploading...' : '+ Add Resource'}
            </button>
          </div>
        </form>
      </div>

      {/* Global Resources */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Global Resources</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Resources available across the entire platform. Admin can upload these.
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--bg-input)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)' }}>
            <input type="checkbox" checked={course.globalResourcesEnabled} onChange={handleToggleGlobal} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Enable for this course</span>
          </label>
        </div>

        {course.globalResourcesEnabled ? (
          loading ? <div className="loading-page"><div className="spinner" /></div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredGlobalResources.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', background: 'var(--bg-input)', borderRadius: 8, color: 'var(--text-muted)' }}>
                  No global {activeTab !== 'ALL' ? activeTab.toLowerCase() : ''} resources available.
                </div>
              ) : (
                filteredGlobalResources.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8, opacity: 0.8 }}>
                    <div style={{ fontSize: 20 }}>{getIcon(r.type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.url.startsWith('/') ? 'Local File' : 'External Link'}</div>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={() => setActiveMedia(r)}>Open / Play</button>
                    {isAdmin && (
                      <>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingResource(r)}>Edit / Replace</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(r.id, true)} style={{ color: '#ef4444' }}>🗑️</button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )
        ) : (
          <div style={{ padding: 24, textAlign: 'center', background: 'var(--bg-input)', borderRadius: 8, color: 'var(--text-muted)' }}>
            Global resources are disabled for this course. Toggle above to enable.
          </div>
        )}
      </div>

      {activeMedia && (
        <MediaViewer resource={activeMedia} onClose={() => setActiveMedia(null)} />
      )}

      {/* Edit Resource Modal */}
      {editingResource && (
        <div className="modal-overlay" onClick={() => setEditingResource(null)} style={{ zIndex: 99999 }}>
          <div className="modal" style={{ maxWidth: 500, width: '100%', padding: 24, background: 'var(--bg-base)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Edit & Replace Resource</h3>
              <button className="btn-icon" onClick={() => setEditingResource(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer' }}>✕</button>
            </div>
            
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Resource Name</label>
                <input className="form-input" value={editingResource.name} onChange={e => setEditingResource({...editingResource, name: e.target.value})} required />
              </div>
              
              <div className="form-group" style={{ padding: 16, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  Replace Primary File 
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 'normal' }}>(Optional)</span>
                </label>
                <input type="file" className="form-input" accept={getAcceptType(editingResource.type)} onChange={e => setEditFile(e.target.files[0])} />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  Uploading a new file will automatically update this resource across the entire platform.
                </div>
              </div>

              {editingResource.type === 'VIDEO' && (
                <div className="form-group" style={{ padding: 16, background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Upload / Replace CC Subtitles 
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 'normal' }}>(Optional)</span>
                  </label>
                  <input type="file" className="form-input" accept=".vtt,.srt" onChange={e => setEditCcFile(e.target.files[0])} />
                  {editingResource.ccUrl && !editCcFile && (
                    <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 8 }}>✅ Currently has subtitles attached</div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditingResource(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function MediaViewer({ resource, onClose }) {
  // We need to resolve the URL. If it starts with /api/uploads, we need to map it correctly.
  // Wait, in ResourceController we replaced "/api" so it's just "/uploads/filename".
  // So Vite dev server needs to proxy it, or we just point directly to backend if not proxied.
  // We will assume it resolves correctly via absolute or proxied path.
  const src = resource.url.startsWith('/') ? `http://localhost:8080${resource.url}` : resource.url;
  const ccSrc = resource.ccUrl ? `http://localhost:8080${resource.ccUrl}` : null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="modal" style={{ maxWidth: 900, width: '100%', padding: 20, background: 'var(--bg-base)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>{resource.name}</h3>
            <span className="badge badge-admin">{resource.type}</span>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ background: 'var(--bg-input)', borderRadius: 8, overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          
          {resource.type === 'VIDEO' && (
            <CustomMediaPlayer src={src} ccSrc={ccSrc} type="VIDEO" mode="OPEN" />
          )}

          {resource.type === 'AUDIO' && (
            <CustomMediaPlayer src={src} type="AUDIO" mode="OPEN" />
          )}

          {resource.type === 'IMAGE' && (
            <div style={{ padding: 20, textAlign: 'center' }}>
              <img src={src} alt={resource.name} style={{ maxWidth: '100%', maxHeight: 600, objectFit: 'contain', borderRadius: 8 }} />
            </div>
          )}

          {resource.type === 'DOCUMENT' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', padding: 40 }}>
              <div style={{ fontSize: 64 }}>📄</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <a href={src} target="_blank" rel="noreferrer" className="btn btn-primary">Open in New Tab</a>
                <a href={src} download className="btn btn-secondary">Download File</a>
              </div>
              <iframe src={src} title="Document Preview" style={{ width: '100%', height: 400, border: '1px solid var(--border)', borderRadius: 8, marginTop: 20 }} />
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
