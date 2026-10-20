'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Users, Trophy, HelpCircle, Activity, TrendingUp, ToggleLeft, ToggleRight, RefreshCw, Database } from 'lucide-react'

interface Stats {
  totalParticipants: number
  completedParticipants: number
  inProgressParticipants: number
  totalQuestions: number
  topScorers: { team_name: string; total_score: number }[]
  quizOpen: boolean
  quizTitle: string
  needsConfig?: boolean
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const router = useRouter()

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      if (res.status === 401) { router.replace('/admin'); return }
      const data = await res.json()
      setStats(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  const toggleQuiz = async () => {
    if (!stats) return
    setToggling(true)
    const newVal = !stats.quizOpen
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'quiz_open', value: String(newVal) }),
      })
      setStats(s => s ? { ...s, quizOpen: newVal } : s)
    } catch {
      // ignore
    } finally {
      setToggling(false)
    }
  }

  const statCards = stats ? [
    { label: 'Total Teams', value: stats.totalParticipants, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { label: 'Completed', value: stats.completedParticipants, icon: Trophy, color: 'text-green-400', bg: 'bg-green-500/10' },
    { label: 'In Progress', value: stats.inProgressParticipants, icon: Activity, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Questions', value: stats.totalQuestions, icon: HelpCircle, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  ] : []

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Overview of the quiz event</p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl text-sm transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Supabase Not Configured Banner */}
      {stats?.needsConfig && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Database className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-semibold text-sm">Supabase Credentials Needed</p>
            <p className="text-gray-400 text-xs mt-1">
              Please paste your real <code className="text-yellow-400 bg-black/40 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="text-yellow-400 bg-black/40 px-1 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</code> into <code className="text-yellow-400 bg-black/40 px-1 py-0.5 rounded">ideas-on-trial/.env.local</code> to connect your database.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stats ? (
        <>
          {/* Quiz toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-8 p-5 rounded-2xl border flex items-center justify-between ${
              stats.quizOpen
                ? 'bg-green-500/8 border-green-500/25'
                : 'bg-red-500/8 border-red-500/25'
            }`}
          >
            <div>
              <p className="text-white font-bold">Quiz Status</p>
              <p className={`text-sm mt-0.5 ${stats.quizOpen ? 'text-green-400' : 'text-red-400'}`}>
                {stats.quizOpen ? '✓ Open — Participants can join' : '✗ Closed — No one can start'}
              </p>
            </div>
            <button
              onClick={toggleQuiz}
              disabled={toggling}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                stats.quizOpen
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              }`}
            >
              {toggling ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : stats.quizOpen ? (
                <><ToggleRight className="w-5 h-5" /> Close Quiz</>
              ) : (
                <><ToggleLeft className="w-5 h-5" /> Open Quiz</>
              )}
            </button>
          </motion.div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map(({ label, value, icon: Icon, color, bg }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-[#13111a] border border-white/5 rounded-2xl p-5"
              >
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-3xl font-black text-white">{value}</p>
                <p className="text-gray-500 text-sm mt-1">{label}</p>
              </motion.div>
            ))}
          </div>

          {/* Top scorers */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#13111a] border border-white/5 rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
              <h2 className="text-white font-bold">Top Scorers</h2>
            </div>

            {stats.topScorers.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">No completed attempts yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.topScorers.map((s, i) => (
                  <div key={s.team_name} className="flex items-center gap-4">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                      ${i === 0 ? 'bg-yellow-500 text-black' :
                        i === 1 ? 'bg-gray-300 text-black' :
                        i === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-gray-400'}`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white text-sm font-medium truncate">{s.team_name}</p>
                        <span className="text-yellow-400 font-bold text-sm ml-4">{s.total_score} pts</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-1.5 bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full"
                          style={{ width: `${Math.min((s.total_score / (stats.topScorers[0]?.total_score || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      ) : (
        <p className="text-red-400 text-sm">Failed to load stats.</p>
      )}
    </div>
  )
}
