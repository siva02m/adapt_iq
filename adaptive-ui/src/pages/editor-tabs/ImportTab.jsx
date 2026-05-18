import { useState } from 'react'
import client from '../../api/client'

export default function ImportTab({ courseId }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)

  const handleFile = f => {
    if (!f?.name.endsWith('.json')) return alert('Only JSON source files are supported for import.')
    setFile(f)
    setResult(null)
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await client.post(`/api/courses/${courseId}/import`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult({ success: true, message: res.data?.message || 'Import successful! Refresh to see changes.' })
    } catch (e) {
      setResult({ success: false, message: e.response?.data?.error || 'Import failed. Check file format.' })
    } finally { setImporting(false) }
  }

  return (
    <div className="card animate-in">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Import Course</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
          Restore course content from a JSON source file exported from AdaptIQ
        </p>
      </div>

      {/* Drop Zone */}
      <div
        id="import-dropzone"
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => document.getElementById('import-file-input').click()}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 12, padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
          background: dragging ? 'var(--accent-light)' : 'var(--bg-input)',
          transition: 'all 0.2s', marginBottom: 20
        }}>
        <input id="import-file-input" type="file" accept=".json" style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])} />
        <div style={{ fontSize: 40, marginBottom: 12 }}>📥</div>
        {file ? (
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--accent)' }}>✓ {file.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {(file.size / 1024).toFixed(1)} KB — click to change
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Drop a JSON file here or click to browse</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Accepts .json export files from AdaptIQ</div>
          </div>
        )}
      </div>

      {result && (
        <div style={{
          padding: '14px 18px', borderRadius: 8, marginBottom: 16, fontSize: 14, fontWeight: 500,
          background: result.success ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${result.success ? 'var(--success)' : 'var(--danger)'}`,
          color: result.success ? 'var(--success)' : 'var(--danger)'
        }}>
          {result.success ? '✓' : '✗'} {result.message}
        </div>
      )}

      <button id="import-btn" className="btn btn-primary btn-lg" onClick={handleImport}
        disabled={!file || importing} style={{ width: '100%' }}>
        {importing ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Importing…</> : '📥 Import Course Data'}
      </button>

      <div className="form-hint" style={{ marginTop: 16, textAlign: 'center' }}>
        ⚠ Importing will merge data into the current course. Existing questions will not be deleted.
      </div>
    </div>
  )
}
