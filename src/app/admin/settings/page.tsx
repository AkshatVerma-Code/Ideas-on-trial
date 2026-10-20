'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Settings, Clock, ToggleLeft, ToggleRight, Save, AlertTriangle, CheckCircle2, RefreshCw, Trash2, Shield } from 'lucide-react'

interface SettingsData {
  quiz_open: string
  default_timer_seconds: string
  quiz_title: string
  quiz_subtitle: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [resetConfirm, setResetConfirm] = useState(false)
  const router = useRouter()

  const fetchSettings = async () => {
    const res = await fetch('/api/admin/settings')
    if (res.status === 401) { router.replace('/admin'); return }
    const data = await res.json()
    setSettings(data.settings)
    setLoading(false)
  }

  useEffect(() => { fetchSettings() }, [])

  const saveSetting = async (key: string, value: string) => {
    setSaving(key)
    setError('')
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
    if (res.ok) {
      setSettings(s => s ? { ...s, [key]: value } : s)
      setSaved(key)
      setTimeout(() => setSaved(null), 2000)
    } else {
      setError('Failed to save setting.')
    }
    setSaving(null)
  }

  const handleResetQuiz = async () => {
    if (!resetConfirm) { setResetConfirm(true); return }
    // Close quiz and clear all participants
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'quiz_open', value: 'false' }),
    })
    await fetch('/api/admin/reset', { method: 'POST' })
    setResetConfirm(false)
    await fetchSettings()
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!settings) return <p className="text-red-400">Failed to load settings.</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure quiz behavior and appearance</p>
        </div>
        <button onClick={fetchSettings} className="flex items-center gap-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl text-sm transition-all">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-6">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-5">
        {/* Quiz Status */}
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-[#13111a] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-white font-semibold">Quiz Status</h3>
              <p className="text-gray-500 text-sm mt-1">Control whether participants can start the quiz</p>
            </div>
            <button
              onClick={() => saveSetting('quiz_open', settings.quiz_open === 'true' ? 'false' : 'true')}
              disabled={saving === 'quiz_open'}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                settings.quiz_open === 'true'
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              }`}
            >
              {saving === 'quiz_open'
                ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : settings.quiz_open === 'true'
                  ? <><ToggleRight className="w-5 h-5" /> Open</>
                  : <><ToggleLeft className="w-5 h-5" /> Closed</>
              }
            </button>
          </div>
        </motion.div>

        {/* Quiz Title */}
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-[#13111a] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-yellow-500" />
            <h3 className="text-white font-semibold">Quiz Title</h3>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={settings.quiz_title}
              onChange={e => setSettings(s => s ? { ...s, quiz_title: e.target.value } : s)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/60 text-sm"
            />
            <button
              onClick={() => saveSetting('quiz_title', settings.quiz_title)}
              disabled={saving === 'quiz_title'}
              className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            >
              {saved === 'quiz_title' ? <CheckCircle2 className="w-4 h-4" /> : saving === 'quiz_title' ? <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>

        {/* Quiz Subtitle */}
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="bg-[#13111a] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-yellow-500" />
            <h3 className="text-white font-semibold">Quiz Subtitle</h3>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={settings.quiz_subtitle}
              onChange={e => setSettings(s => s ? { ...s, quiz_subtitle: e.target.value } : s)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-yellow-500/60 text-sm"
            />
            <button
              onClick={() => saveSetting('quiz_subtitle', settings.quiz_subtitle)}
              disabled={saving === 'quiz_subtitle'}
              className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            >
              {saved === 'quiz_subtitle' ? <CheckCircle2 className="w-4 h-4" /> : saving === 'quiz_subtitle' ? <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>

        {/* Default Timer */}
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-[#13111a] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-yellow-500" />
            <h3 className="text-white font-semibold">Default Timer</h3>
            <span className="text-gray-500 text-sm">(used when creating new questions)</span>
          </div>
          <div className="flex items-center gap-4">
            <input
              type="range" min={10} max={120} step={5}
              value={Number(settings.default_timer_seconds)}
              onChange={e => setSettings(s => s ? { ...s, default_timer_seconds: e.target.value } : s)}
              className="flex-1 accent-yellow-500"
            />
            <span className="text-yellow-400 font-bold w-14 text-center bg-yellow-500/10 rounded-lg py-1.5 text-sm">
              {settings.default_timer_seconds}s
            </span>
            <button
              onClick={() => saveSetting('default_timer_seconds', settings.default_timer_seconds)}
              disabled={saving === 'default_timer_seconds'}
              className="flex items-center gap-2 px-4 py-2.5 bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            >
              {saved === 'default_timer_seconds' ? <CheckCircle2 className="w-4 h-4" /> : saving === 'default_timer_seconds' ? <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            </button>
          </div>
        </motion.div>

        {/* Danger zone */}
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-red-950/20 border border-red-900/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-red-400" />
            <h3 className="text-red-400 font-semibold">Danger Zone</h3>
          </div>
          <p className="text-gray-500 text-sm mb-4">
            Reset the quiz to clear all participants and start fresh. Questions are preserved.
          </p>
          <button
            onClick={handleResetQuiz}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              resetConfirm
                ? 'bg-red-500 text-white animate-pulse'
                : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {resetConfirm ? 'Click again to confirm reset' : 'Reset All Participants'}
          </button>
          {resetConfirm && (
            <button onClick={() => setResetConfirm(false)} className="ml-3 text-gray-500 hover:text-gray-300 text-sm underline">Cancel</button>
          )}
        </motion.div>
      </div>
    </div>
  )
}
