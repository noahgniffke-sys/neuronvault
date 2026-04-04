import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchNote, updateNote, createVersion, syncLinks, fetchBacklinks, branchNote } from '../lib/notes'
import { renderMarkdown } from '../lib/markdown'
import {
  ArrowLeft, Save, Eye, Edit3, History, GitBranch,
  Loader2, Link2, Download, Brain
} from 'lucide-react'

export default function NoteEditor() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [note, setNote] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)
  const [backlinks, setBacklinks] = useState([])
  const [lastSaved, setLastSaved] = useState('')
  const [branchModal, setBranchModal] = useState(false)
  const [branchName, setBranchName] = useState('')

  const saveTimer = useRef(null)
  const contentRef = useRef(content)
  contentRef.current = content

  useEffect(() => {
    loadNote()
    loadBacklinks()
  }, [id])

  async function loadNote() {
    try {
      const data = await fetchNote(id)
      setNote(data)
      setTitle(data.title)
      setContent(data.content)
      setLastSaved(data.content)
    } catch (err) {
      console.error('Failed to load note:', err)
      navigate('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function loadBacklinks() {
    try {
      const links = await fetchBacklinks(id)
      setBacklinks(links)
    } catch (err) {
      console.error('Failed to load backlinks:', err)
    }
  }

  const save = useCallback(async (forceVersion = false) => {
    setSaving(true)
    try {
      await updateNote(id, { title, content: contentRef.current })
      await syncLinks(id, contentRef.current)

      // Auto-version if content changed significantly
      if (forceVersion || contentRef.current !== lastSaved) {
        await createVersion(id, contentRef.current)
        setLastSaved(contentRef.current)
      }
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }, [id, title, lastSaved])

  function handleContentChange(e) {
    setContent(e.target.value)

    // Debounced auto-save (3 seconds)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(), 3000)
  }

  function handleTitleChange(e) {
    setTitle(e.target.value)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(), 3000)
  }

  // Save on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (contentRef.current !== lastSaved) {
        save(true)
      }
    }
  }, [lastSaved])

  // Keyboard shortcut: Cmd+S
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        save(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [save])

  async function handleBranch() {
    if (!branchName.trim()) return
    try {
      const branch = await branchNote(id, branchName)
      setBranchModal(false)
      setBranchName('')
      navigate(`/note/${branch.id}`)
    } catch (err) {
      console.error('Branch failed:', err)
    }
  }

  function handleExport() {
    const blob = new Blob([`# ${title}\n\n${content}`], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/[^a-zA-Z0-9]/g, '-')}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleWikiLinkClick(e) {
    if (e.target.classList.contains('wiki-link')) {
      const linkTitle = e.target.dataset.link
      // Find note by title and navigate
      navigate(`/dashboard?search=${encodeURIComponent(linkTitle)}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { save(true); navigate('/dashboard') }} className="p-1.5 text-gray-400 hover:text-gray-600 transition">
              <ArrowLeft className="h-5 w-5" />
            </button>
            {note?.is_branch && (
              <span className="flex items-center gap-1 text-xs text-accent-600 bg-accent-50 px-2 py-1 rounded-full">
                <GitBranch className="h-3 w-3" /> {note.branch_name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {saving && <Loader2 className="h-4 w-4 text-gray-400 animate-spin mr-2" />}
            <button onClick={() => setPreview(!preview)}
              className={`p-2 rounded-lg transition ${preview ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:text-gray-600'}`}
              title={preview ? 'Edit' : 'Preview'}>
              {preview ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button onClick={() => navigate(`/note/${id}/history`)} className="p-2 text-gray-400 hover:text-gray-600 transition" title="History">
              <History className="h-4 w-4" />
            </button>
            <button onClick={() => setBranchModal(true)} className="p-2 text-gray-400 hover:text-gray-600 transition" title="Branch">
              <GitBranch className="h-4 w-4" />
            </button>
            <button onClick={handleExport} className="p-2 text-gray-400 hover:text-gray-600 transition" title="Export as Markdown">
              <Download className="h-4 w-4" />
            </button>
            <button onClick={() => save(true)}
              className="ml-2 flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 transition">
              <Save className="h-3.5 w-3.5" /> Save
            </button>
          </div>
        </div>
      </header>

      {/* Editor area */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <input
          type="text" value={title} onChange={handleTitleChange}
          placeholder="Note title..."
          className="w-full text-2xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder:text-gray-300 mb-4"
        />

        {preview ? (
          <div
            className="prose-nv text-gray-800 min-h-[60vh]"
            onClick={handleWikiLinkClick}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        ) : (
          <textarea
            value={content} onChange={handleContentChange}
            placeholder="Start writing... Use **bold**, *italic*, [[link to note]], and Markdown."
            className="w-full min-h-[60vh] text-gray-800 bg-transparent border-none outline-none resize-none font-mono text-sm leading-relaxed placeholder:text-gray-300"
          />
        )}
      </div>

      {/* Backlinks panel */}
      {backlinks.length > 0 && (
        <div className="max-w-5xl w-full mx-auto px-4 pb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-2">
              <Link2 className="h-4 w-4" /> Backlinks ({backlinks.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {backlinks.map((bl) => (
                <Link key={bl.id} to={`/note/${bl.id}`}
                  className="text-sm text-primary-600 hover:text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg transition">
                  {bl.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Branch modal */}
      {branchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Branch this note</h2>
            <p className="text-sm text-gray-500 mb-4">Create a variation to explore different ideas</p>
            <input
              type="text" value={branchName} onChange={(e) => setBranchName(e.target.value)}
              placeholder="Branch name (e.g., v2, experiment)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleBranch()}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setBranchModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition">Cancel</button>
              <button onClick={handleBranch}
                className="px-4 py-2 text-sm font-medium text-white bg-accent-600 rounded-lg hover:bg-accent-700 transition">
                Create Branch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
