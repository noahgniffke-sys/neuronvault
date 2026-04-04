import { marked } from 'marked'
import hljs from 'highlight.js'

marked.setOptions({
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  },
  breaks: true,
  gfm: true,
})

// Custom renderer for [[wiki-links]]
const renderer = new marked.Renderer()
const originalParagraph = renderer.paragraph.bind(renderer)

renderer.paragraph = function ({ text, tokens }) {
  const result = originalParagraph({ text, tokens })
  return result.replace(
    /\[\[([^\]]+)\]\]/g,
    '<span class="wiki-link" data-link="$1">$1</span>'
  )
}

marked.use({ renderer })

export function renderMarkdown(text) {
  return marked.parse(text || '')
}

export function extractWikiLinks(text) {
  const matches = text.match(/\[\[([^\]]+)\]\]/g)
  if (!matches) return []
  return matches.map(m => m.slice(2, -2))
}
