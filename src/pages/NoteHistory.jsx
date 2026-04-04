import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchNote, fetchVersions } from '../lib/notes'
import { diffStats } from '../lib/diff'
import { ArrowLeft, GitCommit, Plus, Minus, Loader2 } from 'lucide-react'

export default function NoteHistory() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [note, setNote] = useState(null)
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedVersions, setSelectedVersions] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const [noteData, versionsData] = await Promise.all([
          fetchNote(id),
          fetchVersions(id),
        ])
        setNote(noteData)
        setVersions(versionsData)
      } catch (err) {
        console.error('Failed to load history:', err)
        navigate('/dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  function toggleVersion(versionNumber) {
    setSelectedVersions(prev => {
      if (prev.includes(versionNumber)) return prev.filter(v => v !== versionNumber)
      if (prev.length >= 2) return [prev[1], versionNumber]
      return [...prev, versionNumber]
    })
  }

  function compareDiff() {
    if (selectedVersions.length !== 2) return
    const [v1, v2] = selectedVersions.sort((a, b) => a - b)
    navigate(`/note/${id}/diff/${v1}/${v2}`)
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/note/${id}`)} className="p-1.5 text-gray-400 hover:text-gray-600 transition">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{note?.title}</h1>
              <p className="text-xs text-gray-500">{versions.length} version{versions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          {selectedVersions.length === 2 && (
            <button onClick={compareDiff}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition">
              Compare v{Math.min(...selectedVersions)} vs v{Math.max(...selectedVersions)}
            </button>
          )}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {versions.length === 0 ? (
          <p className="text-center text-gray-500 py-10">No version history yet.</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-4">
              {versions.map((version) => {
                const stats = version.diff_from_previous ? diffStats(version.diff_from_previous) : null
                const isSelected = selectedVersions.includes(version.version_number)

                return (
                  <div key={version.id}
                    onClick={() => toggleVersion(version.version_number)}
                    className={`relative flex items-start gap-4 pl-10 cursor-pointer group ${isSelected ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}>
                    {/* Timeline dot */}
                    <div className={`absolute left-3.5 top-2 w-3 h-3 rounded-full border-2 transition ${
                      isSelected ? 'bg-primary-600 border-primary-600' : 'bg-white border-gray-300 group-hover:border-primary-400'
                    }`} />

                    <div className={`flex-1 rounded-xl border p-4 transition ${
                      isSelected ? 'bg-primary-50 border-primary-200' : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                          <GitCommit className="h-4 w-4 text-gray-400" />
                          v{version.version_number}
                        </span>
                        <span className="text-xs text-gray-400">{formatDate(version.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{version.commit_message || 'No message'}</p>
                      {stats && (
                        <div className="flex items-center gap-3 text-xs">
                          {stats.additions > 0 && (
                            <span className="flex items-center gap-0.5 text-green-600">
                              <Plus className="h-3 w-3" /> {stats.additions}
                            </span>
                          )}
                          {stats.deletions > 0 && (
                            <span className="flex items-center gap-0.5 text-red-500">
                              <Minus className="h-3 w-3" /> {stats.deletions}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center mt-6">
          Select two versions to compare their differences
        </p>
      </div>
    </div>
  )
}
