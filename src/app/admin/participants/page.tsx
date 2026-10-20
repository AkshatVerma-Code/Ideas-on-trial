'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Users, Trophy, Clock, Search, Trash2, CheckCircle2, RefreshCw, ChevronDown, ChevronUp, Download } from 'lucide-react'

interface Participant {
  id: string
  team_name: string
  started_at: string
  completed_at: string | null
  total_score: number
  ip_address: string | null
  avgTimeSeconds: number
  totalTimeSeconds: number
}

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'score' | 'time' | 'name'>('score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const fetchParticipants = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/participants')
    if (res.status === 401) { router.replace('/admin'); return }
    const data = await res.json()
    setParticipants(data.participants || [])
    setLoading(false)
  }

  useEffect(() => { fetchParticipants() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the quiz? This will delete all their answers.`)) return
    setDeletingId(id)
    await fetch(`/api/admin/participants?id=${id}`, { method: 'DELETE' })
    await fetchParticipants()
    setDeletingId(null)
  }

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const filtered = participants
    .filter(p => p.team_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'score') cmp = a.total_score - b.total_score
      else if (sortBy === 'time') cmp = new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
      else cmp = a.team_name.localeCompare(b.team_name)
      return sortDir === 'desc' ? -cmp : cmp
    })

  const completed = participants.filter(p => p.completed_at)
  const inProgress = participants.filter(p => !p.completed_at)

  const downloadCSV = () => {
      const rows = [
        ['Rank', 'Team Name', 'Score', 'Status', 'Started At', 'Completed At', 'Avg Time/Q (s)', 'IP'],
        ...filtered.map((p, i) => [
          String(i + 1),
          p.team_name,
          String(p.total_score),
          p.completed_at ? 'Completed' : 'In Progress',
          new Date(p.started_at).toLocaleString(),
          p.completed_at ? new Date(p.completed_at).toLocaleString() : '-',
          String(p.avgTimeSeconds || 0),
          p.ip_address || '-',
        ])
      ]
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ideas-on-trial-participants.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const SortIcon = ({ field }: { field: typeof sortBy }) => {
    if (sortBy !== field) return <ChevronDown className="w-3 h-3 text-gray-600" />
    return sortDir === 'desc'
      ? <ChevronDown className="w-3 h-3 text-yellow-400" />
      : <ChevronUp className="w-3 h-3 text-yellow-400" />
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-white">Participants</h1>
          <p className="text-gray-500 text-sm mt-1">
            {completed.length} completed · {inProgress.length} in progress
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadCSV}
            className="flex items-center gap-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl text-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={fetchParticipants}
            className="flex items-center gap-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl text-sm transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#13111a] border border-white/5 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-white">{participants.length}</div>
          <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1"><Users className="w-3 h-3" />Total Teams</div>
        </div>
        <div className="bg-[#13111a] border border-green-500/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-green-400">{completed.length}</div>
          <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" />Completed</div>
        </div>
        <div className="bg-[#13111a] border border-yellow-500/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-yellow-400">{inProgress.length}</div>
          <div className="text-xs text-gray-500 mt-1 flex items-center justify-center gap-1"><Clock className="w-3 h-3" />In Progress</div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by team name..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/60 text-sm"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-[#13111a] border border-white/5 rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-white/5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <div className="col-span-1">#</div>
            <div className="col-span-4 cursor-pointer flex items-center gap-1 hover:text-gray-300" onClick={() => toggleSort('name')}>
              Team <SortIcon field="name" />
            </div>
            <div className="col-span-2 cursor-pointer flex items-center gap-1 hover:text-gray-300" onClick={() => toggleSort('score')}>
              Score <SortIcon field="score" />
            </div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 cursor-pointer flex items-center gap-1 hover:text-gray-300 hidden sm:flex" onClick={() => toggleSort('time')}>
              Started <SortIcon field="time" />
            </div>
            <div className="col-span-2 hidden sm:block">Avg Time/Q</div>
            <div className="col-span-1" />
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">{search ? 'No teams match your search.' : 'No participants yet.'}</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="grid grid-cols-12 gap-2 px-4 py-3.5 items-center hover:bg-white/2 transition-colors"
                >
                  <div className="col-span-1">
                    {sortBy === 'score' && p.completed_at ? (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i === 0 ? 'bg-yellow-500 text-black' :
                        i === 1 ? 'bg-gray-300 text-black' :
                        i === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-gray-400'
                      }`}>{i+1}</div>
                    ) : (
                      <span className="text-gray-600 text-xs">{i+1}</span>
                    )}
                  </div>
                  <div className="col-span-4 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.team_name}</p>
                    <p className="text-gray-600 text-xs hidden sm:block">{p.ip_address || 'IP unknown'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className={`text-sm font-bold ${p.completed_at ? 'text-yellow-400' : 'text-gray-500'}`}>
                      {p.completed_at ? p.total_score : '—'}
                    </span>
                    {p.completed_at && <span className="text-gray-600 text-xs"> pts</span>}
                  </div>
                  <div className="col-span-2">
                    {p.completed_at ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Done
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2 py-0.5">
                        <Clock className="w-3 h-3" /> Live
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 hidden sm:block">
                    <p className="text-gray-500 text-xs">{new Date(p.started_at).toLocaleTimeString()}</p>
                    <p className="text-gray-600 text-xs">{new Date(p.started_at).toLocaleDateString()}</p>
                  </div>
                  <div className="col-span-2 hidden sm:block">
                    <p className="text-gray-500 text-xs">{p.avgTimeSeconds || 0}s</p>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => handleDelete(p.id, p.team_name)}
                      disabled={deletingId === p.id}
                      className="text-gray-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all disabled:opacity-40"
                      title="Remove participant"
                    >
                      {deletingId === p.id
                        ? <div className="w-4 h-4 border border-red-400 border-t-transparent rounded-full animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
