'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Scale, Gavel, Users, ChevronRight, AlertTriangle, Trophy, Clock, Shield } from 'lucide-react'

export default function LandingPage() {
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quizOpen, setQuizOpen] = useState<boolean | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if quiz is open
    fetch('/api/quiz/status')
      .then(r => r.json())
      .then(d => {
        setQuizOpen(d.quizOpen)
        setCheckingStatus(false)
      })
      .catch(() => {
        setQuizOpen(false)
        setCheckingStatus(false)
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/quiz/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamName: teamName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }
      // Store session token
      sessionStorage.setItem('quiz_session', data.sessionToken)
      sessionStorage.setItem('team_name', data.teamName)
      sessionStorage.setItem('participant_id', data.participantId)
      router.push('/quiz')
    } catch {
      setError('Network error. Please check your connection.')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4 py-12">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f]" />
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(ellipse at 20% 50%, #1a0f00 0%, transparent 60%),
                            radial-gradient(ellipse at 80% 20%, #0d1b2e 0%, transparent 60%)`
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-yellow-500 opacity-30"
            style={{ left: `${15 + i * 15}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [-10, 10, -10], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          {/* Logo / icon cluster */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <motion.div
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Gavel className="w-10 h-10 text-yellow-500" />
            </motion.div>
            <Scale className="w-12 h-12 text-yellow-400" />
            <motion.div
              animate={{ rotate: [5, -5, 5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            >
              <Gavel className="w-10 h-10 text-yellow-500 scale-x-[-1]" />
            </motion.div>
          </div>

          <div className="inline-block bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1 mb-4">
            <span className="text-yellow-400 text-sm font-semibold tracking-widest uppercase">Round 0 · Qualifying</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-3">
            <span className="gold-text">Ideas on Trial</span>
          </h1>
          <p className="text-gray-400 text-lg">
            The Startup Courtroom Quiz. Present your case. Make your move.
          </p>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3 mb-10"
        >
          {[
            { icon: Clock, label: 'Timed Questions' },
            { icon: Trophy, label: 'Weighted Scoring' },
            { icon: Shield, label: 'One attempt per team' },
            { icon: Users, label: 'Team Based' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1.5 text-sm text-gray-300">
              <Icon className="w-3.5 h-3.5 text-yellow-500" />
              {label}
            </div>
          ))}
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="bg-gradient-to-b from-[#13111a] to-[#0f0d16] border border-yellow-900/40 rounded-2xl p-8 shadow-2xl"
          style={{ boxShadow: '0 0 60px rgba(201,168,76,0.08)' }}
        >
          {checkingStatus ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : quizOpen === false ? (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Scale className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Court is Not in Session</h2>
              <p className="text-gray-400 text-sm">The quiz is currently closed. Please check back when the admin opens it.</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-2">Enter the Courtroom</h2>
              <p className="text-gray-400 text-sm mb-6">
                Enter your team name to begin. Each team can only attempt the quiz once.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    placeholder="e.g. The Venture Vikings"
                    maxLength={60}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/60 focus:ring-1 focus:ring-yellow-500/30 transition-all"
                  />
                  <p className="text-xs text-gray-600 mt-1.5">{teamName.length}/60 characters</p>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3"
                    >
                      <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      <p className="text-red-300 text-sm">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  type="submit"
                  disabled={loading || !teamName.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-yellow-500/20"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Enter the Courtroom</span>
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-white/5">
                <div className="flex items-start gap-2 text-xs text-gray-500">
                  <Shield className="w-3.5 h-3.5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p>
                    Each team name can only be used once. Ensure your team name is unique and recognizable.
                    This cannot be changed after you start.
                  </p>
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-gray-700 text-xs mt-8"
        >
          Ideas on Trial · Powered by the Startup Courtroom
        </motion.p>
      </div>
    </main>
  )
}
