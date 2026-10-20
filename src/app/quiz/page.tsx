'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, ChevronRight, Scale, Gavel, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Option {
  id: string
  text: string
  weight: number
  display_order: number
}

interface Question {
  id: string
  text: string
  timer_seconds: number
  display_order: number
  options: Option[]
}

export default function QuizPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [answered, setAnswered] = useState<Record<string, string>>({}) // questionId -> optionId
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [teamName, setTeamName] = useState('')
  const [timerStarted, setTimerStarted] = useState(false)
  const [startTime, setStartTime] = useState<number>(0)
  const [autoSubmitted, setAutoSubmitted] = useState(false)

  const getToken = () => sessionStorage.getItem('quiz_session') || ''

  useEffect(() => {
    const token = getToken()
    const team = sessionStorage.getItem('team_name') || ''
    if (!token) { router.replace('/'); return }
    setTeamName(team)

    fetch('/api/quiz/questions', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          if (data.completed) { router.replace('/quiz/complete'); return }
          setError(data.error)
          setLoading(false)
          return
        }
        setQuestions(data.questions)
        // Restore answered state
        const prevAnswered: Record<string, string> = {}
        ;(data.answeredQuestions || []).forEach((a: { question_id: string; option_id: string }) => {
          if (a.option_id) prevAnswered[a.question_id] = a.option_id
        })
        setAnswered(prevAnswered)

        // Find first unanswered question
        const firstUnanswered = data.questions.findIndex(
          (q: Question) => !prevAnswered[q.id]
        )
        setCurrentIndex(firstUnanswered === -1 ? data.questions.length - 1 : firstUnanswered)
        setLoading(false)
      })
      .catch(() => {
        setError('Failed to load quiz. Please refresh.')
        setLoading(false)
      })
  }, [router])

  const currentQuestion = questions[currentIndex]

  // Reset timer when question changes
  useEffect(() => {
    if (!currentQuestion || answered[currentQuestion.id]) return
    setTimerStarted(true)
    setStartTime(Date.now())
    setSelectedOption(null)
    setAutoSubmitted(false)
  }, [currentIndex, currentQuestion])

  // Timer countdown (timestamp-based, so tab switches don't pause it)
  useEffect(() => {
    if (!timerStarted || !currentQuestion || answered[currentQuestion.id]) return

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      const remaining = Math.max(currentQuestion.timer_seconds - elapsed, 0)
      setTimeLeft(remaining)

      if (remaining <= 0) {
        clearInterval(timer)
        if (!autoSubmitted) {
          setAutoSubmitted(true)
          handleSubmit(null) // auto-submit with no answer on timeout
        }
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [timerStarted, currentQuestion, startTime, answered, autoSubmitted])

  const handleSubmit = useCallback(async (optionId: string | null) => {
    if (!currentQuestion || submitting) return
    if (answered[currentQuestion.id]) return // already answered

    setSubmitting(true)
    const timeTaken = Math.floor((Date.now() - startTime) / 1000)

    try {
      const res = await fetch('/api/quiz/submit-answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          optionId,
          timeTakenSeconds: timeTaken,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setAnswered(prev => ({
          ...prev,
          [currentQuestion.id]: optionId || '__skipped__',
        }))

        // Move to next or finish
        if (currentIndex + 1 < questions.length) {
          setTimeout(() => {
            setCurrentIndex(i => i + 1)
            setSubmitting(false)
          }, 600)
        } else {
          // All done — finalize
          await finishQuiz()
        }
      } else {
        setError(data.error || 'Failed to submit answer.')
        setSubmitting(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }, [currentQuestion, currentIndex, questions.length, startTime, submitting, answered])

  const finishQuiz = async () => {
    await fetch('/api/quiz/complete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    router.push('/quiz/complete')
  }

  const handleOptionClick = (optionId: string) => {
    if (submitting || answered[currentQuestion?.id]) return
    setSelectedOption(optionId)
  }

  const handleConfirm = () => {
    if (!selectedOption) return
    handleSubmit(selectedOption)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] px-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-white font-bold text-xl mb-2">Something went wrong</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button onClick={() => router.replace('/')} className="text-yellow-400 hover:text-yellow-300 underline text-sm">
            Go back to start
          </button>
        </div>
      </div>
    )
  }

  if (!currentQuestion) return null

  const isAnswered = !!answered[currentQuestion.id]
  const totalQuestions = questions.length
  const answeredCount = Object.keys(answered).length
  const progress = (answeredCount / totalQuestions) * 100
  const timerPercent = (timeLeft / currentQuestion.timer_seconds) * 100
  const isUrgent = timeLeft <= 5 && timeLeft > 0 && !isAnswered

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Top bar */}
      <div className="border-b border-yellow-900/30 bg-[#0d0b14]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-yellow-500" />
            <span className="text-white font-bold text-sm hidden sm:block">Ideas on Trial</span>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">Question</p>
            <p className="text-white font-bold text-sm">{currentIndex + 1} <span className="text-gray-500">/ {totalQuestions}</span></p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Team</p>
            <p className="text-yellow-400 font-semibold text-sm truncate max-w-[120px]">{teamName}</p>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="w-full h-1 bg-white/5">
          <div className="h-1 bg-yellow-500/40 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl">

          {/* Timer */}
          {!isAnswered && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className={`flex items-center gap-2 ${isUrgent ? 'timer-urgent text-red-400' : 'text-gray-400'}`}>
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-mono font-bold">{timeLeft}s</span>
                </div>
                <span className="text-xs text-gray-600">Time remaining</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all linear ${
                    timerPercent > 50 ? 'bg-green-500' :
                    timerPercent > 25 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${timerPercent}%`, transition: 'width 1s linear' }}
                />
              </div>
            </div>
          )}

          {/* Question card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-gradient-to-b from-[#13111a] to-[#0f0d16] border border-yellow-900/30 rounded-2xl p-6 sm:p-8 mb-5"
                style={{ boxShadow: '0 0 40px rgba(201,168,76,0.05)' }}>
                {/* Question number badge */}
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 rounded-full bg-yellow-500/15 border border-yellow-500/30 flex items-center justify-center">
                    <span className="text-yellow-400 text-xs font-bold">{currentIndex + 1}</span>
                  </div>
                  <div className="flex-1 h-px bg-yellow-900/30" />
                  <Gavel className="w-4 h-4 text-yellow-700" />
                </div>

                <h2 className="text-white text-lg sm:text-xl font-semibold leading-relaxed mb-7">
                  {currentQuestion.text}
                </h2>

                {/* Options */}
                <div className="space-y-3">
                  {currentQuestion.options.map((option, idx) => {
                    const isSelected = selectedOption === option.id
                    const wasSelected = answered[currentQuestion.id] === option.id
                    const letters = ['A', 'B', 'C', 'D', 'E', 'F']

                    return (
                      <motion.button
                        key={option.id}
                        onClick={() => handleOptionClick(option.id)}
                        whileHover={!isAnswered && !submitting ? { x: 4 } : {}}
                        whileTap={!isAnswered && !submitting ? { scale: 0.99 } : {}}
                        disabled={isAnswered || submitting}
                        className={`w-full text-left flex items-center gap-4 p-4 rounded-xl border transition-all duration-200
                          ${isAnswered
                            ? wasSelected
                              ? 'border-yellow-500 bg-yellow-500/15 cursor-default'
                              : 'border-white/5 bg-white/2 opacity-50 cursor-default'
                            : isSelected
                              ? 'border-yellow-500/80 bg-yellow-500/10 cursor-pointer'
                              : 'border-white/8 bg-white/3 hover:border-yellow-500/40 hover:bg-yellow-500/5 cursor-pointer'
                          }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold
                          ${isAnswered && wasSelected ? 'bg-yellow-500 text-black' :
                            isSelected ? 'bg-yellow-500/30 text-yellow-400' :
                            'bg-white/5 text-gray-500'}`}>
                          {letters[idx]}
                        </div>
                        <span className={`text-sm sm:text-base leading-snug
                          ${isAnswered && wasSelected ? 'text-white font-medium' :
                            isSelected ? 'text-white' : 'text-gray-300'}`}>
                          {option.text}
                        </span>
                        {isAnswered && wasSelected && (
                          <CheckCircle2 className="w-5 h-5 text-yellow-400 ml-auto flex-shrink-0" />
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Confirm */}
              {!isAnswered && (
                <div className="flex justify-center">
                  <button
                    onClick={handleConfirm}
                    disabled={!selectedOption || submitting}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        Lock in Answer
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              )}

              {isAnswered && currentIndex + 1 < totalQuestions && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center gap-2 text-green-400 text-sm py-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Answer recorded. Moving to next question...</span>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Question dots navigation */}
          <div className="flex justify-center gap-1.5 mt-6 flex-wrap">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === currentIndex ? 'bg-yellow-400 w-4' :
                  answered[q.id] ? 'bg-yellow-700' : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
