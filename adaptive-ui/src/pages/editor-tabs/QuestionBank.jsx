import { useState, useEffect } from 'react'
import client from '../../api/client'

function QuestionModal({ courseId, question, los, poolType, onClose, onSaved }) {
  const [form, setForm] = useState({
    questionText: question?.questionText || '',
    customFeedbackText: question?.customFeedbackText || '',
    poolType,
    learningObjective: question?.learningObjective || null,
    options: question?.options || [
      { optionText: '', correct: true },
      { optionText: '', correct: false },
      { optionText: '', correct: false },
      { optionText: '', correct: false }
    ]
  })
  const [saving, setSaving] = useState(false)

  const setOption = (i, field, val) => {
    const opts = [...form.options]
    if (field === 'correct') opts.forEach((o, j) => o.correct = (j === i))
    else opts[i] = { ...opts[i], [field]: val }
    setForm(f => ({ ...f, options: opts }))
  }

  const handleSave = async () => {
    if (!form.questionText.trim()) return alert('Question text required')
    if (form.options.some(o => !o.optionText.trim())) return alert('All 4 options must have text')
    if (!form.learningObjective?.id) return alert('Select a Learning Objective')
    setSaving(true)
    try {
      const payload = { ...form, course: { id: parseInt(courseId) }, learningObjective: { id: form.learningObjective.id } }
      if (question) {
        const res = await client.put(`/api/authoring/questions/${question.id}`, payload)
        onSaved(res.data, 'update')
      } else {
        const res = await client.post('/api/authoring/questions', payload)
        onSaved(res.data, 'create')
      }
      onClose()
    } catch { alert('Save failed') } finally { setSaving(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{question ? 'Edit Question' : 'New Question'}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Question Text</label>
            <textarea className="form-textarea" rows={3} value={form.questionText}
              onChange={e => setForm(f => ({ ...f, questionText: e.target.value }))}
              placeholder="Type the question..." autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">Learning Objective</label>
            <select className="form-select"
              value={form.learningObjective?.id || ''}
              onChange={e => setForm(f => ({ ...f, learningObjective: { id: parseInt(e.target.value) } }))}>
              <option value="">— Select LO —</option>
              {los.map(lo => <option key={lo.id} value={lo.id}>{lo.title}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Answer Options <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(select the correct one)</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {form.options.map((opt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-input)', borderRadius: 6, padding: '8px 12px', border: `1.5px solid ${opt.correct ? 'var(--success)' : 'var(--border)'}` }}>
                  <input type="radio" name="correct" checked={opt.correct} onChange={() => setOption(i, 'correct', true)}
                    style={{ accentColor: 'var(--success)', width: 16, height: 16, flexShrink: 0 }} />
                  <input className="form-input" style={{ border: 'none', background: 'none', padding: 0, flex: 1 }}
                    placeholder={`Option ${i + 1}`} value={opt.optionText}
                    onChange={e => setOption(i, 'optionText', e.target.value)} />
                  {opt.correct && <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>CORRECT</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Feedback Text <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(shown when misinformed)</span></label>
            <textarea className="form-textarea" rows={2} value={form.customFeedbackText}
              onChange={e => setForm(f => ({ ...f, customFeedbackText: e.target.value }))}
              placeholder="Explain the correct answer to clear misconceptions…" />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button id="save-question-btn" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : question ? 'Update Question' : 'Create Question'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function QuestionBank({ courseId, poolType, title, icon, hint }) {
  const [questions, setQuestions] = useState([])
  const [los, setLos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    Promise.all([
      client.get(`/api/courses/${courseId}/questions?pool=${poolType}`),
      client.get(`/api/courses/${courseId}/learning-objectives`)
    ]).then(([qRes, loRes]) => {
      setQuestions(qRes.data)
      setLos(loRes.data)
    }).finally(() => setLoading(false))
  }, [courseId, poolType])

  const handleSaved = (q, type) => {
    if (type === 'create') setQuestions(qs => [...qs, q])
    else setQuestions(qs => qs.map(x => x.id === q.id ? q : x))
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this question?')) return
    await client.delete(`/api/authoring/questions/${id}`)
    setQuestions(qs => qs.filter(x => x.id !== id))
  }

  const RESULT_COLORS = { MASTERED: 'var(--success)', MISINFORMED: 'var(--danger)', DOUBTFUL: 'var(--warning)', UNINFORMED: '#f97316', NEUTRAL: 'var(--text-muted)' }

  return (
    <div className="animate-in">
      {modal && <QuestionModal courseId={courseId} question={modal === 'new' ? null : modal}
        los={los} poolType={poolType} onClose={() => setModal(null)} onSaved={handleSaved} />}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{icon} {title}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{hint}</p>
          </div>
          <button id={`add-q-${poolType}`} className="btn btn-primary" onClick={() => setModal('new')}>+ Add Question</button>
        </div>

        {loading ? <div className="loading-page"><div className="spinner" /></div>
          : questions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">{icon}</div>
              <div className="empty-state-title">No questions yet</div>
              <p className="empty-state-text">Add questions to build this assessment bank.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Question</th>
                  <th>Learning Objective</th>
                  <th>Options</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q, i) => (
                  <tr key={q.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ maxWidth: 300 }}>
                      <div style={{ fontWeight: 500, fontSize: 13, lineHeight: 1.4 }}>{q.questionText}</div>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {q.learningObjective?.title || '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{q.options?.length || 0} opts</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setModal(q)}>✏️</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(q.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </div>
    </div>
  )
}
