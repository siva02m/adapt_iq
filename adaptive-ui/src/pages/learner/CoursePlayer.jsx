import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import client from '../../api/client'
import BlockRenderer from '../../components/BlockRenderer'
import { useAuth } from '../../contexts/AuthContext'

export default function CoursePlayer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [course, setCourse] = useState(null)

  // ── Master Playlist ──────────────────────────────────────────────────────────
  const [playlist, setPlaylist] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  // Original copies for adaptive rebuilding
  const [originalIntros, setOriginalIntros] = useState([])
  const [originalModules, setOriginalModules] = useState([])

  // Track which module IDs have already been injected (prevents re-injection)
  const [seenModuleIds, setSeenModuleIds] = useState(new Set())

  // ── Navigation ───────────────────────────────────────────────────────────────
  // isProgressive derived from course.navigationMode after load; default true
  const [isProgressive, setIsProgressive] = useState(true)
  const [highestUnlockedIndex, setHighestUnlockedIndex] = useState(0)

  // ── Assessment Completion Registry ───────────────────────────────────────────
  const [completedAssessments, setCompletedAssessments] = useState({
    pre: false,
    final: false
  })

  // ── Results Data ─────────────────────────────────────────────────────────────
  const [preAssessmentResults, setPreAssessmentResults] = useState(null)
  const [finalAssessmentResults, setFinalAssessmentResults] = useState(null)

  // ── Active Quiz Engine ───────────────────────────────────────────────────────
  const [questions, setQuestions] = useState([])
  const [assessmentStarted, setAssessmentStarted] = useState(false)
  const [examMode, setExamMode] = useState(null) // null | 'ADAPTIVE' | 'FINAL'
  const [qIndex, setQIndex] = useState(0)
  const [selectedOptId, setSelectedOptId] = useState(null)
  const [confidence, setConfidence] = useState(null)
  const [submittingAnswer, setSubmittingAnswer] = useState(false)
  const [userAnswers, setUserAnswers] = useState([]) // current round answers

  // ── Round Tracking ───────────────────────────────────────────────────────────
  const [roundNumber, setRoundNumber] = useState(1)
  const [allRoundAnswers, setAllRoundAnswers] = useState([]) // all rounds merged
  const [roundResults, setRoundResults] = useState(null)    // shown after each round

  // ── Feedback ─────────────────────────────────────────────────────────────────
  const [feedbackData, setFeedbackData] = useState(null)

  // ── Module injection state ───────────────────────────────────────────────────
  // When truthy, contains count of modules injected after current round
  const [injectedModulesPending, setInjectedModulesPending] = useState(0)

  // ── Results Review Mode ───────────────────────────────────────────────────────
  // reviewMode: 'list' (collapsible Q list) | 'paged' (page-by-page) | null
  const [reviewMode, setReviewMode] = useState(null)
  const [reviewIndex, setReviewIndex] = useState(0)
  const [expandedQuestions, setExpandedQuestions] = useState(new Set())

  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => { loadCourseData() }, [id])

  // Reset quiz state when navigating to a different playlist item
  useEffect(() => {
    setAssessmentStarted(false)
    setFeedbackData(null)
    setRoundResults(null)
    setQuestions([])
    setQIndex(0)
    setSelectedOptId(null)
    setConfidence(null)
    setExamMode(null)
    setRoundNumber(1)
    setAllRoundAnswers([])
    setUserAnswers([])
    // Reset review mode when leaving the results page
    setReviewMode(null)
    setReviewIndex(0)
    setExpandedQuestions(new Set())
  }, [currentIndex])

  // ── Data Loading ─────────────────────────────────────────────────────────────

  const loadCourseData = async () => {
    try {
      const [cRes, introRes, modRes] = await Promise.all([
        client.get(`/api/courses/${id}`),
        client.get(`/api/courses/${id}/intro-pages`),
        client.get(`/api/courses/${id}/learning-modules`)
      ])

      const courseData = cRes.data
      setCourse(courseData)

      // Respect navigationMode from course settings
      const navMode = courseData.navigationMode || 'PROGRESSIVE'
      setIsProgressive(navMode !== 'OPEN')

      const sortedIntros = introRes.data.sort((a, b) => a.displayOrder - b.displayOrder)
      const sortedModules = modRes.data.sort((a, b) => a.displayOrder - b.displayOrder)

      setOriginalIntros(sortedIntros)
      setOriginalModules(sortedModules)

      buildInitialPlaylist(courseData, sortedIntros, sortedModules)
    } catch (err) {
      console.error(err)
      alert('Failed to load course details.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Builds the initial playlist based on course mode settings.
   * - Always: intro pages + pre-assessment
   * - If enableLearningModules: all modules (will be trimmed adaptively after round 1)
   * - If enableFinalExam: final exam item
   * - Always: results
   */
  const buildInitialPlaylist = (courseData, intros, modules) => {
    const enableModules = courseData.enableLearningModules !== false
    const enableFinal   = courseData.enableFinalExam === true

    const pl = []
    intros.forEach(p => pl.push({ type: 'intro', id: p.id, title: p.title, content: p.htmlContent || p.content }))
    pl.push({ type: 'assessment', id: 'pre', title: 'Pre-Assessment Diagnostic' })

    if (enableModules) {
      modules.forEach(m => pl.push({
        type: 'module', id: m.id, title: m.title, content: m.htmlContent,
        loId: m.learningObjective?.id || null, injected: false
      }))
    }

    if (enableFinal) {
      pl.push({ type: 'assessment', id: 'final', title: 'Final Certification Exam' })
    }

    pl.push({ type: 'results', id: 'results', title: 'Course Results' })

    setPlaylist(pl)
    setCurrentIndex(0)
  }

  // ── Navigation ───────────────────────────────────────────────────────────────

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

  // ── Quiz Engine ──────────────────────────────────────────────────────────────

  const startAssessment = async (poolType) => {
    setLoading(true)
    try {
      let res
      if (poolType === 'ADAPTIVE_ROUND') {
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
      setExamMode(poolType === 'FINAL_EXAM' ? 'FINAL' : 'ADAPTIVE')
      setAssessmentStarted(true)
    } catch (err) {
      console.error(err)
      alert('This course has no assessment questions created yet.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfidenceSelect = (level) => {
    if (feedbackData) return
    setConfidence(level)
    if (level === 'DONT_KNOW') setSelectedOptId(null)
  }

  const submitAnswer = async () => {
    const isFinalExam = examMode === 'FINAL'

    // FINAL EXAM: no confidence required — auto-compute correctness from selected option
    if (!isFinalExam) {
      if (confidence !== 'DONT_KNOW' && !selectedOptId) {
        alert("Please select an option or click \"I Don't Know\".")
        return
      }
      if (!confidence) {
        alert('Please choose your level of confidence.')
        return
      }
    } else {
      // Final exam: must have selected an option (no "I don't know")
      if (!selectedOptId) {
        alert('Please select an answer to continue.')
        return
      }
    }

    const currentQuestion = questions[qIndex]
    const selectedOption  = currentQuestion.options.find(o => o.id === selectedOptId)

    // In final exam, confidence is irrelevant — evaluate purely on correctness
    const effectiveConfidence = isFinalExam ? 'SURE' : confidence
    const isCorrect = isFinalExam
      ? (selectedOption ? (selectedOption.correct || selectedOption.isCorrect) : false)
      : (effectiveConfidence === 'DONT_KNOW' ? false : (selectedOption ? (selectedOption.correct || selectedOption.isCorrect) : false))

    let matrixResult = 'NEUTRAL'
    if (effectiveConfidence === 'SURE')     matrixResult = isCorrect ? 'MASTERED'    : 'MISINFORMED'
    if (effectiveConfidence === 'NOT_SURE') matrixResult = isCorrect ? 'DOUBTFUL'    : 'UNINFORMED'

    setSubmittingAnswer(true)
    try {
      await client.post('/api/rounds/evaluate', {
        userId:           user?.id || 1,
        questionId:       currentQuestion.id,
        selectedOptionId: isFinalExam ? selectedOptId : (effectiveConfidence === 'DONT_KNOW' ? null : selectedOptId),
        confidenceLevel:  isFinalExam ? 'SURE' : effectiveConfidence,
        attemptNumber:    1,
        roundNumber:      roundNumber,
        isCorrect
      })

      const selectedText = effectiveConfidence === 'DONT_KNOW' ? "I Don't Know" : (selectedOption ? selectedOption.optionText : 'None Selected')
      const correctText  = currentQuestion.options.find(o => o.correct || o.isCorrect)?.optionText || 'N/A'

      const newAnswer = {
        questionId:   currentQuestion.id,
        questionText: currentQuestion.questionText,
        loId:         currentQuestion.learningObjective?.id   || null,
        loName:       currentQuestion.learningObjective?.title || 'N/A',
        tags:         currentQuestion.tags || [],
        isCorrect,
        selectedText,
        correctText,
        confidence:   effectiveConfidence,
        matrixResult,
        attemptNumber: 1
      }

      const updatedAnswers = [...userAnswers, newAnswer]
      setUserAnswers(updatedAnswers)

      if (isFinalExam) {
        // Final exam: no feedback card — advance immediately
        advanceFinalExam(updatedAnswers)
      } else {
        // Adaptive: show inline feedback
        setFeedbackData({
          isCorrect,
          matrixResult,
          feedbackText: currentQuestion.customFeedbackText || 'Review the material to master this concept.',
          selectedOptionText: selectedText,
          correctOptionText:  correctText,
          tags:      currentQuestion.tags || [],
          objective: currentQuestion.learningObjective?.title || 'N/A'
        })
      }
    } catch (err) {
      console.error(err)
      alert('Error submitting answer.')
    } finally {
      setSubmittingAnswer(false)
    }
  }

  /**
   * Final exam: skip feedback, advance question or finish exam.
   */
  const advanceFinalExam = (answers) => {
    if (qIndex < questions.length - 1) {
      setQIndex(prev => prev + 1)
      setSelectedOptId(null)
    } else {
      completeFinalAssessment(answers)
    }
  }

  /**
   * Adaptive: "Next Question" after seeing inline feedback.
   */
  const handleFeedbackProceed = () => {
    setFeedbackData(null)
    if (qIndex < questions.length - 1) {
      setQIndex(prev => prev + 1)
      setSelectedOptId(null)
      setConfidence(null)
    } else {
      // Round is over → compute round results
      const activeItem = playlist[currentIndex]
      if (activeItem.id === 'final') {
        completeFinalAssessment(userAnswers)
        return
      }

      const merged = [...allRoundAnswers, ...userAnswers]
      setAllRoundAnswers(merged)
      setAssessmentStarted(false)

      const counts = { MASTERED: 0, MISINFORMED: 0, DOUBTFUL: 0, UNINFORMED: 0, NEUTRAL: 0 }
      userAnswers.forEach(a => { counts[a.matrixResult] = (counts[a.matrixResult] || 0) + 1 })

      const masteredIds = new Set(merged.filter(a => a.matrixResult === 'MASTERED').map(a => a.questionId))

      setRoundResults({
        roundNumber,
        totalQuestionsThisRound: userAnswers.length,
        counts,
        masteredSoFar: masteredIds.size,
        thisRoundAnswers: userAnswers,
        unmasteredAnswers: userAnswers.filter(a => a.matrixResult !== 'MASTERED')
      })
    }
  }

  /**
   * Called from round results screen.
   * action: 'next_round' | 'complete'
   * Before starting the next round, inject modules for unmastered LOs.
   */
  const handleRoundProceed = async (action) => {
    if (action === 'next_round') {
      // --- Task 1.3: Dynamic Module Injection ---
      const enableModules = course?.enableLearningModules !== false
      if (enableModules && roundResults) {
        // Collect unique LO IDs that are NOT mastered in any round so far
        const mergedAll = [...allRoundAnswers] // already includes this round's answers
        const masteredLoIds = new Set(
          mergedAll.filter(a => a.matrixResult === 'MASTERED').map(a => a.loId).filter(Boolean)
        )
        const unmasteredLoIds = [
          ...new Set(
            mergedAll
              .filter(a => a.matrixResult !== 'MASTERED' && a.loId)
              .map(a => a.loId)
              .filter(loId => !masteredLoIds.has(loId))
          )
        ]

        if (unmasteredLoIds.length > 0) {
          try {
            const params = `loIds=${unmasteredLoIds.join(',')}`
            const res = await client.get(`/api/courses/${id}/learning-modules?${params}`)
            const candidateModules = res.data || []

            // Filter out modules already seen
            const newModules = candidateModules.filter(m => !seenModuleIds.has(m.id))

            if (newModules.length > 0) {
              // Mark them as seen
              const newSeen = new Set(seenModuleIds)
              newModules.forEach(m => newSeen.add(m.id))
              setSeenModuleIds(newSeen)

              // Build new playlist items for injection
              const injectedItems = newModules.map(m => ({
                type: 'module',
                id: m.id,
                title: m.title,
                content: m.htmlContent,
                loId: m.learningObjective?.id || null,
                injected: true  // flag for sidebar styling
              }))

              // Insert right after current assessment item
              setPlaylist(prev => {
                const updated = [...prev]
                updated.splice(currentIndex + 1, 0, ...injectedItems)
                return updated
              })

              // Unlock the injected modules so learner can proceed
              setHighestUnlockedIndex(currentIndex + newModules.length)
              setInjectedModulesPending(newModules.length)

              // Navigate to first injected module immediately
              setRoundResults(null)
              setCurrentIndex(currentIndex + 1)

              // Prepare round number for when they return
              setRoundNumber(prev => prev + 1)
              return // don't start next round yet — learner must complete modules
            }
          } catch (err) {
            console.error('Module injection fetch failed:', err)
            // Graceful degradation — continue without injection
          }
        }
      }

      // No modules to inject → start next round directly
      setRoundNumber(prev => prev + 1)
      setRoundResults(null)
      startAssessment('ADAPTIVE_ROUND')
    } else if (action === 'complete') {
      setRoundResults(null)
      completePreAssessment(allRoundAnswers)
    }
  }

  const completePreAssessment = (answers) => {
    const loStats = {}
    answers.forEach(ans => {
      if (!loStats[ans.loId]) {
        loStats[ans.loId] = { loId: ans.loId, name: ans.loName, correct: 0, total: 0, tags: ans.tags }
      }
      loStats[ans.loId].total  += 1
      if (ans.isCorrect) loStats[ans.loId].correct += 1
    })

    const results = Object.values(loStats).map(stat => {
      const score = Math.round((stat.correct / stat.total) * 100)
      return { loId: stat.loId, name: stat.name, tags: stat.tags, score, mastered: score >= 70 }
    })

    setPreAssessmentResults({ loResults: results, answers })
    setCompletedAssessments(prev => ({ ...prev, pre: true }))
    setAssessmentStarted(false)

    // Rebuild playlist: remove non-mastered modules (already injected ones consumed)
    const masteredLoIds = results.filter(r => r.mastered).map(r => r.loId)
    const adaptiveModules = originalModules.filter(m => {
      if (!m.learningObjective) return true
      return !masteredLoIds.includes(m.learningObjective.id)
    })

    const enableFinal = course?.enableFinalExam === true
    const newPlaylist = []
    originalIntros.forEach(p => newPlaylist.push({ type: 'intro', id: p.id, title: p.title, content: p.htmlContent || p.content }))
    newPlaylist.push({ type: 'assessment', id: 'pre', title: 'Pre-Assessment Diagnostic' })
    adaptiveModules.forEach(m => newPlaylist.push({ type: 'module', id: m.id, title: m.title, content: m.htmlContent, loId: m.learningObjective?.id || null, injected: false }))
    if (enableFinal) newPlaylist.push({ type: 'assessment', id: 'final', title: 'Final Certification Exam' })
    newPlaylist.push({ type: 'results', id: 'results', title: 'Course Results' })

    setPlaylist(newPlaylist)
    const diagIndex = newPlaylist.findIndex(item => item.type === 'assessment' && item.id === 'pre')
    setCurrentIndex(diagIndex)
    setHighestUnlockedIndex(diagIndex + 1)
  }

  const completeFinalAssessment = (answers) => {
    const correctCount = answers.filter(a => a.isCorrect).length
    const score = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0
    const passingScore = course?.passingScorePercent || 70
    const passed = score >= passingScore

    setFinalAssessmentResults({ score, answers, passed, passingScore })
    setCompletedAssessments(prev => ({ ...prev, final: true }))
    setAssessmentStarted(false)

    const finalIndex = playlist.findIndex(item => item.type === 'assessment' && item.id === 'final')
    setHighestUnlockedIndex(finalIndex + 1)
  }

  const handleDownloadCertificate = () => {
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Certificate of Completion</title>
      <style>
        body { font-family: Georgia, serif; text-align: center; padding: 80px 60px; background: #fff; color: #1a1a1a; }
        .border { border: 8px double #b8860b; padding: 60px; max-width: 700px; margin: 0 auto; }
        h1 { font-size: 38px; color: #b8860b; margin-bottom: 8px; }
        h2 { font-size: 22px; font-weight: normal; margin: 0 0 40px; color: #555; }
        .name { font-size: 28px; font-weight: bold; margin: 24px 0; border-bottom: 2px solid #b8860b; padding-bottom: 12px; }
        .course { font-size: 20px; margin: 16px 0 32px; color: #333; }
        .date { font-size: 14px; color: #888; margin-top: 40px; }
        .seal { font-size: 60px; margin: 20px 0; }
        @media print { body { -webkit-print-color-adjust: exact; } }
      </style></head>
      <body>
        <div class="border">
          <div class="seal">🎓</div>
          <h1>Certificate of Completion</h1>
          <h2>This is to certify that</h2>
          <div class="name">${user?.fullName || user?.email || 'Learner'}</div>
          <div class="course">has successfully completed</div>
          <div style="font-size:24px; font-weight:bold; color:#1a1a1a;">${course?.title || 'Course'}</div>
          <div class="date">Completed on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
          <div style="margin-top:48px; font-size:13px; color:#aaa;">AdaptIQ Adaptive Learning Platform</div>
        </div>
        <script>window.onload = () => window.print()</script>
      </body></html>
    `)
    win.document.close()
  }

  // ── Rendering Helpers ────────────────────────────────────────────────────────

  if (loading) return <div className="loading-page"><div className="spinner" /></div>
  if (!course)  return <div>Course not found.</div>

  const activeItem = playlist[currentIndex]

  const renderMatrixBadge = (state) => {
    const badges = {
      MASTERED:    { bg: '#22c55e', text: '#fff', label: '🏆 MASTERED'    },
      MISINFORMED: { bg: '#ef4444', text: '#fff', label: '⚠️ MISINFORMED' },
      DOUBTFUL:    { bg: '#eab308', text: '#fff', label: '💡 DOUBTFUL'    },
      UNINFORMED:  { bg: '#f97316', text: '#fff', label: '❌ UNINFORMED'  },
      NEUTRAL:     { bg: '#6b7280', text: '#fff', label: '🤷 NEUTRAL'     }
    }
    const badge = badges[state] || badges.NEUTRAL
    return (
      <span style={{ background: badge.bg, color: badge.text, padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
        {badge.label}
      </span>
    )
  }

  // ── End-of-Course Results Screen (Task 1.5) ──────────────────────────────────

  const renderCourseResults = () => {
    // Build a deduplicated question list from all adaptive rounds.
    // For each question, use the LAST attempt (most recent knowledge state).
    const questionMap = new Map()
    ;(preAssessmentResults?.answers || allRoundAnswers).forEach(ans => {
      questionMap.set(ans.questionId, ans) // later entries overwrite earlier
    })
    const allQs = [...questionMap.values()]

    // Summary stats
    const masteredCount    = allQs.filter(a => a.matrixResult === 'MASTERED').length
    const misinformedCount = allQs.filter(a => a.matrixResult === 'MISINFORMED').length
    const doubtfulCount    = allQs.filter(a => a.matrixResult === 'DOUBTFUL').length
    const uninformedCount  = allQs.filter(a => a.matrixResult === 'UNINFORMED').length
    const totalQs          = allQs.length

    const toggleExpand = (qId) => {
      setExpandedQuestions(prev => {
        const next = new Set(prev)
        next.has(qId) ? next.delete(qId) : next.add(qId)
        return next
      })
    }

    const stateColour = { MASTERED: '#22c55e', MISINFORMED: '#ef4444', DOUBTFUL: '#eab308', UNINFORMED: '#f97316', NEUTRAL: '#6b7280' }

    // ── PAGED REVIEW MODE ─────────────────────────────────────────────────────
    if (reviewMode === 'paged' && allQs.length > 0) {
      const q = allQs[reviewIndex]
      const col = stateColour[q.matrixResult] || '#6b7280'
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setReviewMode('list')}>
              ← Back to Results
            </button>
            <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>
              Question {reviewIndex + 1} of {allQs.length}
            </span>
            <span style={{ background: col + '22', color: col, padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
              {q.matrixResult}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: 4, background: 'var(--border)', borderRadius: 2 }}>
            <div style={{ width: `${((reviewIndex + 1) / allQs.length) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
          </div>

          {/* Question card */}
          <div style={{ background: 'var(--bg-secondary)', border: `2px solid ${col}44`, borderRadius: 16, padding: 32 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
              🎯 {q.loName}
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>{q.questionText}</h3>

            {/* Tags */}
            {q.tags && q.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                {q.tags.map(t => (
                  <span key={t} style={{ fontSize: 10, background: 'var(--border)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                    🏷️ {t}
                  </span>
                ))}
              </div>
            )}

            {/* Answer summary */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14, marginBottom: 24 }}>
              <div style={{
                display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px', borderRadius: 8,
                background: q.isCorrect ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${q.isCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`
              }}>
                <span style={{ fontSize: 18 }}>{q.isCorrect ? '✅' : '❌'}</span>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Your Answer</div>
                  <div style={{ color: q.isCorrect ? '#22c55e' : '#ef4444' }}>{q.selectedText}</div>
                </div>
              </div>
              {!q.isCorrect && (
                <div style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px', borderRadius: 8,
                  background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)'
                }}>
                  <span style={{ fontSize: 18 }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>Correct Answer</div>
                    <div style={{ color: '#22c55e' }}>{q.correctText}</div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, padding: '12px 16px', borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 18 }}>💬</span>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Confidence Stated</div>
                  <div>{q.confidence}</div>
                </div>
              </div>
            </div>

            {/* Matrix state explanation */}
            <div style={{
              padding: '14px 18px', borderRadius: 8,
              background: col + '11', border: `1px solid ${col}33`
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: col, textTransform: 'uppercase', marginBottom: 6 }}>Knowledge State</div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                {{
                  MASTERED:    'You answered correctly AND were confident. Full mastery demonstrated! ✨',
                  MISINFORMED: 'You were confident but answered incorrectly. High-priority area to revisit! ⚠️',
                  DOUBTFUL:    'You answered correctly but lacked confidence. Keep practising to solidify this! 💡',
                  UNINFORMED:  'You answered incorrectly and were unsure. This topic needs more study. 📚',
                  NEUTRAL:     'This question was skipped or the knowledge state could not be determined.'
                }[q.matrixResult] || 'Knowledge state recorded.'}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <button
              className="btn btn-secondary"
              style={{ minWidth: 120 }}
              onClick={() => setReviewIndex(prev => Math.max(0, prev - 1))}
              disabled={reviewIndex === 0}
            >
              ← Previous
            </button>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {allQs.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setReviewIndex(i)}
                  style={{
                    width: 8, height: 8, borderRadius: '50%', border: 'none', cursor: 'pointer',
                    background: i === reviewIndex ? 'var(--accent)' : 'var(--border)',
                    padding: 0
                  }}
                />
              ))}
            </span>
            {reviewIndex < allQs.length - 1 ? (
              <button
                className="btn btn-primary"
                style={{ minWidth: 120 }}
                onClick={() => setReviewIndex(prev => Math.min(allQs.length - 1, prev + 1))}
              >
                Next →
              </button>
            ) : (
              <button className="btn btn-secondary" style={{ minWidth: 120 }} onClick={() => setReviewMode('list')}>
                Back to Results
              </button>
            )}
          </div>
        </div>
      )
    }

    // ── MAIN RESULTS PAGE (list mode or null) ─────────────────────────────────
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Hero banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(139,92,246,0.12) 100%)',
          border: '1px solid rgba(139,92,246,0.2)', borderRadius: 20, padding: '48px 40px', textAlign: 'center'
        }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🏆</div>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Course Complete!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 16 }}>
            You have completed your personalised adaptive learning journey for <strong>{course?.title}</strong>.
          </p>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { count: masteredCount,    label: 'Mastered',    icon: '🏆', color: '#22c55e' },
            { count: doubtfulCount,    label: 'Doubtful',    icon: '💡', color: '#eab308' },
            { count: misinformedCount, label: 'Misinformed', icon: '⚠️', color: '#ef4444' },
            { count: uninformedCount,  label: 'Uninformed',  icon: '❌', color: '#f97316' },
          ].map(kpi => (
            <div key={kpi.label} style={{
              background: 'var(--bg-secondary)', border: `1px solid ${kpi.color}33`,
              borderRadius: 12, padding: '20px 16px', textAlign: 'center'
            }}>
              <div style={{ fontSize: 28 }}>{kpi.icon}</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: kpi.color, lineHeight: 1.1, marginTop: 4 }}>{kpi.count}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Mastery progress bar */}
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 700 }}>Overall Mastery</span>
            <span style={{ fontWeight: 800, color: '#22c55e' }}>
              {totalQs > 0 ? Math.round((masteredCount / totalQs) * 100) : 0}%
            </span>
          </div>
          <div style={{ width: '100%', height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{
              width: totalQs > 0 ? `${Math.round((masteredCount / totalQs) * 100)}%` : '0%',
              height: '100%', background: 'linear-gradient(90deg, #22c55e, #16a34a)', borderRadius: 5, transition: 'width 0.8s ease'
            }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            {masteredCount} of {totalQs} questions fully mastered
          </div>
        </div>

        {/* LO breakdown */}
        {preAssessmentResults?.loResults && preAssessmentResults.loResults.length > 0 && (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Learning Objective Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {preAssessmentResults.loResults.map(lo => (
                <div key={lo.loId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>🎯 {lo.name}</span>
                    <span style={{ fontWeight: 700, color: lo.mastered ? '#22c55e' : '#ef4444' }}>
                      {lo.score}% {lo.mastered ? '✅' : '❌'}
                    </span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${lo.score}%`, height: '100%', background: lo.mastered ? '#22c55e' : '#ef4444', borderRadius: 3 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final exam result (if applicable) */}
        {finalAssessmentResults && (
          <div style={{
            background: finalAssessmentResults.passed ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
            border: `1px solid ${finalAssessmentResults.passed ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            borderRadius: 14, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                {finalAssessmentResults.passed ? '🎓 Final Exam — Passed' : '📋 Final Exam — Not Passed'}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                Score: {finalAssessmentResults.score}% (Pass mark: {finalAssessmentResults.passingScore}%)
              </div>
            </div>
            {finalAssessmentResults.passed && (
              <button
                className="btn btn-sm"
                style={{ background: '#b8860b', color: '#fff', fontWeight: 700 }}
                onClick={handleDownloadCertificate}
              >
                🎓 Download Certificate
              </button>
            )}
          </div>
        )}

        {/* Collapsible question list */}
        {allQs.length > 0 && (
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>All Questions — Attempt History</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setExpandedQuestions(new Set(allQs.map(q => q.questionId)))}
                >
                  Expand All
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setExpandedQuestions(new Set())}
                >
                  Collapse All
                </button>
              </div>
            </div>

            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {allQs.map((q, idx) => {
                const col = stateColour[q.matrixResult] || '#6b7280'
                const isOpen = expandedQuestions.has(q.questionId)
                return (
                  <div key={q.questionId} style={{ border: `1px solid ${col}33`, borderRadius: 10, overflow: 'hidden' }}>
                    {/* Collapsed header row */}
                    <div
                      onClick={() => toggleExpand(q.questionId)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                        cursor: 'pointer', background: isOpen ? col + '08' : 'var(--bg-input)',
                        userSelect: 'none', transition: 'background 0.2s'
                      }}
                    >
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%', background: col + '22',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800, color: col, flexShrink: 0
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 500, lineHeight: 1.4 }}>
                        {q.questionText}
                      </div>
                      <span style={{ background: col + '22', color: col, padding: '3px 9px', borderRadius: 4, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {q.matrixResult}
                      </span>
                      <span style={{ color: 'var(--text-muted)', fontSize: 16, flexShrink: 0 }}>
                        {isOpen ? '▲' : '▼'}
                      </span>
                    </div>

                    {/* Expanded detail */}
                    {isOpen && (
                      <div style={{ padding: '16px 20px', borderTop: `1px solid ${col}22`, background: 'var(--bg-input)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14, fontSize: 13 }}>
                          <div>
                            <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Your Answer</div>
                            <div style={{ fontWeight: 600, color: q.isCorrect ? '#22c55e' : '#ef4444' }}>
                              {q.isCorrect ? '✅ ' : '❌ '}{q.selectedText}
                            </div>
                          </div>
                          {!q.isCorrect && (
                            <div>
                              <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Correct Answer</div>
                              <div style={{ fontWeight: 600, color: '#22c55e' }}>✅ {q.correctText}</div>
                            </div>
                          )}
                          <div>
                            <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Confidence</div>
                            <div style={{ fontWeight: 600 }}>{q.confidence}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>Objective</div>
                            <div style={{ fontWeight: 600 }}>🎯 {q.loName}</div>
                          </div>
                        </div>
                        {q.tags && q.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            {q.tags.map(t => (
                              <span key={t} style={{ fontSize: 10, background: 'var(--border)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>🏷️ {t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', paddingBottom: 8 }}>
          {allQs.length > 0 && (
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => { setReviewMode('paged'); setReviewIndex(0) }}
            >
              📖 Review Questions
            </button>
          )}
          {finalAssessmentResults?.passed && (
            <button
              className="btn btn-lg"
              style={{ background: '#b8860b', color: '#fff', fontWeight: 700 }}
              onClick={handleDownloadCertificate}
            >
              🎓 Download Certificate
            </button>
          )}
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/learn')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // ── Sidebar ──────────────────────────────────────────────────────────────────

  const renderSidebar = () => (

    <div style={{ width: 300, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 24, borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate('/learn')} className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}>← Back to Dashboard</button>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{course.title}</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
        {playlist.map((item, index) => {
          const isLocked  = isProgressive && index > highestUnlockedIndex
          const isActive  = currentIndex === index

          const isFirstIntro   = index === 0
          const isPreAssess    = item.type === 'assessment' && item.id === 'pre'
          const isFinalAssess  = item.type === 'assessment' && item.id === 'final'
          const isFirstModule  = item.type === 'module' && !item.injected && playlist[index - 1]?.type !== 'module'
          const isFirstInject  = item.injected && !playlist[index - 1]?.injected
          const isResults      = item.type === 'results'

          let sectionHeader = null
          if (isFirstIntro)  sectionHeader = 'Introduction'
          if (isPreAssess)   sectionHeader = 'Diagnostic'
          if (isFirstModule) sectionHeader = 'Adaptive Path'
          if (isFirstInject) sectionHeader = '📘 Recommended Study'
          if (isFinalAssess) sectionHeader = 'Certification'
          if (isResults)     sectionHeader = 'Results'

          return (
            <div key={`${item.type}-${item.id}-${index}`} style={{ padding: '0 16px' }}>
              {sectionHeader && (
                <div style={{ fontSize: 11, fontWeight: 700, color: item.injected ? '#818cf8' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 24 }}>
                  {sectionHeader}
                </div>
              )}

              <div
                onClick={() => !isLocked && setCurrentIndex(index)}
                style={{
                  padding: '12px 16px', borderRadius: 8, cursor: isLocked ? 'not-allowed' : 'pointer', marginBottom: 4, fontWeight: 500, fontSize: 14,
                  background: isActive ? (item.injected ? '#4f46e5' : 'var(--accent)') : 'transparent',
                  color: isActive ? '#fff' : isLocked ? 'var(--text-muted)' : item.injected ? '#818cf8' : 'var(--text-primary)',
                  opacity: isLocked ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', gap: 12,
                  borderLeft: item.injected && !isActive ? '2px solid #4f46e544' : 'none'
                }}
              >
                <span style={{ fontSize: 16 }}>
                  {isLocked ? '🔒' : item.type === 'intro' ? '📄' : item.type === 'module' ? (item.injected ? '📘' : '🧩') : item.type === 'assessment' ? '📝' : '🏆'}
                </span>
                <span style={{ flex: 1 }}>{item.title}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  // ── Assessment (Adaptive mode) ────────────────────────────────────────────────

  const renderAdaptiveQuestion = () => (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
        <span>Objective: {questions[qIndex].learningObjective?.title || 'General'}</span>
        <span>Question {qIndex + 1} of {questions.length}</span>
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, marginBottom: 32, overflow: 'hidden' }}>
        <div style={{ width: `${((qIndex + 1) / questions.length) * 100}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s' }} />
      </div>

      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>{questions[qIndex].questionText}</h3>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {questions[qIndex].options?.map(opt => {
          const isSelected   = selectedOptId === opt.id
          const isOptCorrect = opt.correct || opt.isCorrect
          let cardBg = 'var(--bg-input)', cardBorder = 'var(--border)'
          if (feedbackData) {
            if (isSelected)      { cardBg = feedbackData.isCorrect ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)'; cardBorder = feedbackData.isCorrect ? '#22c55e' : '#ef4444' }
            else if (isOptCorrect) { cardBg = 'rgba(34,197,94,0.04)'; cardBorder = '#22c55e' }
          } else if (isSelected) { cardBg = 'rgba(59,130,246,0.08)'; cardBorder = 'var(--accent)' }

          return (
            <div
              key={opt.id}
              onClick={() => !feedbackData && confidence !== 'DONT_KNOW' && setSelectedOptId(opt.id)}
              style={{
                padding: '16px 20px', borderRadius: 8, border: '1px solid', cursor: feedbackData || confidence === 'DONT_KNOW' ? 'not-allowed' : 'pointer',
                background: cardBg, borderColor: cardBorder,
                opacity: !feedbackData && confidence === 'DONT_KNOW' ? 0.5 : 1,
                transition: 'all 0.2s', fontWeight: 500
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{opt.optionText}</span>
                {feedbackData && <span>{isOptCorrect && '✅'}{isSelected && !isOptCorrect && '❌'}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Confidence selector (hidden in FINAL mode) */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginBottom: 24 }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>
          Select your Confidence Level
        </h4>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { level: 'SURE',      icon: '🎯', label: 'I am SURE',       activeColor: '#22c55e' },
            { level: 'NOT_SURE',  icon: '⚡', label: 'I am NOT SURE',   activeColor: '#eab308' },
            { level: 'DONT_KNOW', icon: '🤷', label: "I DON'T KNOW",    activeColor: '#6b7280' }
          ].map(({ level, icon, label, activeColor }) => (
            <button
              key={level}
              onClick={() => handleConfidenceSelect(level)}
              disabled={!!feedbackData}
              style={{
                flex: 1, padding: '16px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: confidence === level ? activeColor : 'var(--bg-input)',
                color: confidence === level ? '#fff' : 'var(--text-primary)',
                cursor: feedbackData ? 'not-allowed' : 'pointer', fontWeight: 600,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                opacity: feedbackData && confidence !== level ? 0.4 : 1
              }}
            >
              <span style={{ fontSize: 20 }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Inline feedback */}
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
                <span key={t} style={{ fontSize: 10, background: 'var(--border)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>🏷️ {t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit / Next */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {!feedbackData ? (
          <button className="btn btn-primary btn-lg" onClick={submitAnswer} disabled={submittingAnswer}>
            {submittingAnswer ? 'Saving...' : 'Submit Answer'}
          </button>
        ) : (
          <button className="btn btn-primary btn-lg" onClick={handleFeedbackProceed}>
            {qIndex === questions.length - 1 ? 'Finish Assessment' : 'Next Question →'}
          </button>
        )}
      </div>
    </div>
  )

  // ── Assessment (Final Exam mode) ──────────────────────────────────────────────

  const renderFinalExamQuestion = () => (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ background: '#7c3aed', color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>FINAL EXAM</span>
          {questions[qIndex].learningObjective?.title || 'General'}
        </span>
        <span>Question {qIndex + 1} of {questions.length}</span>
      </div>

      {/* Progress bar */}
      <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, marginBottom: 32, overflow: 'hidden' }}>
        <div style={{ width: `${((qIndex + 1) / questions.length) * 100}%`, height: '100%', background: '#7c3aed', transition: 'width 0.3s' }} />
      </div>

      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>{questions[qIndex].questionText}</h3>

      {/* Options — forward only, no feedback coloring */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        {questions[qIndex].options?.map(opt => {
          const isSelected = selectedOptId === opt.id
          return (
            <div
              key={opt.id}
              onClick={() => setSelectedOptId(opt.id)}
              style={{
                padding: '16px 20px', borderRadius: 8, border: `1px solid ${isSelected ? '#7c3aed' : 'var(--border)'}`,
                background: isSelected ? 'rgba(124,58,237,0.08)' : 'var(--bg-input)',
                cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s'
              }}
            >
              {opt.optionText}
            </div>
          )
        })}
      </div>

      {/* Forward-only: no Previous, just Submit/Next */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          ℹ️ Forward only — answers cannot be changed once submitted
        </span>
        <button
          className="btn btn-lg"
          style={{ background: '#7c3aed', color: '#fff', minWidth: 160 }}
          onClick={submitAnswer}
          disabled={submittingAnswer || !selectedOptId}
        >
          {submittingAnswer ? 'Saving...' : qIndex === questions.length - 1 ? 'Finish Exam' : 'Next →'}
        </button>
      </div>
    </div>
  )

  // ── Pass / Fail Screen ────────────────────────────────────────────────────────

  const renderPassFailScreen = () => {
    const { score, passed, passingScore } = finalAssessmentResults
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, textAlign: 'center' }}>
        {/* Hero */}
        <div style={{
          background: passed ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
          border: `2px solid ${passed ? '#22c55e' : '#ef4444'}`,
          borderRadius: 20, padding: '48px 32px'
        }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>{passed ? '🎓' : '📋'}</div>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: passed ? '#22c55e' : '#ef4444', marginBottom: 8 }}>
            {passed ? 'Congratulations! You Passed!' : 'Not Quite Yet'}
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 32 }}>
            {passed
              ? 'You have demonstrated mastery of this course.'
              : `Keep studying and try again. You need ${passingScore}% to pass.`}
          </p>

          {/* Score display */}
          <div style={{ display: 'inline-flex', gap: 40, background: 'var(--bg-input)', borderRadius: 12, padding: '20px 40px' }}>
            <div>
              <div style={{ fontSize: 40, fontWeight: 800, color: passed ? '#22c55e' : '#ef4444' }}>{score}%</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your Score</div>
            </div>
            <div style={{ width: 1, background: 'var(--border)' }} />
            <div>
              <div style={{ fontSize: 40, fontWeight: 800 }}>{passingScore}%</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Pass Mark</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {passed ? (
            <>
              <button
                className="btn btn-lg"
                style={{ background: '#b8860b', color: '#fff', minWidth: 200, fontWeight: 700 }}
                onClick={handleDownloadCertificate}
              >
                🎓 Download Certificate
              </button>
              <button className="btn btn-secondary btn-lg" onClick={handleNext}>
                View Course Results →
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => {
                  // Reset final exam state only — preserve adaptive progress
                  setFinalAssessmentResults(null)
                  setCompletedAssessments(prev => ({ ...prev, final: false }))
                  setAssessmentStarted(false)
                  setExamMode(null)
                  setUserAnswers([])
                  setQIndex(0)
                  setSelectedOptId(null)
                }}
              >
                🔄 Try Again
              </button>
              <button className="btn btn-secondary btn-lg" onClick={() => navigate('/learn')}>
                Back to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Round Results Screen ──────────────────────────────────────────────────────

  const renderRoundResults = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Header */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🔄</div>
        <h2 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Round {roundResults.roundNumber} Complete!</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          You answered {roundResults.totalQuestionsThisRound} question{roundResults.totalQuestionsThisRound !== 1 ? 's' : ''} this round.
        </p>
      </div>

      {/* Matrix breakdown */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>This Round — Knowledge State Breakdown</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
          {[
            { key: 'MASTERED',    icon: '🏆', label: 'Mastered',    color: '#22c55e', bg: 'rgba(34,197,94,0.08)'   },
            { key: 'DOUBTFUL',    icon: '💡', label: 'Doubtful',    color: '#eab308', bg: 'rgba(234,179,8,0.08)'   },
            { key: 'MISINFORMED', icon: '⚠️', label: 'Misinformed', color: '#ef4444', bg: 'rgba(239,68,68,0.08)'   },
            { key: 'UNINFORMED',  icon: '❌', label: 'Uninformed',  color: '#f97316', bg: 'rgba(249,115,22,0.08)'  },
            { key: 'NEUTRAL',     icon: '🤷', label: 'Skipped',     color: '#6b7280', bg: 'rgba(107,114,128,0.08)' }
          ].map(s => (
            <div key={s.key} style={{ textAlign: 'center', padding: '16px 8px', borderRadius: 10, background: s.bg, border: `1px solid ${s.color}22` }}>
              <div style={{ fontSize: 24 }}>{s.icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, lineHeight: 1.1 }}>{roundResults.counts[s.key] || 0}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Overall mastery progress */}
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

      {/* Per-question summary */}
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
  )

  // ── Pre-Assessment Results ────────────────────────────────────────────────────

  const renderPreAssessmentResults = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
        <h2 style={{ fontSize: 24, fontWeight: 800 }}>Diagnostic Results Summary</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Your adaptive learning path has been personalised based on your results.</p>
      </div>

      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Learning Objective Mastery</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {preAssessmentResults.loResults.map(res => (
            <div
              key={res.loId}
              style={{
                padding: '16px 20px', borderRadius: 8,
                background: res.mastered ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                border: `1px solid ${res.mastered ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>🎯 {res.name}</div>
                  {res.tags && res.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      {res.tags.map(t => (
                        <span key={t} style={{ fontSize: 10, background: 'var(--border)', color: 'var(--text-muted)', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>🏷️ {t}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontWeight: 700, fontSize: 13, color: res.mastered ? '#22c55e' : '#ef4444' }}>
                  {res.mastered ? '✅ SKIPPED (Mastered)' : '🧩 REQUIRED (Remediation)'}
                </span>
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

      <div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Detailed Attempt Log</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {preAssessmentResults.answers.map((ans, idx) => (
            <div key={idx} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)' }}>Question {idx + 1}</div>
                {renderMatrixBadge(ans.matrixResult)}
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>{ans.questionText}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Selected: </span><span style={{ fontWeight: 600, color: ans.isCorrect ? '#22c55e' : '#ef4444' }}>{ans.selectedText}</span></div>
                {!ans.isCorrect && <div><span style={{ color: 'var(--text-muted)' }}>Correct: </span><span style={{ fontWeight: 600, color: '#22c55e' }}>{ans.correctText}</span></div>}
                <div><span style={{ color: 'var(--text-muted)' }}>Confidence: </span><span style={{ fontWeight: 600 }}>{ans.confidence}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <button className="btn btn-primary btn-lg" onClick={handleNext}>
          Proceed to Your Adaptive Path →
        </button>
      </div>
    </div>
  )

  // ── Assessment Intro Card ─────────────────────────────────────────────────────

  const renderAssessmentIntro = (itemId) => (
    <div style={{ padding: 48, background: 'var(--bg-input)', borderRadius: 16, textAlign: 'center', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 64, marginBottom: 24 }}>{itemId === 'final' ? '🎓' : '📝'}</div>
      <h2 style={{ fontSize: 24, marginBottom: 16 }}>
        {itemId === 'final' ? 'Final Certification Exam' : `Pre-Assessment Diagnostic${roundNumber > 1 ? ` — Round ${roundNumber}` : ''}`}
      </h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32 }}>
        {itemId === 'pre'
          ? (roundNumber > 1
              ? 'Complete this round to continue refining your adaptive learning path.'
              : 'This diagnostic exam will evaluate your existing knowledge. Mastered objectives will let you skip corresponding modules entirely.')
          : `This final exam tests your mastery of the full course. No hints, no feedback — just your knowledge. You need ${course?.passingScorePercent || 70}% to pass.`}
      </p>
      {itemId === 'final' && (
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginBottom: 32, fontSize: 13, color: 'var(--text-muted)' }}>
          <span>⚠️ Forward only</span>
          <span>🚫 No feedback during exam</span>
          <span>🎯 Pass mark: {course?.passingScorePercent || 70}%</span>
        </div>
      )}
      <button
        className="btn btn-lg"
        style={{ background: itemId === 'final' ? '#7c3aed' : undefined }}
        onClick={() => startAssessment(itemId === 'pre' ? 'ADAPTIVE_ROUND' : 'FINAL_EXAM')}
      >
        {itemId === 'final' ? '🎓 Start Final Exam' : roundNumber > 1 ? `▶ Start Round ${roundNumber}` : 'Begin Assessment'}
      </button>
    </div>
  )

  // ── Bottom Nav Bar ────────────────────────────────────────────────────────────

  const isPreAssessItem  = activeItem?.type === 'assessment' && activeItem?.id === 'pre'
  const isFinalExamItem  = activeItem?.type === 'assessment' && activeItem?.id === 'final'
  const continueLocked   =
    currentIndex === playlist.length - 1 ||
    (isPreAssessItem && !completedAssessments.pre) ||
    (isFinalExamItem && !completedAssessments.final)

  const showBottomBar = activeItem && !assessmentStarted

  // ── Full Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg-base)', position: 'fixed', top: 0, left: 0, zIndex: 99999 }}>

      {renderSidebar()}

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', position: 'relative' }}>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {activeItem ? (
            <div style={{ padding: '64px 48px', maxWidth: 950, margin: '0 auto', paddingBottom: 120 }}>
              <h1 style={{ fontSize: 42, fontWeight: 800, marginBottom: 48 }}>{activeItem.title}</h1>

              {/* Intro / Module content */}
              {(activeItem.type === 'intro' || activeItem.type === 'module') && (
                <BlockRenderer blocksJson={activeItem.content} />
              )}

              {/* Assessment screen */}
              {activeItem.type === 'assessment' && !assessmentStarted && (
                <>
                  {/* Pre-Assessment completed view */}
                  {activeItem.id === 'pre' && completedAssessments.pre && preAssessmentResults && !roundResults && (
                    renderPreAssessmentResults()
                  )}

                  {/* Assessment intro / round start card */}
                  {!roundResults && (
                    (activeItem.id === 'pre'   && !completedAssessments.pre) ||
                    (activeItem.id === 'final' && !completedAssessments.final)
                  ) && renderAssessmentIntro(activeItem.id)}

                  {/* Round results screen */}
                  {roundResults && renderRoundResults()}

                  {/* Final exam pass/fail screen */}
                  {activeItem.id === 'final' && completedAssessments.final && finalAssessmentResults && (
                    renderPassFailScreen()
                  )}
                </>
              )}

              {/* Active quiz — split by mode */}
              {assessmentStarted && questions.length > 0 && (
                examMode === 'FINAL'
                  ? renderFinalExamQuestion()
                  : renderAdaptiveQuestion()
              )}

              {/* Results page */}
              {activeItem.type === 'results' && renderCourseResults()}

            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Select an item from the menu to begin.
            </div>
          )}
        </div>

        {/* Sticky Bottom Navigation Bar — hidden during final exam (forward-only mode) */}
        {showBottomBar && examMode !== 'FINAL' && (
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
              disabled={continueLocked}
            >
              Continue →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
