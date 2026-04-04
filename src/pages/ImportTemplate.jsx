import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createNote } from '../lib/notes'
import { ArrowLeft, Upload, Loader2, CheckCircle, FileText } from 'lucide-react'

export default function ImportTemplate() {
  const navigate = useNavigate()
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    setImporting(true)
    setError('')
    setResult(null)

    try {
      const text = await file.text()
      const template = JSON.parse(text)

      if (!template.notes || !Array.isArray(template.notes)) {
        setError('Invalid template format. Expected { "notes": [...] }')
        return
      }

      let created = 0
      for (const note of template.notes) {
        await createNote(note.title || 'Untitled', note.content || '')
        created++
      }

      setResult({ count: created, name: template.name || file.name })
    } catch (err) {
      if (err.message?.includes('Free plan limit')) {
        setError('You\'ve hit the 50-note free limit. Upgrade to Pro to import more notes.')
      } else if (err instanceof SyntaxError) {
        setError('Invalid JSON file. Please check the template format.')
      } else {
        setError(`Import failed: ${err.message}`)
      }
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="p-1.5 text-gray-400 hover:text-gray-600 transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Import Template</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {result ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <CheckCircle className="h-12 w-12 text-primary-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Import complete</h2>
            <p className="text-sm text-gray-500 mb-6">
              Created {result.count} note{result.count !== 1 ? 's' : ''} from "{result.name}"
            </p>
            <button onClick={() => navigate('/dashboard')}
              className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition">
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8">
            <div className="text-center mb-6">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Import a template</h2>
              <p className="text-sm text-gray-500">Upload a .json template file to create notes in your vault</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-400 transition">
                {importing ? (
                  <Loader2 className="h-8 w-8 text-primary-600 animate-spin mx-auto" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">Click to upload template</p>
                    <p className="text-xs text-gray-400 mt-1">.json file</p>
                  </>
                )}
              </div>
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs font-medium text-gray-600 mb-2">Template format:</p>
              <pre className="text-xs text-gray-500 font-mono">{`{
  "name": "My Template",
  "notes": [
    { "title": "Note 1", "content": "Content..." },
    { "title": "Note 2", "content": "More content..." }
  ]
}`}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
