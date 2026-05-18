import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import client from '../../api/client'
import BlockRenderer from '../../components/BlockRenderer'
import { useAuth } from '../../contexts/AuthContext'

export default function CoursePlayer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [course, setCourse] = useState(null)

  // Master Playlist (Linear Steps)
  const [playlist, setPlaylist] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  // original backup copies for adaptive rebuilding
  const [originalIntros, setOriginalIntros] = useState([])
  const [originalModules, setOriginalModules] = useState([])

  // Progressive navigation locking
  const [highestUnlockedIndex, setHighestUnlockedIndex] = useState(0)
  const isProgressive = true

  // Assessment Completion Registry
  const [completedAssessments, setCompletedAssessments] = useState({
    pre: false,
    final: false
  })

  // Diagnostic & Assessment Results Data
  const [preAssessmentResults, setPreAssessmentResults] = useState(null) // { loResults, answers }
  const [finalAssessmentResults, setFinalAssessmentResults] = useState(null)

  // Active Quiz Engine States
  const [questions, setQuestions] = useState([])
  const [assessmentStarted, setAssessmentStarted] = useState(false)
  const [qIndex, setQIndex] = useState(0)
  const [selectedOptId, setSelectedOptId] = useState(null)
  const [confidence, setConfidence] = useState(null) // 'SURE', 'NOT_SURE', 'DONT_KNOW'
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [userAnswers, setUserAnswers] = useState([]) // tracks local correctness for the instant diagnostic

  // Round tracking
  const [roundNumber, setRoundNumber] = useState(1)
  const [allRoundAnswers, setAllRoundAnswers] = useState([]) // accumulates across all rounds
  const [roundResults, setRoundResults] = useState(null) // shown after each round completes

  // Immediate Feedback View State (Rendered Inline Below Options)
  const [feedbackData, setFeedbackData] = useState(null) // { isCorrect, matrixResult, feedbackText, selectedOptionText, correctOptionText }

  useEffect(() => {
    loadCourseData()
  }, [id])

  useEffect(() => {
    // Reset temporary active quiz states when navigating between items
    setAssessmentStarted(false)
    setFeedbackData(null)
    setRoundResults(null)
    setQuestions([])
    setQIndex(0)
    setSelectedOptId(null)
    setConfidence(null)
    setRoundNumber(1)
    setAllRoundAnswers([])
  }, [currentIndex])

  const loadCourseData = async () => {
    try {
      const [cRes, introRes, modRes] = await Promise.all([
        client.get(`/api/courses/${id}`),
        client.get(`/api/courses/${id}/intro-pages`),
        client.get(`/api/courses/${id}/learning-modules`)
      ])

      setCourse(cRes.data)
      const sortedIntros = introRes.data.sort((a, b) => a.displayOrder - b.displayOrder)
      const sortedModules = modRes.data.sort((a, b) => a.displayOrder - b.displayOrder)

      setOriginalIntros(sortedIntros)
      setOriginalModules(sortedModules)

      // Build initial linear playlist
      const masterPlaylist = []
      sortedIntros.forEach(p => masterPlaylist.push({ type: 'intro', id: p.id, title: p.title, content: p.htmlContent || p.content }))
      masterPlaylist.push({ type: 'assessment', id: 'pre', title: 'Pre-Assessment Diagnostic' })
      sortedModules.forEach(m => masterPlaylist.push({ type: 'module', id: m.id, title: m.title, content: m.htmlContent }))
      masterPlaylist.push({ type: 'assessment', id: 'final', title: 'Final Certification Exam' })
      masterPlaylist.push({ type: 'results', id: 'results', title: 'Course Results' })

      setPlaylist(masterPlaylist)
      setCurrentIndex(0)
    } catch (err) {
      console.error(err)
      alert('Failed to load course details.')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    if (currentIndex < playlist.length - 1) {
      const nextIndex = currentIndex + 1
      setCurrentIndex(nextIndex)
      if (nextIndex > highestUnlockedIndex) setHighestUnlockedIndex(nextIndex)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
  }

  // Quiz Engine Controls
  const startAssessment = async (poolType) => {
    setLoading(true)
    try {
      let res;
      if (poolType === 'ADAPTIVE_ROUND') {
        // Fetch via custom round generator service (limits to course settings & filters mastered)
        res = await client.get(`/api/rounds/generate?userId=${user?.id || 1}&courseId=${id}`)
      } else {
        res = await client.get(`/api/courses/${id}/questions?pool=${poolType}`)
      }

      setQuestions(res.data)
      setQIndex(0)
      setSelectedOptId(null)
      setConfidence(null)
      setUserAnswers([])
      setFeedbackData(null)
      setAssessmentStarted(true)
    } catch (err) {
      console.error(err)
      alert('This course has no assessment questions created yet.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfidenceSelect = (level) => {
    // If feedback is already submitted, lock interaction
    if (feedbackData) return

    setConfidence(level)
    if (level === 'DONT_KNOW') {
      setSelectedOptId(null) // clear selected option if they don't know
    }
  }

  const submitAnswer = async () => {
    if (confidence !== 'DONT_KNOW' && !selectedOptId) {
      alert('Please select an option or click "I Don\'t Know".')
      return
    }
    if (!confidence) {
      alert('Please choose your level of confidence.')
      return
    }

    const currentQuestion = questions[qIndex]
    const selectedOption = currentQuestion.options.find(o => o.id === selectedOptId)
    const isCorrect = confidence === 'DONT_KNOW' ? false : (selectedOption ? (selectedOption.correct || selectedOption.isCorrect) : false)

    // Compute immediate 4-box matrix result
    let matrixResult = 'NEUTRAL'
    if (confidence === 'SURE') {
      matrixResult = isCorrect ? 'MASTERED' : 'MISINFORMED'
    } else if (confidence === 'NOT_SURE') {
      matrixResult = isCorrect ? 'DOUBTFUL' : 'UNINFORMED'
    }

    setSubmittingAnswer(true)
    try {
      // Post to the backend evaluation matrix engine
      await client.post('/api/rounds/evaluate', {
        userId: user?.id || 1,
        questionId: currentQuestion.id,
        selectedOptionId: confidence === 'DONT_KNOW' ? null : selectedOptId,
        confidenceLevel: confidence,
        attemptNumber: 1,
        roundNumber: 1, // Pre-Assessment diagnostic
        isCorrect: isCorrect
      })

      const selectedText = confidence === 'DONT_KNOW' ? "I Don't Know" : (selectedOption ? selectedOption.optionText : "None Selected")
      const correctText = currentQuestion.options.find(o => o.correct || o.isCorrect)?.optionText || "N/A"

      // Trigger immediate inline feedback below options
      setFeedbackData({
        isCorrect,
        matrixResult,
        feedbackText: currentQuestion.customFeedbackText || "Review the leadership principles to master this concept.",
        selectedOptionText: selectedText,
        correctOptionText: correctText,
        tags: currentQuestion.tags || [],
        objective: currentQuestion.learningObjective?.title || "Leadership Style Foundations"
      })

      // Update local answers array
      const updatedAnswers = [...userAnswers, {
        questionId: currentQuestion.id,
        questionText: currentQuestion.questionText,
        loId: currentQuestion.learningObjective?.id || 1,
        loName: currentQuestion.learningObjective?.title || "Leadership Style Foundations",
        tags: currentQuestion.tags || [],
        isCorrect,
        selectedText,
        correctText,
        confidence,
        matrixResult,
        attemptNumber: 1
      }]
      setUserAnswers(updatedAnswers)

    } catch (err) {
      console.error(err)
      alert('Error submitting answer.')
    } finally {
      setSubmittingAnswer(false)
    }
  }

  const handleFeedbackProceed = () => {
    setFeedbackData(null);
    if (qIndex < questions.length - 1) {
      setQIndex(prev => prev + 1);
      setSelectedOptId(null);
      setConfidence(null);
    } else {
      // Round is over — compute round stats and show round results screen
      const activeItem = playlist[currentIndex];
      if (activeItem.id === 'final') {
        completeFinalAssessment(userAnswers);
        return;
      }
      // Merge this round's answers with all previous rounds
      const merged = [...allRoundAnswers, ...userAnswers];
      setAllRoundAnswers(merged);
      setAssessmentStarted(false);

      // Count matrix states for THIS round only
      const counts = { MASTERED: 0, MISINFORMED: 0, DOUBTFUL: 0, UNINFORMED: 0, NEUTRAL: 0 };
      userAnswers.forEach(a => { counts[a.matrixResult] = (counts[a.matrixResult] || 0) + 1; });

      // Total mastered across ALL rounds (distinct question IDs that ended up MASTERED)
      const masteredIds = new Set(
        merged.filter(a => a.matrixResult === 'MASTERED').map(a => a.questionId)
      );

      setRoundResults({
        roundNumber,
        totalQuestionsThisRound: userAnswers.length,
        counts,
        masteredSoFar: masteredIds.size,
        thisRoundAnswers: userAnswers,
      });
    }
  };

  // Called from the round results screen: start next round OR proceed to final scoring
  const handleRoundProceed = (action) => {
    if (action === 'next_round') {
      setRoundNumber(prev => prev + 1);
      setRoundResults(null);
      startAssessment('ADAPTIVE_ROUND');
    } else if (action === 'complete') {
      setRoundResults(null);
      completePreAssessment(allRoundAnswers);
    }
  };

  const completePreAssessment = (answers) => {
    // 1. Group answers by Learning Objective to determine mastery
    const loStats = {}
    answers.forEach(ans => {
      if (!loStats[ans.loId]) {
        loStats[ans.loId] = { loId: ans.loId, name: ans.loName, correct: 0, total: 0, tags: ans.tags }
      }
      loStats[ans.loId].total += 1
      if (ans.isCorrect) loStats[ans.loId].correct += 1
    })

    const results = Object.values(loStats).map(stat => {
      const score = Math.round((stat.correct / stat.total) * 100)
      return {
        loId: stat.loId,
        name: stat.name,
        tags: stat.tags,
        score: score,
        mastered: score >= 70 // Mastery threshold is 70%
      }
    })

    setPreAssessmentResults({
      loResults: results,
      answers: answers
    })

    setCompletedAssessments(prev => ({ ...prev, pre: true }))
    setAssessmentStarted(false)

    // 2. Perform the Adaptive Split: Rebuild the playlist
    const masteredLoIds = results.filter(r => r.mastered).map(r => r.loId)

    // filter learning modules: skip modules tied to Mastered Learning Objectives
    const adaptiveModules = originalModules.filter(m => {
      if (!m.learningObjective) return true // Keep unlinked modules
      return !masteredLoIds.includes(m.learningObjective.id)
    })

    const newPlaylist = []
    originalIntros.forEach(p => newPlaylist.push({ type: 'intro', id: p.id, title: p.title, content: p.htmlContent || p.content }))
    newPlaylist.push({ type: 'assessment', id: 'pre', title: 'Pre-Assessment Diagnostic' })
    adaptiveModules.forEach(m => newPlaylist.push({ type: 'module', id: m.id, title: m.title, content: m.htmlContent }))
    newPlaylist.push({ type: 'assessment', id: 'final', title: 'Final Certification Exam' })
    newPlaylist.push({ type: 'results', id: 'results', title: 'Course Results' })

    setPlaylist(newPlaylist)

    // Find where the diagnostic page is now, so we don't disrupt current view state
    const diagIndex = newPlaylist.findIndex(item => item.type === 'assessment' && item.id === 'pre')
    setCurrentIndex(diagIndex)
    setHighestUnlockedIndex(diagIndex + 1) // Unlock the first adaptive module
  }

  const completeFinalAssessment = (answers) => {
    const correctCount = answers.filter(a => a.isCorrect).length
    const score = Math.round((correctCount / answers.length) * 100)

    setFinalAssessmentResults({
      score,
      answers
    })

    setCompletedAssessments(prev => ({ ...prev, final: true }))
    setAssessmentStarted(false)

    // Unlock final results page
    const finalIndex = playlist.findIndex(item => item.type === 'assessment' && item.id === 'final')
    setHighestUnlockedIndex(finalIndex + 1)
  }

  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (!course) return <div>Course not found.</div>

  const activeItem = playlist[currentIndex]

  // Render proper matrix state badges
  const renderMatrixBadge = (state) => {
    const badges = {
      MASTERED: { bg: '#22c55e', text: '#fff', label: '🏆 MASTERED (Correct + Sure)' },
      MISINFORMED: { bg: '#ef4444', text: '#fff', label: '⚠️ MISINFORMED (Incorrect + Sure)' },
      DOUBTFUL: { bg: '#eab308', text: '#fff', label: '💡 DOUBTFUL (Correct + Not Sure)' },
      UNINFORMED: { bg: '#f97316', text: '#fff', label: '❌ UNINFORMED (Incorrect + Not Sure)' },
      NEUTRAL: { bg: '#6b7280', text: '#fff', label: '🤷 NEUTRAL (Skipped)' }
    }
    const badge = badges[state] || badges.NEUTRAL
    return (
      <span style={{ background: badge.bg, color: badge.text, padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
        {badge.label}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-base)', position: 'fixed', top: 0, left: 0, zIndex: 99999 }}>

      {/* Sidebar Navigation */}
      <div style={{ width: 300, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 24, borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => navigate('/learn')} className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>← Back to Dashboard</button>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{course.title}</h2>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
          {playlist.map((item, index) => {
            const isLocked = isProgressive && index > highestUnlockedIndex
            const isActive = currentIndex === index

            // Section Headers
            const isFirstIntro = index === 0
            const isPreAssess = item.type === 'assessment' && item.id === 'pre'
            const isFirstModule = item.type === 'module' && playlist[index - 1]?.type !== 'module'
            const isFinalAssess = item.type === 'assessment' && item.id === 'final'

            return (
              <div key={`${item.type}-${item.id}`} style={{ padding: '0 16px' }}>
                {isFirstIntro && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 12 }}>Introduction</div>}
                {isPreAssess && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 24 }}>Diagnostic</div>}
                {isFirstModule && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 24 }}>Adaptive Path</div>}
                {isFinalAssess && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 24 }}>Certification</div>}

                <div
                  onClick={() => !isLocked && setCurrentIndex(index)}
                  style={{
                    padding: '12px 16px', borderRadius: 8, cursor: isLocked ? 'not-allowed' : 'pointer', marginBottom: 4, fontWeight: 500, fontSize: 14,
                    background: isActive ? 'var(--accent)' : 'transparent',
                    color: isActive ? '#fff' : isLocked ? 'var(--text-muted)' : 'var(--text-primary)',
                    opacity: isLocked ? 0.6 : 1,
                    display: 'flex', alignItems: 'center', gap: 12
                  }}
                >
                  <span style={{ fontSize: 16 }}>
                    {isLocked ? '🔒' : item.type === 'intro' ? '📄' : item.type === 'module' ? '🧩' : item.type === 'assessment' ? '📝' : '🏆'}
                  </span>
                  <span style={{ flex: 1 }}>{item.title}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', position: 'relative' }}>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeItem ? (
            <div style={{ padding: '64px 48px', maxWidth: 950, margin: '0 auto', paddingBottom: 120 }}>
              <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 48 }}>{activeItem.title}</h1>

              {(activeItem.type === 'intro' || activeItem.type === 'module') && (
                <BlockRenderer blocksJson={activeItem.content} />
              )}

              {activeItem.type === 'assessment' && !assessmentStarted && (
                <>
                  {/* Pre-Assessment Diagnostics Card */}
                  {activeItem.id === 'pre' && completedAssessments.pre && preAssessmentResults && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

                      {/* Overall Diagnostics Dashboard */}
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
                        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Diagnostic Results Summary</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>We have calculated your matrix state across all learning objectives.</p>
                      </div>

                      {/* LO Mastery Breakdown */}
                      <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Learning Objective Mastery</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {preAssessmentResults.loResults.map(res => (
                            <div
                              key={res.loId}
                              style={{
                                padding: '16px 20px', borderRadius: 8,
                                background: res.mastered ? 'rgba(34, 197, 94, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                                border: `1px solid ${res.mastered ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: 15 }}>🎯 {res.name}</div>
                                  {res.tags && res.tags.length > 0 && (
                                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                      {res.tags.map(t => (
                                        <span key={t} style={{ fontSize: 10, background: 'var(--border)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                                          🏷️ {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontWeight: 700, fontSize: 13, color: res.mastered ? '#22c55e' : '#ef4444' }}>
                                    {res.mastered ? '✅ SKIPPED (Mastered)' : '🧩 REQUIRED (Remediation)'}
                                  </span>
                                </div>
                              </div>
                              <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${res.score}%`, height: '100%', background: res.mastered ? '#22c55e' : '#ef4444' }} />
                              </div>
                              <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginTop: 4 }}>
                                Objective Score: {res.score}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Detailed Attempts Log / Breakdown */}
                      <div>
                        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Detailed Attempt Log</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {preAssessmentResults.answers.map((ans, idx) => (
                            <div key={idx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>Question {idx + 1} (Attempt #{ans.attemptNumber})</div>
                                {renderMatrixBadge(ans.matrixResult)}
                              </div>
                              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>{ans.questionText}</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                                <div>
                                  <span style={{ color: 'var(--text-muted)' }}>Selected Option: </span>
                                  <span style={{ fontWeight: 600, color: ans.isCorrect ? '#22c55e' : '#ef4444' }}>{ans.selectedText}</span>
                                </div>
                                {!ans.isCorrect && (
                                  <div>
                                    <span style={{ color: 'var(--text-muted)' }}>Correct Option: </span>
                                    <span style={{ fontWeight: 600, color: '#22c55e' }}>{ans.correctText}</span>
                                  </div>
                                )}
                                <div>
                                  <span style={{ color: 'var(--text-muted)' }}>Confidence Stated: </span>
                                  <span style={{ fontWeight: 600 }}>{ans.confidence}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <button className="btn btn-primary btn-lg" onClick={handleNext}>
                          Proceed to Unlocked Modules →
                        </button>
                      </div>

                    </div>
                  )}

                  {/* Assessment Intro Card (only when not in a round and no roundResults showing) */}
                  {!roundResults && ((activeItem.id === 'pre' && !completedAssessments.pre) || (activeItem.id === 'final' && !completedAssessments.final)) && (
                    <div style={{ padding: 48, background: 'var(--bg-input)', borderRadius: 16, textAlign: 'center', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 64, marginBottom: 24 }}>📝</div>
                      <h2 style={{ fontSize: 24, marginBottom: 16 }}>{activeItem.title}</h2>
                      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
                        {activeItem.id === 'pre'
                          ? 'This diagnostic exam will evaluate your existing knowledge. Mastered objectives will let you skip corresponding modules entirely.'
                          : 'This final exam will evaluate your mastery of the entire course.'}
                      </p>
                      <button className="btn btn-primary btn-lg" onClick={() => startAssessment(activeItem.id === 'pre' ? 'ADAPTIVE_ROUND' : 'FINAL_EXAM')}>
                        {roundNumber > 1 ? `Start Round ${roundNumber}` : 'Begin Assessment'}
                      </button>
                    </div>
                  )}

                  {/* ── Round Results Screen ── shown after each adaptive round completes */}
                  {roundResults && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                      {/* Header */}
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
                        <div style={{ fontSize: 56, marginBottom: 12 }}>🔄</div>
                        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Round {roundResults.roundNumber} Complete!</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
                          You answered {roundResults.totalQuestionsThisRound} question{roundResults.totalQuestionsThisRound !== 1 ? 's' : ''} this round.
                        </p>
                      </div>

                      {/* Matrix state breakdown for this round */}
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>This Round — Knowledge State Breakdown</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                          {[
                            { key: 'MASTERED',    icon: '🏆', label: 'Mastered',    color: '#22c55e', bg: 'rgba(34,197,94,0.08)'  },
                            { key: 'DOUBTFUL',    icon: '💡', label: 'Doubtful',    color: '#eab308', bg: 'rgba(234,179,8,0.08)'  },
                            { key: 'MISINFORMED', icon: '⚠️', label: 'Misinformed', color: '#ef4444', bg: 'rgba(239,68,68,0.08)'  },
                            { key: 'UNINFORMED',  icon: '❌', label: 'Uninformed',  color: '#f97316', bg: 'rgba(249,115,22,0.08)' },
                            { key: 'NEUTRAL',     icon: '🤷', label: 'Skipped',     color: '#6b7280', bg: 'rgba(107,114,128,0.08)'},
                          ].map(s => (
                            <div key={s.key} style={{ textAlign: 'center', padding: '16px 8px', borderRadius: 10, background: s.bg, border: `1px solid ${s.color}22` }}>
                              <div style={{ fontSize: 24 }}>{s.icon}</div>
                              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{roundResults.counts[s.key] || 0}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Mastered-so-far progress bar */}
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Overall Mastery Progress</h3>
                          <span style={{ fontSize: 20, fontWeight: 800, color: '#22c55e' }}>{roundResults.masteredSoFar} mastered</span>
                        </div>
                        <div style={{ width: '100%', height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
                          <div style={{
                            width: allRoundAnswers.length > 0
                              ? `${Math.min(100, Math.round((roundResults.masteredSoFar / new Set(allRoundAnswers.map(a => a.questionId)).size) * 100))}%`
                              : '0%',
                            height: '100%', background: '#22c55e', borderRadius: 5, transition: 'width 0.6s'
                          }} />
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                          {roundResults.masteredSoFar} of {new Set(allRoundAnswers.map(a => a.questionId)).size} unique questions mastered
                        </div>
                      </div>

                      {/* Per-question summary for this round */}
                      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Question Breakdown</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {roundResults.thisRoundAnswers.map((ans, i) => {
                            const stateColor = { MASTERED: '#22c55e', MISINFORMED: '#ef4444', DOUBTFUL: '#eab308', UNINFORMED: '#f97316', NEUTRAL: '#6b7280' }[ans.matrixResult] || '#6b7280'
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                                <div style={{ width: 28, height: 28, borderRadius: '50%', background: stateColor + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: stateColor, flexShrink: 0 }}>
                                  {i + 1}
                                </div>
                                <div style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>{ans.questionText}</div>
                                <span style={{ background: stateColor + '22', color: stateColor, padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                  {ans.matrixResult}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {/* Only show "Next Round" if there are still unmastered questions */}
                        {roundResults.counts.MASTERED < roundResults.totalQuestionsThisRound && (
                          <button className="btn btn-primary btn-lg" onClick={() => handleRoundProceed('next_round')}>
                            🔄 Start Round {roundResults.roundNumber + 1}
                          </button>
                        )}
                        <button className="btn btn-secondary btn-lg" onClick={() => handleRoundProceed('complete')}>
                          {roundResults.counts.MASTERED === roundResults.totalQuestionsThisRound
                            ? '🎉 All Mastered — See Results'
                            : '📊 View Full Results'}
                        </button>
                      </div>

                    </div>
                  )}

                  {/* Final Exam Completed Card */}
                  {activeItem.id === 'final' && completedAssessments.final && finalAssessmentResults && (
                    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
                      <div style={{ fontSize: 64, marginBottom: 24 }}>🏆</div>
                      <h2 style={{ fontSize: 24, marginBottom: 16 }}>Final Exam Completed</h2>
                      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>Your final score: {finalAssessmentResults.score}%</p>
                      <button className="btn btn-primary btn-lg" onClick={handleNext}>
                        View Course Results →
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Assessment In Progress (Unified Inline Feedback Quiz Page) */}
              {assessmentStarted && questions.length > 0 && (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                    <span>Objective: {questions[qIndex].learningObjective?.title || "Leadership Styles"}</span>
                    <span>Question {qIndex + 1} of {questions.length}</span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, marginBottom: 32, overflow: 'hidden' }}>
                    <div style={{ width: `${((qIndex + 1) / questions.length) * 100}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }} />
                  </div>

                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>{questions[qIndex].questionText}</h3>

                  {/* Options List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                    {questions[qIndex].options?.map(opt => {
                      const isSelected = selectedOptId === opt.id
                      const isOptCorrect = opt.correct || opt.isCorrect

                      // Visual States during Feedback Mode
                      let cardBackground = 'var(--bg-input)'
                      let cardBorderColor = 'var(--border)'

                      if (feedbackData) {
                        if (isSelected) {
                          cardBackground = feedbackData.isCorrect ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)'
                          cardBorderColor = feedbackData.isCorrect ? '#22c55e' : '#ef4444'
                        } else if (isOptCorrect) {
                          // Highlight the correct answer if the learner guessed wrong
                          cardBackground = 'rgba(34, 197, 94, 0.04)'
                          cardBorderColor = '#22c55e'
                        }
                      } else {
                        // Normal active hover states
                        if (isSelected) {
                          cardBackground = 'rgba(59, 130, 246, 0.08)'
                          cardBorderColor = 'var(--accent)'
                        }
                      }

                      return (
                        <div
                          key={opt.id}
                          onClick={() => !feedbackData && confidence !== 'DONT_KNOW' && setSelectedOptId(opt.id)}
                          style={{
                            padding: '16px 20px', borderRadius: 8, border: '1px solid', cursor: feedbackData || confidence === 'DONT_KNOW' ? 'not-allowed' : 'pointer',
                            background: cardBackground,
                            borderColor: cardBorderColor,
                            opacity: !feedbackData && confidence === 'DONT_KNOW' ? 0.5 : 1,
                            transition: 'all 0.2s', fontWeight: 500
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>{opt.optionText}</span>
                            {feedbackData && (
                              <span>
                                {isOptCorrect && '✅'}
                                {isSelected && !isOptCorrect && '❌'}
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Confidence selection */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginBottom: 24 }}>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>
                      Select your Confidence Level
                    </h4>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleConfidenceSelect('SURE')}
                        disabled={!!feedbackData}
                        style={{
                          flex: 1, padding: '16px 12px', borderRadius: 8, border: '1px solid var(--border)',
                          background: confidence === 'SURE' ? '#22c55e' : 'var(--bg-input)',
                          color: confidence === 'SURE' ? '#fff' : 'var(--text-primary)',
                          cursor: feedbackData ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          opacity: feedbackData && confidence !== 'SURE' ? 0.4 : 1
                        }}
                      >
                        <span style={{ fontSize: 20 }}>🎯</span>
                        I am SURE
                      </button>

                      <button
                        onClick={() => handleConfidenceSelect('NOT_SURE')}
                        disabled={!!feedbackData}
                        style={{
                          flex: 1, padding: '16px 12px', borderRadius: 8, border: '1px solid var(--border)',
                          background: confidence === 'NOT_SURE' ? '#eab308' : 'var(--bg-input)',
                          color: confidence === 'NOT_SURE' ? '#fff' : 'var(--text-primary)',
                          cursor: feedbackData ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          opacity: feedbackData && confidence !== 'NOT_SURE' ? 0.4 : 1
                        }}
                      >
                        <span style={{ fontSize: 20 }}>⚡</span>
                        I am NOT SURE
                      </button>

                      <button
                        onClick={() => handleConfidenceSelect('DONT_KNOW')}
                        disabled={!!feedbackData}
                        style={{
                          flex: 1, padding: '16px 12px', borderRadius: 8, border: '1px solid var(--border)',
                          background: confidence === 'DONT_KNOW' ? '#6b7280' : 'var(--bg-input)',
                          color: confidence === 'DONT_KNOW' ? '#fff' : 'var(--text-primary)',
                          cursor: feedbackData ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                          opacity: feedbackData && confidence !== 'DONT_KNOW' ? 0.4 : 1
                        }}
                      >
                        <span style={{ fontSize: 20 }}>🤷</span>
                        I DON'T KNOW
                      </button>
                    </div>
                  </div>

                  {/* Immediate Feedback Block (Renders Inline directly below options) */}
                  {feedbackData && (
                    <div style={{
                      background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 32,
                      borderLeft: `6px solid ${feedbackData.isCorrect ? '#22c55e' : feedbackData.matrixResult === 'NEUTRAL' ? '#6b7280' : '#ef4444'}`
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span style={{ fontWeight: 800, color: feedbackData.isCorrect ? '#22c55e' : '#ef4444', fontSize: 16 }}>
                          {feedbackData.isCorrect ? '✨ Correct Response!' : feedbackData.matrixResult === 'NEUTRAL' ? 'Skipped' : '❌ Incorrect Response'}
                        </span>
                        {renderMatrixBadge(feedbackData.matrixResult)}
                      </div>

                      <div style={{ marginBottom: 16 }}>
                        <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Explanation</h4>
                        <p style={{ margin: 0, lineHeight: 1.6, fontSize: 14 }}>{feedbackData.feedbackText}</p>
                      </div>

                      {feedbackData.tags && feedbackData.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: 6 }}>
                          {feedbackData.tags.map(t => (
                            <span key={t} style={{ fontSize: 10, background: 'var(--border)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                              🏷️ {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submission & Progression Buttons */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {!feedbackData ? (
                      <button
                        className="btn btn-primary btn-lg"
                        onClick={submitAnswer}
                        disabled={submittingAnswer}
                      >
                        {submittingAnswer ? 'Saving...' : 'Submit Answer'}
                      </button>
                    ) : (
                      <button className="btn btn-primary btn-lg" onClick={handleFeedbackProceed}>
                        {qIndex === questions.length - 1 ? 'Finish Assessment' : 'Next Question →'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeItem.type === 'results' && (
                <div style={{ padding: 48, background: 'var(--bg-input)', borderRadius: 16, textAlign: 'center', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 64, marginBottom: 24 }}>🏆</div>
                  <h2 style={{ fontSize: 24, marginBottom: 16 }}>Course Completed!</h2>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>You have successfully navigated your custom adaptive learning workflow!</p>
                  <button className="btn btn-primary" onClick={() => navigate('/learn')}>Return to Dashboard</button>
                </div>
              )}

            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Select an item from the menu to begin.
            </div>
          )}
        </div>

        {/* Sticky Bottom Navigation Bar */}
        {activeItem && !assessmentStarted && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 80, background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.1)'
          }}>
            <button
              className="btn btn-secondary"
              style={{ minWidth: 140 }}
              onClick={handlePrev}
              disabled={currentIndex === 0}
            >
              ← Previous
            </button>

            <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>
              Step {currentIndex + 1} of {playlist.length}
            </div>

            <button
              className="btn btn-primary"
              style={{ minWidth: 140 }}
              onClick={handleNext}
              disabled={currentIndex === playlist.length - 1 || (currentIndex === playlist.findIndex(p => p.type === 'assessment' && p.id === 'pre') && !completedAssessments.pre) || (currentIndex === playlist.findIndex(p => p.type === 'assessment' && p.id === 'final') && !completedAssessments.final)}
            >
              Continue →
            </button>
          </div>
        )}

      </div>

    </div>
  )
}
