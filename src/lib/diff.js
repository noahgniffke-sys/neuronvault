import DiffMatchPatch from 'diff-match-patch'

const dmp = new DiffMatchPatch()

export function computeDiff(oldText, newText) {
  const diffs = dmp.diff_main(oldText, newText)
  dmp.diff_cleanupSemantic(diffs)
  return diffs
}

export function diffToHtml(diffs) {
  return diffs.map(([op, text]) => {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (op === 1) return `<span class="diff-add diff-add-text">${escaped}</span>`
    if (op === -1) return `<span class="diff-remove diff-remove-text">${escaped}</span>`
    return `<span>${escaped}</span>`
  }).join('')
}

export function hasDiff(oldText, newText) {
  if (oldText === newText) return false
  const diffs = dmp.diff_main(oldText, newText)
  return diffs.some(([op]) => op !== 0)
}

export function diffStats(diffs) {
  let additions = 0
  let deletions = 0
  for (const [op, text] of diffs) {
    if (op === 1) additions += text.length
    if (op === -1) deletions += text.length
  }
  return { additions, deletions }
}
