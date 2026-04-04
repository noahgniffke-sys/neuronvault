import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { fetchNotes, createNote, deleteNote, searchNotes } from '../lib/notes'
import { supabase } from '../lib/supabase'
import {
  Plus, Search, Brain, LogOut, Settings, GitBranch,
  Clock, Trash2, Archive, Loader2, FileText, Upload
} from 'lucide-react'

export default function Dashboard() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [profile, setProfile] = useState(null)

  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    loadNotes()
    loadProfile()
  }, [])

  async function loadNotes() {
    try {
      const data = await fetchNotes()
      setNotes(data)
    } catch (err) {
      console.error('Failed to load notes:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadProfile() {
    const { data } = await supabase
      .from('nv_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setProfile(data)
  }

  async function handleNewNote() {
    try {
      const note = await createNote()
      navigate(`/note/${note.id}`)
    } catch (err) {
      if (err.message?.includes('Free plan limit')) {
        alert('You\'ve reached the 50-note free limit. Upgrade to Pro for unlimited notes!')
      }
    }
  }

  async function handleSearch(e) {
    const query = e.target.value
    setSearchQuery(query)

    if (!query.trim()) {
      loadNotes()
      return
    }

    setSearching(true)
    try {
      const results = await searchNotes(query)
      setNotes(results)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setSearching(false)
    }
  }

  async function handleDelete(e, noteId) {
    e.stopPropagation()
    if (!confirm('Delete this note?')) return
    await deleteNote(noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  const noteLimit = profile?.plan === 'free' ? 50 : null
  const noteCount = notes.length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary-600" />
            <span className="text-lg font-bold text-gray-900">NeuronVault</span>
          </div>
          <div className="flex items-center gap-2">
            {noteLimit && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {noteCount}/{noteLimit} notes
              </span>
            )}
            <button onClick={() => navigate('/import')} className="p-2 text-gray-400 hover:text-gray-600 transition" title="Import template">
              <Upload className="h-5 w-5" />
            </button>
            <button onClick={() => navigate('/settings')} className="p-2 text-gray-400 hover:text-gray-600 transition">
              <Settings className="h-5 w-5" />
            </button>
            <button onClick={signOut} className="p-2 text-gray-400 hover:text-gray-600 transition">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search + New Note */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              {searching ? <Loader2 className="h-4 w-4 text-gray-400 animate-spin" /> : <Search className="h-4 w-4 text-gray-400" />}
            </div>
            <input
              type="text" value={searchQuery} onChange={handleSearch}
              placeholder="Search notes..."
              className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none transition"
            />
          </div>
          <button onClick={handleNewNote}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 transition">
            <Plus className="h-4 w-4" /> New Note
          </button>
        </div>

        {/* Notes Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-1">
              {searchQuery ? 'No results found' : 'Your vault is empty'}
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              {searchQuery ? 'Try a different search term' : 'Create your first note to get started'}
            </p>
            {!searchQuery && (
              <button onClick={handleNewNote}
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition">
                <Plus className="h-4 w-4" /> Create Note
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => navigate(`/note/${note.id}`)}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 truncate flex-1">{note.title}</h3>
                  <button
                    onClick={(e) => handleDelete(e, note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 line-clamp-3 mb-3">
                  {note.content?.slice(0, 150) || 'Empty note'}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {formatDate(note.updated_at)}
                  </span>
                  {note.is_branch && (
                    <span className="flex items-center gap-1 text-accent-500">
                      <GitBranch className="h-3 w-3" /> {note.branch_name}
                    </span>
                  )}
                  {note.tags?.length > 0 && (
                    <span className="truncate">{note.tags.map(t => `#${t}`).join(' ')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
