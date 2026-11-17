import type { HelpAttachment } from './help-requests'

const TAGS: Record<string, [string, string]> = {
  'image/jpeg': ['JPG', 'is-image'], 'image/png': ['PNG', 'is-image'],
  'video/mp4': ['MP4', 'is-video'], 'video/webm': ['WEBM', 'is-video'],
  'application/pdf': ['PDF', 'is-pdf'], 'text/plain': ['TXT', 'is-text'],
}
export const attachmentTag = (file: HelpAttachment) => TAGS[file.type] ?? [(file.name.split('.').pop() ?? 'FILE').slice(0, 4).toUpperCase(), 'is-text']

/** Decoded size of the stored base64 payload. */
export function attachmentSize(file: HelpAttachment) {
  const bytes = Math.max(0, Math.floor(file.data.length * 3 / 4) - (file.data.endsWith('==') ? 2 : file.data.endsWith('=') ? 1 : 0))
  return bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
