import { supabase } from './supabase'
import { computeDiff, hasDiff } from './diff'
import { extractWikiLinks } from './markdown'

export async function fetchNotes({ archived = false } = {}) {
  const { data, error } = await supabase
    .from('nv_notes')
    .select('*')
    .eq('is_archived', archived)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchNote(id) {
  const { data, error } = await supabase
    .from('nv_notes')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createNote(title = 'Untitled', content = '') {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('nv_notes')
    .insert({ title, content, user_id: user.id })
    .select()
    .single()
  if (error) throw error

  // Create initial version
  await createVersion(data.id, content, 'Initial version')

  return data
}

export async function updateNote(id, updates) {
  const { data, error } = await supabase
    .from('nv_notes')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteNote(id) {
  const { error } = await supabase
    .from('nv_notes')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function archiveNote(id) {
  return updateNote(id, { is_archived: true })
}

// Version management
export async function fetchVersions(noteId) {
  const { data, error } = await supabase
    .from('nv_note_versions')
    .select('*')
    .eq('note_id', noteId)
    .order('version_number', { ascending: false })
  if (error) throw error
  return data
}

export async function createVersion(noteId, content, commitMessage = '') {
  // Get latest version number
  const { data: versions } = await supabase
    .from('nv_note_versions')
    .select('version_number, content')
    .eq('note_id', noteId)
    .order('version_number', { ascending: false })
    .limit(1)

  const lastVersion = versions?.[0]
  const nextNumber = lastVersion ? lastVersion.version_number + 1 : 1

  // Skip if content hasn't changed
  if (lastVersion && !hasDiff(lastVersion.content, content)) return null

  // Compute diff from previous version
  const diff = lastVersion ? computeDiff(lastVersion.content, content) : null

  const { data, error } = await supabase
    .from('nv_note_versions')
    .insert({
      note_id: noteId,
      version_number: nextNumber,
      content,
      diff_from_previous: diff,
      commit_message: commitMessage || autoCommitMessage(diff),
    })
    .select()
    .single()
  if (error) throw error
  return data
}

function autoCommitMessage(diff) {
  if (!diff) return 'Initial version'
  let adds = 0, removes = 0
  for (const [op, text] of diff) {
    if (op === 1) adds += text.split('\n').filter(Boolean).length
    if (op === -1) removes += text.split('\n').filter(Boolean).length
  }
  const parts = []
  if (adds > 0) parts.push(`+${adds} line${adds > 1 ? 's' : ''}`)
  if (removes > 0) parts.push(`-${removes} line${removes > 1 ? 's' : ''}`)
  return parts.join(', ') || 'Updated content'
}

// Bidirectional links
export async function syncLinks(noteId, content) {
  const { data: { user } } = await supabase.auth.getUser()
  const wikiLinks = extractWikiLinks(content)

  if (wikiLinks.length === 0) {
    await supabase.from('nv_links').delete().eq('source_note_id', noteId)
    return
  }

  // Find target notes by title
  const { data: targetNotes } = await supabase
    .from('nv_notes')
    .select('id, title')
    .eq('user_id', user.id)
    .in('title', wikiLinks)

  const targetIds = (targetNotes || []).map(n => n.id)

  // Delete old links
  await supabase.from('nv_links').delete().eq('source_note_id', noteId)

  // Insert new links
  if (targetIds.length > 0) {
    await supabase.from('nv_links').insert(
      targetIds.map(targetId => ({
        source_note_id: noteId,
        target_note_id: targetId,
        user_id: user.id,
      }))
    )
  }
}

export async function fetchBacklinks(noteId) {
  const { data, error } = await supabase
    .from('nv_links')
    .select('source_note_id, nv_notes!nv_links_source_note_id_fkey(id, title)')
    .eq('target_note_id', noteId)
  if (error) throw error
  return data?.map(l => l.nv_notes).filter(Boolean) || []
}

// Search
export async function searchNotes(query) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase.rpc('nv_search_notes', {
    search_query: query,
    user_uuid: user.id,
  })
  if (error) throw error
  return data
}

// Branching
export async function branchNote(noteId, branchName) {
  const original = await fetchNote(noteId)
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('nv_notes')
    .insert({
      title: `${original.title} (${branchName})`,
      content: original.content,
      parent_id: noteId,
      branch_name: branchName,
      is_branch: true,
      tags: original.tags,
      user_id: user.id,
    })
    .select()
    .single()
  if (error) throw error

  await createVersion(data.id, original.content, `Branched from "${original.title}"`)
  return data
}

export async function mergeNote(branchId, targetId) {
  const branch = await fetchNote(branchId)
  await updateNote(targetId, { content: branch.content })
  await createVersion(targetId, branch.content, `Merged from "${branch.title}"`)
}
