export function formatIdValue(idValue: string): string {
  return String(idValue)
    .trim()
    .replace(/[^a-zA-Z0-9]/g, '')
}
