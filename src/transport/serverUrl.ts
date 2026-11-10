export function simulatorServerUrl(search: string): string | null {
  const value = new URLSearchParams(search).get('server')
  if (!value) {
    return null
  }
  try {
    const url = new URL(value)
    return url.protocol === 'ws:' || url.protocol === 'wss:' ? url.href : null
  } catch {
    return null
  }
}
