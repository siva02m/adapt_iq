import { useState, useEffect } from 'react'
import TopBar from '../../components/TopBar'
import client from '../../api/client'

const MATRIX_COLORS = {
  MASTERED:   { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', label: '✅ Mastered' },
  MISINFORMED:{ bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', label: '⚠ Misinformed' },
  DOUBTFUL:   { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', label: '❓ Doubtful' },
  UNINFORMED: { bg: 'rgba(249,115,22,0.15)',  color: '#f97316', label: '❌ Uninformed' },
  NEUTRAL:    { bg: 'rgba(107,114,128,0.15)', color: '#6b7280', label: '⬜ No Knowledge' },
}

function MetricCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: accent || 'var(--text-primary)' }}>{value}</div>
      {sub && <div className="stat-change" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

function MatrixBar({ data, total }) {
  return (
    <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden', gap: 1 }}>
      {Object.entries(MATRIX_COLORS).map(([key, cfg]) => {
        const pct = total ? Math.round(((data[key] || 0) / total) * 100) : 0
        return pct > 0 ? (
          <div key={key} title={`${cfg.label}: ${pct}%`}
            style={{ width: `${pct}%`, background: cfg.color, transition: 'width 0.5s', minWidth: 4 }} />
        ) : null
      })}
    </div>
  )
}

export default function ReportingDashboard() {
  const [summary, setSummary] = useState(null)
  const [courses, setCourses] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      client.get('/api/reports/summary'),
      client.get('/api/reports/courses')
    ]).then(([sRes, cRes]) => {
      setSummary(sRes.data)
      setCourses(cRes.data)
    }).finally(() => setLoading(false))
  }, [])

  const handleCourseSelect = async (courseId) => {
    setSelected(courseId)
    setDetail(null)
    const res = await client.get(`/api/reports/courses/${courseId}`)
    setDetail(res.data)
  }

  if (loading) return (
    <>
      <TopBar />
      <div className="loading-page"><div className="spinner" /> Loading report data…</div>
    </>
  )

  return (
    <>
      <TopBar />
      <div className="app-content animate-in">
        <div className="page-header">
          <div>
            <h1 className="page-title">Reporting Dashboard</h1>
            <p className="page-subtitle">Confidence-based learning analytics across all courses</p>
          </div>
        </div>

        {/* Platform Summary Stats */}
        {summary && (
          <div className="stats-grid" style={{ marginBottom: 28 }}>
            <MetricCard label="Total Learners" value={summary.totalLearners ?? '—'} />
            <MetricCard label="Total Attempts" value={summary.totalAttempts ?? '—'} />
            <MetricCard label="Mastered" value={`${summary.masteredPct ?? 0}%`} accent="var(--success)" sub="Correct + Sure" />
            <MetricCard label="Misinformed" value={`${summary.misinformedPct ?? 0}%`} accent="var(--danger)" sub="Wrong + Sure (critical)" />
            <MetricCard label="Overconfident Rate" value={`${summary.overconfidencePct ?? 0}%`} accent="var(--warning)" sub="Sure but incorrect" />
            <MetricCard label="Avg Mastery" value={`${summary.avgMasteryPct ?? 0}%`} />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'flex-start' }}>
          {/* Course List */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
              Course Reports
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 500 }}>
              {courses.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}>
                  <div className="empty-state-icon">📊</div>
                  <div className="empty-state-title">No data yet</div>
                </div>
              ) : courses.map(c => (
                <div key={c.courseId}
                  id={`report-course-${c.courseId}`}
                  onClick={() => handleCourseSelect(c.courseId)}
                  style={{
                    padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                    background: selected === c.courseId ? 'var(--accent-light)' : 'transparent',
                    transition: 'background 0.15s'
                  }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: selected === c.courseId ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 6 }}>
                    {c.courseTitle}
                  </div>
                  <MatrixBar data={c.matrixBreakdown || {}} total={c.totalAttempts || 1} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                    <span>{c.totalLearners} learners</span>
                    <span>{c.totalAttempts} attempts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail Panel */}
          <div>
            {!selected ? (
              <div className="card">
                <div className="empty-state" style={{ padding: 40 }}>
                  <div className="empty-state-icon">👈</div>
                  <div className="empty-state-title">Select a course to view details</div>
                </div>
              </div>
            ) : !detail ? (
              <div className="card"><div className="loading-page"><div className="spinner" /></div></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Matrix breakdown */}
                <div className="card">
                  <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Confidence Matrix Breakdown</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                    {Object.entries(MATRIX_COLORS).map(([key, cfg]) => (
                      <div key={key} style={{ padding: '12px 14px', borderRadius: 8, background: cfg.bg, textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: cfg.color }}>
                          {detail.matrixBreakdown?.[key] || 0}
                        </div>
                        <div style={{ fontSize: 11, color: cfg.color, fontWeight: 600, marginTop: 2 }}>{cfg.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top misinformed questions */}
                {detail.topMisinformedQuestions?.length > 0 && (
                  <div className="card">
                    <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15, color: 'var(--danger)' }}>
                      ⚠ Top Misinformed Questions
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {detail.topMisinformedQuestions.map((q, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                            {q.count}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>{q.questionText}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per LO mastery */}
                {detail.loMastery?.length > 0 && (
                  <div className="card">
                    <h3 style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Learning Objective Mastery</h3>
                    {detail.loMastery.map((lo, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>
                          <span>{lo.title}</span>
                          <span style={{ color: lo.masteryPct >= 70 ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>
                            {lo.masteryPct}%
                          </span>
                        </div>
                        <div style={{ height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${lo.masteryPct}%`, height: '100%', background: lo.masteryPct >= 70 ? 'var(--success)' : 'var(--warning)', borderRadius: 4, transition: 'width 0.5s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Learner table */}
                {detail.learners?.length > 0 && (
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                      Learner Performance
                    </div>
                    <table className="data-table">
                      <thead>
                        <tr><th>Learner</th><th>Attempts</th><th>Mastered</th><th>Misinformed</th><th>Last Active</th></tr>
                      </thead>
                      <tbody>
                        {detail.learners.map((l, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 500 }}>{l.fullName || `User #${l.userId}`}</td>
                            <td>{l.totalAttempts}</td>
                            <td style={{ color: 'var(--success)', fontWeight: 600 }}>{l.mastered}</td>
                            <td style={{ color: 'var(--danger)', fontWeight: 600 }}>{l.misinformed}</td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {l.lastActive ? new Date(l.lastActive).toLocaleDateString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
