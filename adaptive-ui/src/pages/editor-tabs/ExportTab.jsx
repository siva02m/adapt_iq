import { useState } from 'react'
import client from '../../api/client'

const FORMATS = [
  { id: 'json',      icon: '📄', label: 'JSON Source',  desc: 'Full course backup — can be re-imported' },
  { id: 'scorm12',   icon: '📦', label: 'SCORM 1.2',    desc: 'Compatible with most legacy LMS platforms' },
  { id: 'scorm2004', icon: '📦', label: 'SCORM 2004',   desc: 'Modern LMS platforms, detailed tracking' },
  { id: 'web',       icon: '🌐', label: 'Web Package',   desc: 'Self-contained HTML/CSS/JS ZIP — host anywhere' },
  { id: 'word',      icon: '📝', label: 'Word (.docx)',  desc: 'Export course content for review/editing' },
  { id: 'pdf',       icon: '📕', label: 'PDF',           desc: 'Print-ready course document' },
]

export default function ExportTab({ course }) {
  const [selected, setSelected] = useState('json')
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await client.get(`/api/courses/${course.id}/export?format=${selected}`, { responseType: 'blob' })
      const ext = { json: 'json', scorm12: 'zip', scorm2004: 'zip', web: 'zip', word: 'docx', pdf: 'pdf' }[selected]
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `${course.title.replace(/\s+/g, '_')}_${selected}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Export failed — ensure the backend export endpoint is running.')
    } finally { setExporting(false) }
  }

  return (
    <div className="card animate-in">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Export Course</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
          Package and download this course in your preferred format
        </p>
      </div>

      {/* Course summary */}
      <div className="card card-sm" style={{ marginBottom: 20, background: 'var(--bg-input)' }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>Exporting</div>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{course.title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          v{course.version} · {course.status}
        </div>
      </div>

      {/* Format selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {FORMATS.map(fmt => (
          <div key={fmt.id}
            id={`export-${fmt.id}`}
            onClick={() => setSelected(fmt.id)}
            style={{
              padding: '14px 16px', borderRadius: 8, cursor: 'pointer',
              border: `2px solid ${selected === fmt.id ? 'var(--accent)' : 'var(--border)'}`,
              background: selected === fmt.id ? 'var(--accent-light)' : 'var(--bg-input)',
              transition: 'all 0.15s'
            }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{fmt.icon}</div>
            <div style={{ fontWeight: 600, fontSize: 13, color: selected === fmt.id ? 'var(--accent)' : 'var(--text-primary)' }}>
              {fmt.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{fmt.desc}</div>
          </div>
        ))}
      </div>

      <button id="export-btn" className="btn btn-primary btn-lg" onClick={handleExport} disabled={exporting} style={{ width: '100%' }}>
        {exporting ? <><span className="spinner" style={{ width: 18, height: 18 }} /> Generating…</> : `⬇ Export as ${FORMATS.find(f => f.id === selected)?.label}`}
      </button>
    </div>
  )
}
