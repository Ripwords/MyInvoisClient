export function encodeToBase64(content: string): string {
  return Buffer.from(content).toString('base64')
}

export function decodeFromBase64(content: string): string {
  return Buffer.from(content, 'base64').toString('utf-8')
}
