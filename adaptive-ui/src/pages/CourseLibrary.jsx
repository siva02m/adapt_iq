import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import client from '../api/client'

const STATUS_COLORS = { DRAFT: 'draft', PUBLISHED: 'published', ARCHIVED: 'archived' }
const COURSE_EMOJIS = ['📘', '🚀', '🎯', '💡', '🌟', '🔬', '🎓', '📊', '🛡️', '⚙️']

export default function CourseLibrary() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { fetchCourses() }, [])

  const fetchCourses = async () => {
    try {
      const res = await client.get('/api/courses')
      setCourses(res.data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await client.post('/api/courses', { title: 'Untitled Course' })
      navigate(`/courses/${res.data.id}/overview`)
    } catch (e) {
      alert('Failed to create course')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this course? This cannot be undone.')) return
    await client.delete(`/api/courses/${id}`)
    setCourses(c => c.filter(x => x.id !== id))
  }

  const filtered = courses.filter(c => {
    const matchStatus = filter === 'ALL' || c.status === filter
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const topBarActions = (
    <button id="new-course-btn" className="btn btn-primary" onClick={handleCreate} disabled={creating}>
      {creating ? '⏳ Creating…' : '+ New Course'}
    </button>
  )

  return (
    <>
      <TopBar actions={topBarActions} />
      <div className="app-content animate-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Course Library</h1>
            <p className="page-subtitle">{courses.length} course{courses.length !== 1 ? 's' : ''} in your library</p>
          </div>
        </div>

        {/* Search + Filter Bar */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <input
            id="course-search"
            className="form-input"
            style={{ flex: 1, minWidth: 200, maxWidth: 360 }}
            placeholder="🔍  Search courses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'].map(s => (
            <button
              key={s}
              id={`filter-${s.toLowerCase()}`}
              className={`btn ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
              style={{ minWidth: 90 }}
              onClick={() => setFilter(s)}
            >
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Course Grid */}
        {loading ? (
          <div className="loading-page"><div className="spinner" /> Loading courses…</div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">{search ? 'No courses match your search' : 'No courses yet'}</div>
            <p className="empty-state-text">
              {search ? 'Try a different search term.' : 'Click "New Course" to create your first course.'}
            </p>
          </div>
        ) : (
          <div className="course-grid">
            {filtered.map((course, i) => (
              <div
                key={course.id}
                id={`course-card-${course.id}`}
                className="course-card"
                onClick={() => navigate(`/courses/${course.id}/overview`)}
              >
                <div className="course-card-thumb">
                  <span style={{ position: 'relative', zIndex: 1, fontSize: 48 }}>
                    {COURSE_EMOJIS[course.id % COURSE_EMOJIS.length]}
                  </span>
                </div>
                <div className="course-card-body">
                  <div className="course-card-header">
                    <h3 className="course-card-title">{course.title}</h3>
                    <span className={`badge badge-${STATUS_COLORS[course.status]}`}>
                      {course.status?.charAt(0) + course.status?.slice(1).toLowerCase()}
                    </span>
                  </div>
                  <p className="course-card-desc">
                    {course.description || 'No description provided yet.'}
                  </p>
                  <div className="course-card-meta">
                    <span>🌐 {course.language?.toUpperCase() || 'EN'}</span>
                    <span>v{course.version || '1.0'}</span>
                    {course.estimatedDurationMinutes && (
                      <span>⏱ {course.estimatedDurationMinutes}m</span>
                    )}
                  </div>
                </div>
                <div className="course-card-actions" onClick={e => e.stopPropagation()}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => navigate(`/courses/${course.id}/overview`)}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={e => handleDelete(e, course.id)}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
