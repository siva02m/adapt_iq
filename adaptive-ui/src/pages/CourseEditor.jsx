import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Routes, Route, Navigate } from 'react-router-dom'
import TopBar from '../components/TopBar'
import client from '../api/client'

// Tab imports (lazy approach — same file)
import Overview from './editor-tabs/Overview'
import Settings from './editor-tabs/Settings'
import Theme from './editor-tabs/Theme'
import IntroPages from './editor-tabs/IntroPages'
import PreAssessment from './editor-tabs/PreAssessment'
import PostAssessment from './editor-tabs/PostAssessment'
import LearningObjectives from './editor-tabs/LearningObjectives'
import Tags from './editor-tabs/Tags'
import LearningModules from './editor-tabs/LearningModules'
import ExportTab from './editor-tabs/ExportTab'
import ImportTab from './editor-tabs/ImportTab'
import ResourcesTab from './editor-tabs/ResourcesTab'

const TABS = [
  { id: 'overview',     icon: '📋', label: 'Overview' },
  { id: 'settings',     icon: '⚙️',  label: 'Settings' },
  { id: 'theme',        icon: '🎨', label: 'Theme' },
  { id: 'intro-pages',  icon: '🖼️',  label: 'Intro Pages' },
  { id: 'los',          icon: '🎯', label: 'Learning Objectives' },
  { id: 'pre-assess',   icon: '📝', label: 'Pre-Assessment' },
  { id: 'post-assess',  icon: '✅', label: 'Post-Assessment' },
  { id: 'tags',         icon: '🏷️',  label: 'Tags' },
  { id: 'modules',      icon: '🧩', label: 'Learning Modules' },
  { id: 'resources',    icon: '📂', label: 'Resources' },
  { id: 'export',       icon: '📦', label: 'Export' },
  { id: 'import',       icon: '📥', label: 'Import' },
]

export default function CourseEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [course, setCourse] = useState(null)
  const [saving, setSaving] = useState(false)

  const activeTab = TABS.find(t => location.pathname.includes(`/${t.id}`))?.id || 'overview'

  useEffect(() => {
    client.get(`/api/courses/${id}`)
      .then(r => setCourse(r.data))
      .catch(() => navigate('/courses'))
  }, [id])

  const handlePublish = async () => {
    const newStatus = course.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'
    setSaving(true)
    try {
      await client.put(`/api/courses/${id}/status`, { status: newStatus })
      setCourse(c => ({ ...c, status: newStatus }))
    } finally { setSaving(false) }
  }

  const topBarActions = course && (
    <>
      <span className={`badge badge-${course.status?.toLowerCase()}`}>
        {course.status?.charAt(0) + course.status?.slice(1).toLowerCase()}
      </span>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/courses')}>
        ← Library
      </button>
      <button
        id="publish-btn"
        className={`btn btn-sm ${course.status === 'PUBLISHED' ? 'btn-secondary' : 'btn-primary'}`}
        onClick={handlePublish}
        disabled={saving}
      >
        {course.status === 'PUBLISHED' ? '↩ Unpublish' : '🚀 Publish'}
      </button>
    </>
  )

  if (!course) return <div className="loading-page"><div className="spinner" /> Loading course…</div>

  return (
    <>
      <TopBar actions={topBarActions} />
      <div className="app-content animate-in">
        {/* Course title header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">{course.title}</h1>
            <p className="page-subtitle">Course ID #{course.id} · {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}</p>
          </div>
        </div>

        <div className="editor-layout">
          {/* Tab Navigation */}
          <nav className="editor-tabs" aria-label="Course editor sections">
            {TABS.map(tab => (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                className={`editor-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => navigate(`/courses/${id}/${tab.id}`)}
              >
                <span className="editor-tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Tab Content */}
          <div className="editor-content">
            <Routes>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview"    element={<Overview course={course} setCourse={setCourse} />} />
              <Route path="settings"    element={<Settings course={course} setCourse={setCourse} />} />
              <Route path="theme"       element={<Theme courseId={id} />} />
              <Route path="intro-pages" element={<IntroPages courseId={id} />} />
              <Route path="los"         element={<LearningObjectives courseId={id} />} />
              <Route path="pre-assess"  element={<PreAssessment courseId={id} poolType="ADAPTIVE_ROUND" />} />
              <Route path="post-assess" element={<PostAssessment courseId={id} poolType="FINAL_EXAM" />} />
              <Route path="tags"        element={<Tags courseId={id} />} />
              <Route path="modules"     element={<LearningModules courseId={id} />} />
              <Route path="resources"   element={<ResourcesTab course={course} setCourse={setCourse} />} />
              <Route path="export"      element={<ExportTab course={course} />} />
              <Route path="import"      element={<ImportTab courseId={id} />} />
            </Routes>
          </div>
        </div>
      </div>
    </>
  )
}
