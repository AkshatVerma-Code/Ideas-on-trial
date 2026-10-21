'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Trash2, Edit3, Clock, GripVertical, ChevronDown, ChevronUp, Save, X, AlertTriangle, Database } from 'lucide-react'

interface Option {
  id?: string
  text: string
  weight: number
}

interface Question {
  id: string
  text: string
  timer_seconds: number
  display_order: number
  options: (Option & { id: string })[]
}

const defaultOptions = (): Option[] => [
  { text: '', weight: 4 },
  { text: '', weight: 3 },
  { text: '', weight: 2 },
  { text: '', weight: 1 },
]

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [needsConfig, setNeedsConfig] = useState(false)
  const router = useRouter()

  // Form state
  const [formText, setFormText] = useState('')
  const [formTimer, setFormTimer] = useState(30)
  const [formOptions, setFormOptions] = useState<Option[]>(defaultOptions())
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchQuestions = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/questions')
      if (res.status === 401) { router.replace('/admin'); return }
      const data = await res.json()
      setQuestions(data.questions || [])
      if (data.needsConfig) {
        setNeedsConfig(true)
      }
    } catch {
      setError('Could not connect to the database.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchQuestions() }, [])

  const resetForm = () => {
    setFormText('')
    setFormTimer(30)
    setFormOptions(defaultOptions())
    setEditingId(null)
    setError('')
  }

  const openEdit = (q: Question) => {
    setFormText(q.text)
    setFormTimer(q.timer_seconds)
    setFormOptions(q.options.map(o => ({ text: o.text, weight: o.weight, id: o.id })))
    setEditingId(q.id)
    setShowForm(true)
    setError('')
  }

  const handleSave = async () => {
    if (!formText.trim()) { setError('Question text is required.'); return }
    const filledOptions = formOptions.filter(o => o.text.trim())
    if (filledOptions.length < 2) { setError('At least 2 options with text are required.'); return }

    setSaving(true)
    setError('')

    try {
      const payload = {
        text: formText,
        timer_seconds: formTimer,
        display_order: editingId
          ? questions.find(q => q.id === editingId)?.display_order ?? questions.length
          : questions.length,
        options: filledOptions,
        ...(editingId ? { id: editingId } : {}),
      }

      const res = await fetch('/api/admin/questions', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (res.ok) {
        await fetchQuestions()
        setShowForm(false)
        resetForm()
      } else {
        setError(data.error || 'Failed to save question.')
      }
    } catch {
      setError('Network error while saving question.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this question? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await fetch(`/api/admin/questions?id=${id}&confirm=true`, { method: 'DELETE' })
      await fetchQuestions()
    } catch {
      setError('Failed to delete question.')
    } finally {
      setDeletingId(null)
    }
  }

  const updateOption = (idx: number, field: keyof Option, value: string | number) => {
    setFormOptions(opts => opts.map((o, i) => i === idx ? { ...o, [field]: value } : o))
  }

  const addOption = () => {
    if (formOptions.length >= 6) return
    setFormOptions(opts => [...opts, { text: '', weight: 1 }])
  }

  const removeOption = (idx: number) => {
    if (formOptions.length <= 2) return
    setFormOptions(opts => opts.filter((_, i) => i !== idx))
  }

  const weightColors: Record<number, string> = {
    1: 'text-red-400 bg-red-500/10 border-red-500/20',
    2: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    3: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    4: 'text-green-400 bg-green-500/10 border-green-500/20',
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Questions</h1>
          <p className="text-gray-500 text-sm mt-1">{questions.length} question{questions.length !== 1 ? 's' : ''} in quiz</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold px-4 py-2.5 rounded-xl text-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Question
        </button>
      </div>

      {/* Supabase Not Configured Banner */}
      {needsConfig && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <Database className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-300 font-semibold text-sm">Supabase Credentials Needed</p>
            <p className="text-gray-400 text-xs mt-1">
              Add your real <code className="text-yellow-400 bg-black/40 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="text-yellow-400 bg-black/40 px-1 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</code> in <code className="text-yellow-400 bg-black/40 px-1 py-0.5 rounded">ideas-on-trial/.env.local</code> to save and load questions from the database.
            </p>
          </div>
        </div>
      )}

      {/* Question form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="bg-[#13111a] border border-yellow-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-bold">{editingId ? 'Edit Question' : 'New Question'}</h2>
                <button onClick={() => { setShowForm(false); resetForm() }} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                {/* Question text */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Question Text *</label>
                  <textarea
                    value={formText}
                    onChange={e => setFormText(e.target.value)}
                    placeholder="Enter your question here..."
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/60 resize-none"
                  />
                </div>

                {/* Timer */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-500" /> Timer (seconds)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min={10} max={120} step={5}
                      value={formTimer}
                      onChange={e => setFormTimer(Number(e.target.value))}
                      className="flex-1 accent-yellow-500"
                    />
                    <span className="text-yellow-400 font-bold w-12 text-center bg-yellow-500/10 rounded-lg py-1 text-sm">{formTimer}s</span>
                  </div>
                </div>

                {/* Options */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-300">Answer Options *</label>
                    <button
                      onClick={addOption}
                      disabled={formOptions.length >= 6}
                      className="text-yellow-400 hover:text-yellow-300 text-xs flex items-center gap-1 disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" /> Add option
                    </button>
                  </div>
                  <div className="space-y-3">
                    {formOptions.map((option, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-gray-600">
                          <GripVertical className="w-4 h-4" />
                          <span className="text-xs font-mono w-4 text-center">{String.fromCharCode(65 + idx)}</span>
                        </div>
                        <input
                          type="text"
                          value={option.text}
                          onChange={e => updateOption(idx, 'text', e.target.value)}
                          placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/60 text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">Weight</label>
                          <select
                            value={option.weight}
                            onChange={e => updateOption(idx, 'weight', Number(e.target.value))}
                            className={`border rounded-lg px-2 py-1.5 text-xs font-bold focus:outline-none ${weightColors[option.weight] || 'text-gray-400 bg-white/5 border-white/10'}`}
                          >
                            {[1,2,3,4,5,6,7,8,9,10].map(w => <option key={w} value={w}>{w}</option>)}
                          </select>
                        </div>
                        <button
                          onClick={() => removeOption(idx)}
                          disabled={formOptions.length <= 2}
                          className="text-gray-600 hover:text-red-400 disabled:opacity-30 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 mt-2">Options with empty text will be ignored. Weight = points awarded for choosing this option.</p>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <p className="text-red-300 text-sm">{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowForm(false); resetForm() }}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white text-sm transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 disabled:opacity-50 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    {saving ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <><Save className="w-4 h-4" />{editingId ? 'Update' : 'Save'} Question</>}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Questions list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-16 bg-[#13111a] border border-white/5 rounded-2xl">
          <p className="text-gray-500 mb-2">No questions yet.</p>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="text-yellow-400 hover:text-yellow-300 text-sm underline"
          >
            Add your first question
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="bg-[#13111a] border border-white/5 hover:border-yellow-900/30 rounded-2xl overflow-hidden transition-colors"
            >
              <div className="p-4 flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-yellow-500/15 border border-yellow-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-yellow-400 text-xs font-bold">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium leading-relaxed">{q.text}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />{q.timer_seconds}s
                    </span>
                    <span className="text-xs text-gray-500">{q.options.length} options</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                    className="text-gray-500 hover:text-gray-300 p-1.5 rounded-lg hover:bg-white/5"
                  >
                    {expandedId === q.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => openEdit(q)}
                    className="text-gray-500 hover:text-yellow-400 p-1.5 rounded-lg hover:bg-yellow-500/10"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    disabled={deletingId === q.id}
                    className="text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-40"
                  >
                    {deletingId === q.id
                      ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                      : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded options */}
              <AnimatePresence>
                {expandedId === q.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-white/5"
                  >
                    <div className="px-4 py-3 space-y-2">
                      {q.options.map((opt, i) => (
                        <div key={opt.id} className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 font-mono w-4">{String.fromCharCode(65+i)}</span>
                          <span className="flex-1 text-gray-300 text-sm">{opt.text}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${
                            opt.weight >= 4 ? 'text-green-400 bg-green-500/10 border-green-500/20' :
                            opt.weight === 3 ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                            opt.weight === 2 ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                            'text-red-400 bg-red-500/10 border-red-500/20'
                          }`}>
                            {opt.weight} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
