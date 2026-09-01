/**
 * Ollama local LLM client. Zero API keys, runs entirely on the user's machine.
 *
 * Setup:
 *   brew install ollama   # or curl -fsSL https://ollama.com/install.sh | sh
 *   ollama pull qwen2.5:7b
 *   ollama serve          # runs on http://localhost:11434
 *
 * If Ollama isn't running, calls throw and the agent falls back to templates.
 */

import "server-only"

const DEFAULT_BASE = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434"
const DEFAULT_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b"

export function getOllamaBaseUrl(): string {
  return DEFAULT_BASE
}

export type OllamaOptions = {
  model?: string
  temperature?: number
  maxTokens?: number
}

/**
 * Send a prompt to Ollama and return the response.
 *
 * Two-arg form: `ollamaComplete(prompt, options?)` — uses DEFAULT_BASE.
 * Three-arg form: `ollamaComplete(baseUrl, prompt, options?)` — uses baseUrl.
 */
export async function ollamaComplete(
  arg1: string,
  arg2: string | OllamaOptions,
  arg3?: OllamaOptions,
): Promise<string> {
  const baseUrl = arg2 && typeof arg2 === "string" ? arg1 : DEFAULT_BASE
  const prompt = arg2 && typeof arg2 === "string" ? arg2 : arg1
  const options = arg3 ?? (typeof arg2 === "object" ? arg2 : {})
  return ollamaCompleteWithBase(baseUrl, prompt, options)
}

export async function ollamaCompleteWithBase(
  baseUrl: string,
  prompt: string,
  options: OllamaOptions = {},
): Promise<string> {
  const model = options.model ?? DEFAULT_MODEL
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.4,
        num_predict: options.maxTokens ?? 800,
      },
    }),
  })
  if (!res.ok) {
    throw new Error(`Ollama returned ${res.status}`)
  }
  const data = (await res.json()) as { response?: string }
  return data.response ?? ""
}

/**
 * Stream a completion to the caller. Each chunk is the next text fragment.
 */
export async function ollamaStream(
  baseUrl: string,
  prompt: string,
  onChunk: (text: string) => void,
  options: OllamaOptions = {},
): Promise<void> {
  const model = options.model ?? DEFAULT_MODEL
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: true,
      options: {
        temperature: options.temperature ?? 0.4,
        num_predict: options.maxTokens ?? 800,
      },
    }),
  })
  if (!res.ok || !res.body) {
    throw new Error(`Ollama stream failed: ${res.status}`)
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    const text = decoder.decode(value)
    for (const line of text.split("\n")) {
      try {
        const json = JSON.parse(line) as { response?: string }
        if (json.response) onChunk(json.response)
      } catch {
        // skip non-JSON lines
      }
    }
  }
}

/**
 * Quick check whether Ollama is reachable.
 */
export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${DEFAULT_BASE}/api/tags`, {
      signal: AbortSignal.timeout(1000),
    })
    return res.ok
  } catch {
    return false
  }
}
