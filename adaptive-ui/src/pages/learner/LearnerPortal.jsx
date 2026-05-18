import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../../components/TopBar'
import client from '../../api/client'
import { useAuth } from '../../contexts/AuthContext'

export default function LearnerPortal() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get('/api/courses').then(r => setCourses(r.data)).finally(() => setLoading(false))
  }, [])

  const EMOJIS = ['📘','🚀','🎯','💡','🌟','🔬','🎓','📊','🛡️','⚙️']

  return (
    <>
      <TopBar />
      <div className="app-content animate-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">My Learning</h1>
            <p className="page-subtitle">Welcome back, {user?.fullName} — your assigned courses are below</p>
          </div>
        </div>

        {loading ? <div className="loading-page"><div className="spinner" /></div>
          : courses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🎓</div>
              <div className="empty-state-title">No courses assigned yet</div>
              <p className="empty-state-text">Contact your administrator to get courses assigned to your account.</p>
            </div>
          ) : (
            <div className="course-grid">
              {courses.map(course => (
                <div key={course.id} id={`learner-course-${course.id}`} className="course-card">
                  <div className="course-card-thumb">
                    <span style={{ position: 'relative', zIndex: 1, fontSize: 48 }}>
                      {EMOJIS[course.id % EMOJIS.length]}
                    </span>
                  </div>
                  <div className="course-card-body">
                    <h3 className="course-card-title">{course.title}</h3>
                    <p className="course-card-desc">{course.wiifm || course.description || 'No description'}</p>
                    <div className="course-card-meta">
                      {course.estimatedDurationMinutes && <span>⏱ {course.estimatedDurationMinutes}m</span>}
                      <span>🌐 {course.language?.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="course-card-actions">
                    <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                      onClick={() => navigate(`/learn/course/${course.id}`)}>
                      ▶ Start Course
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </>
  )
}
