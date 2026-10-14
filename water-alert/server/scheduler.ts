export const CHECK_INTERVAL_MS = 5 * 60_000
export function startChecking(check: () => Promise<void>, onError: (error: unknown) => void = () => {}): () => void {
  let running = false
  let stopped = false
  async function tick() {
    if (running || stopped) return
    running = true
    try { await check() } catch (error) { onError(error) } finally { running = false }
  }
  void tick()
  const timer = setInterval(() => void tick(), CHECK_INTERVAL_MS)
  return () => { stopped = true; clearInterval(timer) }
}
