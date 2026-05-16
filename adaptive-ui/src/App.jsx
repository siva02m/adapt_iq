import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './App.css' 

function App() {
  // --- AUTHOR-DEFINED PRESENTATION CONFIGURATION ---
  const authorConfiguration = {
    primaryColor: '#0056b3',
    primaryHover: '#004085',
    textMain: '#212529',
    textMuted: '#5a6268',
    playerBg: '#f0f2f5',
    cardBg: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    borderRadius: '8px'
  }

  // --- WORKSPACE VIEW CONTROLLER ---
  const [viewMode, setViewMode] = useState('PLAYER') // 'PLAYER' or 'AUTHORING'

  // --- LEARNER PLAYER RUNTIME STATE ---
  const [questions, setQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedOptionId, setSelectedOptionId] = useState(null)
  const [confidenceLevel, setConfidenceLevel] = useState(null)
  const [evaluationResult, setEvaluationResult] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const feedbackRef = useRef(null)
  const USER_ID = 2 
  const COURSE_ID = 1

  // --- AUTHORING FORM CANVAS STATE ---
  const [newQuestionText, setNewQuestionText] = useState('')
  const [newFeedbackText, setNewFeedbackText] = useState('')
  const [formOptions, setFormOptions] = useState([
    { optionText: '', correct: true },
    { optionText: '', correct: false },
    { optionText: '', correct: false },
    { optionText: '', correct: false }
  ])

  useEffect(() => {
    fetchNewRound()
  }, [])

  useEffect(() => {
    if (evaluationResult && feedbackRef.current) {
      feedbackRef.current.focus()
    }
  }, [evaluationResult])

  const fetchNewRound = async () => {
    setLoading(true)
    setEvaluationResult(null)
    setSelectedOptionId(null)
    setConfidenceLevel(null)
    setCurrentIdx(0)
    try {
      const response = await axios.get(`http://localhost:8080/api/rounds/generate?userId=${USER_ID}&courseId=${COURSE_ID}`)
      setQuestions(response.data)
    } catch (error) {
      console.error("Engine generation processing error:", error)
    } finally {
      setLoading(false)
    }
  }

  // --- ACTION: SUBMIT LEARNER ATTEMPT ---
  const handlePlayerSubmit = async () => {
    if (!confidenceLevel) return alert("Select your confidence level.")
    if (confidenceLevel !== 'DONT_KNOW' && !selectedOptionId) return alert("Select an answer.")

    const currentQuestion = questions[currentIdx]
    const chosenOption = currentQuestion.options.find(o => o.id === selectedOptionId)
    const isCorrect = chosenOption ? chosenOption.correct : false

    const payload = {
      userId: USER_ID,
      questionId: currentQuestion.id,
      selectedOptionId: selectedOptionId,
      confidenceLevel: confidenceLevel,
      attemptNumber: 1,
      roundNumber: 1,
      isCorrect: isCorrect
    }

    try {
      const response = await axios.post('http://localhost:8080/api/rounds/evaluate', payload)
      setEvaluationResult(response.data)
    } catch (error) {
      console.error("Evaluation framework delivery error:", error)
    }
  }

  const handleNext = () => {
    setEvaluationResult(null)
    setSelectedOptionId(null)
    setConfidenceLevel(null)
    
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1)
    } else {
      fetchNewRound()
    }
  }

  // --- ACTION: AUTHORING COMMENCEMENT SUBMIT ---
  const handleAuthorSubmit = async (e) => {
    e.preventDefault()
    
    // Quick validation check
    if (!newQuestionText.trim() || !newFeedbackText.trim()) {
      return alert("Please fill out the question prompt and feedback text context fields.")
    }
    if (formOptions.some(o => !o.optionText.trim())) {
      return alert("All four option criteria spaces must be defined.")
    }

    const questionPayload = {
      questionText: newQuestionText,
      customFeedbackText: newFeedbackText,
      difficultyLevel: 1,           // <-- Add this back in!
      course: { id: COURSE_ID }, // Binds to the course object correctly
      learningObjective: { id: 1 },           // Links to the non-null LearningObjective ID 1
      options: formOptions
    }

    try {
      await axios.post('http://localhost:8080/api/authoring/questions', questionPayload)
      alert("🎉 Question compiled and saved directly into PostgreSQL successfully!")
      
      // Reset creation values cleanly
      setNewQuestionText('')
      setNewFeedbackText('')
      setFormOptions([
        { optionText: '', correct: true },
        { optionText: '', correct: false },
        { optionText: '', correct: false },
        { optionText: '', correct: false }
      ])
      
      // Instantly sync the runtime layout database profile queue
      fetchNewRound()
    } catch (error) {
      console.error("Error committing newly written question components:", error)
      alert("Failed to push components to authoring backend processing core.")
    }
  }

  const handleOptionTextChange = (index, value) => {
    const updated = [...formOptions]
    updated[index].optionText = value
    setFormOptions(updated)
  }

  const handleOptionCorrectChange = (selectedIndex) => {
    const updated = formOptions.map((opt, idx) => ({
      ...opt,
      correct: idx === selectedIndex
    }))
    setFormOptions(updated)
  }

  const getFeedbackStyles = () => {
    if (!evaluationResult) return {}
    if (evaluationResult.includes("MASTERED")) {
      return { color: '#198754', backgroundColor: '#d1e7dd', border: '1px solid #198754' }
    }
    if (evaluationResult.includes("MISINFORMED")) {
      return { color: '#b51d1d', backgroundColor: '#f8d7da', border: '1px solid #b51d1d' }
    }
    return { color: '#856404', backgroundColor: '#fff3cd', border: '1px solid #856404' }
  }

  const dynamicThemeTokens = {
    '--p-color': authorConfiguration.primaryColor,
    '--p-hover': authorConfiguration.primaryHover,
    '--t-main': authorConfiguration.textMain,
    '--t-mute': authorConfiguration.textMuted,
    '--p-bg': authorConfiguration.playerBg,
    '--c-bg': authorConfiguration.cardBg,
    '--r-radius': authorConfiguration.borderRadius,
    '--f-family': authorConfiguration.fontFamily
  }

  return (
    <div style={dynamicThemeTokens} className="player-wrapper">
      
      {/* --- WORKSPACE NAVIGATION CORE ACTION TAB HUB --- */}
      <nav className="mode-navbar" aria-label="System Mode Workspace Selector">
        <button 
          className="mode-btn" 
          aria-current={viewMode === 'PLAYER' ? 'page' : undefined}
          onClick={() => setViewMode('PLAYER')}
        >
          📱 Run Learner Player
        </button>
        <button 
          className="mode-btn" 
          aria-current={viewMode === 'AUTHORING' ? 'page' : undefined}
          onClick={() => setViewMode('AUTHORING')}
        >
          ✍️ Adaptiq Authoring Canvas
        </button>
      </nav>

      {/* --- RUNTIME ROUTING BRANCHING CONDITIONAL DISPLAY --- */}
      {viewMode === 'AUTHORING' ? (
        <div className="main-canvas">
          <main className="player-card">
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--t-main)', margin: '0 0 5px 0' }}>Adaptiq Authoring Canvas</h2>
            <p style={{ color: 'var(--t-mute)', fontSize: '14px', margin: '0 0 25px 0' }}>Design custom concepts and commit them directly to the production engine database.</p>
            
            <form onSubmit={handleAuthorSubmit} className="author-form">
              <div className="form-group">
                <label htmlFor="q-prompt">Question Prompt Text</label>
                <textarea 
                  id="q-prompt"
                  rows="3"
                  className="form-input"
                  placeholder="e.g., Which framework uses decentralized self-organizing nodes to..."
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Answer Selection Fields & Target Accuracy Mapping</label>
                <p style={{ fontSize: '12px', color: 'var(--t-mute)', margin: '0 0 5px 0' }}>Type choices and select the single true indicator marker.</p>
                {formOptions.map((option, idx) => (
                  <div key={idx} className="option-row">
                    <input 
                      type="radio" 
                      name="correct-indicator"
                      className="radio-custom"
                      checked={option.correct}
                      onChange={() => handleOptionCorrectChange(idx)}
                      aria-label={`Mark choice option ${idx + 1} as correct`}
                    />
                    <input 
                      type="text"
                      className="form-input"
                      style={{ flex: 1, padding: '8px 12px' }}
                      placeholder={`Answer choice option content detail #${idx + 1}`}
                      value={option.optionText}
                      onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label htmlFor="q-feedback">Adaptive Diagnostic Remediation Feedback</label>
                <textarea 
                  id="q-feedback"
                  rows="2"
                  className="form-input"
                  placeholder="Provide contextual explanation clearing common misconceptions regarding this topic..."
                  value={newFeedbackText}
                  onChange={(e) => setNewFeedbackText(e.target.value)}
                />
              </div>

              <button type="submit" className="action-btn" style={{ marginTop: '10px' }}>
                Commit to Production Database
              </button>
            </form>
          </main>
        </div>
      ) : (
        /* --- RUNTIME LEARNER PLAYER COMPONENT DISPLAY --- */
        <>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Sizing up content modules...</div>
          ) : questions.length === 0 ? (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <main style={{ backgroundColor: 'var(--c-bg)', width: '100%', maxWidth: '650px', padding: '40px', borderRadius: 'var(--r-radius)', textAlign: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.03)' }}>
                <h2 style={{ color: 'var(--t-main)', fontSize: '26px', margin: '0 0 10px 0' }}>Module Mastery Confirmed</h2>
                <p style={{ color: 'var(--t-mute)', fontSize: '16px', margin: '0 0 30px 0' }}>All competence paths are mapped successfully.</p>
                <button onClick={fetchNewRound} className="action-btn">Re-verify Core Metrics</button>
              </main>
            </div>
          ) : (
            <>
              <header className="player-header">
                <div className="header-content">
                  <h1 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--t-main)' }}>Introduction to Leadership Module</h1>
                  <span style={{ fontSize: '14px', color: 'var(--t-mute)', fontWeight: '500' }}>
                    Item Matrix: {currentIdx + 1} / {questions.length}
                  </span>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${(currentIdx / questions.length) * 100}%` }} />
                </div>
              </header>

              <div className="main-canvas">
                <main className="player-card">
                  <h2 style={{ fontSize: '20px', fontWeight: '600', color: 'var(--t-main)', margin: '0 0 25px 0', lineHeight: '1.4' }}>
                    {questions[currentIdx].questionText}
                  </h2>

                  <fieldset className="option-fieldset">
                    {questions[currentIdx].options?.map((option) => {
                      const isSelected = selectedOptionId === option.id
                      return (
                        <button 
                          key={option.id}
                          disabled={evaluationResult !== null}
                          aria-pressed={isSelected}
                          className="option-btn"
                          onClick={() => {
                            setSelectedOptionId(option.id)
                            if(confidenceLevel === 'DONT_KNOW') setConfidenceLevel(null)
                          }}
                        >
                          {option.optionText}
                        </button>
                      )
                    })}
                  </fieldset>

                  <section className="confidence-section">
                    <h3 style={{ margin: '0 0 15px 0', fontWeight: '600', fontSize: '13px', color: 'var(--t-mute)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Select Confidence Profile:
                    </h3>
                    <div className="confidence-grid">
                      <button
                        disabled={evaluationResult !== null}
                        aria-pressed={confidenceLevel === 'SURE'}
                        className="confidence-btn"
                        onClick={() => setConfidenceLevel('SURE')}
                      >
                        Certain
                      </button>

                      <button
                        disabled={evaluationResult !== null}
                        aria-pressed={confidenceLevel === 'NOT_SURE'}
                        className="confidence-btn"
                        onClick={() => setConfidenceLevel('NOT_SURE')}
                      >
                        Uncertain
                      </button>

                      <button
                        disabled={evaluationResult !== null}
                        aria-pressed={confidenceLevel === 'DONT_KNOW'}
                        className="confidence-btn"
                        onClick={() => {
                          setConfidenceLevel('DONT_KNOW')
                          setSelectedOptionId(null)
                        }}
                      >
                        No Knowledge
                      </button>
                    </div>
                  </section>

                  <footer style={{ minHeight: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    {evaluationResult === null ? (
                      <button onClick={handlePlayerSubmit} className="action-btn" style={{ alignSelf: 'flex-end' }}>
                        Submit Response
                      </button>
                    ) : (
                      <div ref={feedbackRef} tabIndex="-1" className="feedback-container" style={getFeedbackStyles()}>
                        <p style={{ margin: '0 0 8px 0', fontWeight: '700', fontSize: '16px' }}>
                          {evaluationResult}
                        </p>
                        <p style={{ fontSize: '14px', margin: '0 0 20px 0', lineHeight: '1.5', opacity: 0.95 }}>
                          {questions[currentIdx].customFeedbackText}
                        </p>
                        <div style={{ textAlign: 'right' }}>
                          <button onClick={handleNext} className="action-btn" style={{ backgroundColor: 'var(--t-main)', color: '#fff' }}>
                            {currentIdx + 1 === questions.length ? "Complete Adaptive Round" : "Next Question"}
                          </button>
                        </div>
                      </div>
                    )}
                  </footer>
                </main>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

export default App