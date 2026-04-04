import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { fetchNote, fetchVersions } from '../lib/notes'
import { computeDiff, diffToHtml, diffStats } from '../lib/diff'
import { ArrowLeft, Loader2, Plus, Minus } from 'lucide-react'

export default function NoteDiff() {
  const { id, v1, v2 } = useParams()
  const navigate = useNavigate()

  const [note, setNote] = useState(null)
  const [diffHtml, setDiffHtml] = useState('')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [noteData, versions] = await Promise.all([
          fetchNote(id),
          fetchVersions(id),
        ])
        setNote(noteData)

        const version1 = versions.find(v => v.version_number === parseInt(v1))
        const version2 = versions.find(v => v.version_number === parseInt(v2))

        if (!version1 || !version2) {
          navigate(`/note/${id}/history`)
          return
        }

        const diffs = computeDiff(version1.content, version2.content)
        setDiffHtml(diffToHtml(diffs))
        setStats(diffStats(diffs))
      } catch (err) {
        console.error('Failed to load diff:', err)
        navigate(`/note/${id}/history`)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, v1, v2])

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
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(`/note/${id}/history`)} className="p-1.5 text-gray-400 hover:text-gray-600 transition">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{note?.title}</h1>
              <p className="text-xs text-gray-500">Comparing v{v1} to v{v2}</p>
            </div>
          </div>
          {stats && (
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <Plus className="h-4 w-4" /> {stats.additions} added
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <Minus className="h-4 w-4" /> {stats.deletions} removed
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: diffHtml }}
        />
      </div>
    </div>
  )
}
