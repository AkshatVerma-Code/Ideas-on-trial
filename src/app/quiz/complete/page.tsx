'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Trophy, Scale, Star, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function QuizCompletePage() {
  const router = useRouter()
  const [teamName, setTeamName] = useState('')
  const [score, setScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = sessionStorage.getItem('quiz_session')
    const team = sessionStorage.getItem('team_name') || 'Your Team'
    setTeamName(team)

    if (!token) { router.replace('/'); return }

    // Finalize (idempotent)
    fetch('/api/quiz/complete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setScore(data.totalScore ?? null)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [router])

  const getRank = (s: number) => {
    if (s >= 40) return { label: 'Startup Champion', color: 'text-yellow-400', stars: 5 }
    if (s >= 30) return { label: 'Venture Virtuoso', color: 'text-yellow-500', stars: 4 }
    if (s >= 20) return { label: 'Rising Founder', color: 'text-orange-400', stars: 3 }
    if (s >= 10) return { label: 'Eager Intern', color: 'text-blue-400', stars: 2 }
    return { label: 'Rookie Pitch', color: 'text-gray-400', stars: 1 }
  }

  const rank = score !== null ? getRank(score) : null

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-[#0d0d1a] to-[#0a0a0f]" />

      <div className="relative z-10 max-w-lg w-full text-center">
        {loading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">Tallying your score...</p>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="w-24 h-24 bg-yellow-500/10 border-2 border-yellow-500/40 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <Trophy className="w-12 h-12 text-yellow-400" />
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="inline-block bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1 mb-4">
                <div className="flex items-center gap-2 text-green-400 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Quiz Completed
                </div>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
                Well Argued, <span className="gold-text">{teamName}</span>!
              </h1>
              <p className="text-gray-400 mb-8">The jury has deliberated. Here&apos;s your verdict.</p>
            </motion.div>

            {/* Score card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-b from-[#13111a] to-[#0f0d16] border border-yellow-900/40 rounded-2xl p-8 mb-6"
              style={{ boxShadow: '0 0 60px rgba(201,168,76,0.08)' }}
            >
              <div className="flex items-center justify-center gap-2 mb-3">
                <Scale className="w-5 h-5 text-yellow-600" />
                <span className="text-gray-400 text-sm">Total Score</span>
              </div>
              <div className="text-7xl font-black gold-text mb-3">
                {score ?? 0}
              </div>
              <p className="text-gray-500 text-sm mb-5">points earned</p>

              {rank && (
                <div>
                  <div className="flex items-center justify-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${i < rank.stars ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`}
                      />
                    ))}
                  </div>
                  <p className={`font-bold text-lg ${rank.color}`}>{rank.label}</p>
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              <p className="text-gray-500 text-sm mb-4">
                Your answers have been submitted and locked in. Check with the event coordinators for the final standings.
              </p>
              <button
                onClick={() => router.replace('/')}
                className="flex items-center gap-2 text-gray-400 hover:text-white text-sm mx-auto transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Homepage
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </main>
  )
}
