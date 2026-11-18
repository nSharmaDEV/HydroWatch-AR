import { execFile } from 'node:child_process'

/** Never run synchronous PDF parsers on the HTTP server's event loop. */
export function runPdfTool(program: string, args: string[], pdf: Buffer, timeout = 10_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(program, args, { timeout, killSignal: 'SIGKILL', maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' }, (error, stdout) => {
      if (error) reject(error)
      else resolve(stdout)
    })
    child.stdin?.on('error', () => { /* An early exit is handled by execFile's callback. */ })
    child.stdin?.end(pdf)
  })
}

export const asyncPopplerTools = {
  text: (pdf: Buffer) => runPdfTool('pdftotext', ['-layout', '-', '-'], pdf),
  pages: async (pdf: Buffer) => Number(/Pages:\s+(\d+)/.exec(await runPdfTool('pdfinfo', ['-'], pdf))?.[1] ?? 0),
}
