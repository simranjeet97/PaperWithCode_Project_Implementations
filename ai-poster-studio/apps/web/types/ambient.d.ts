declare module "pdf-parse" {
  interface PdfParseResult {
    numpages: number
    numrender: number
    info: Record<string, unknown>
    metadata: Record<string, unknown> | null
    text: string
    version: string
  }
  function pdfParse(
    buffer: Buffer | Uint8Array,
    options?: Record<string, unknown>,
  ): Promise<PdfParseResult>
  export default pdfParse
}

declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    numpages: number
    numrender: number
    info: Record<string, unknown>
    metadata: Record<string, unknown> | null
    text: string
    version: string
  }
  function pdfParse(
    buffer: Buffer | Uint8Array,
    options?: Record<string, unknown>,
  ): Promise<PdfParseResult>
  export default pdfParse
}

declare module "pdfjs-dist" {
  export function getDocument(src: string | { data: ArrayBuffer | Uint8Array }): {
    promise: Promise<{
      numPages: number
      getPage: (n: number) => Promise<{
        getViewport: (opts: { scale: number }) => { width: number; height: number }
        render: (opts: {
          canvasContext: CanvasRenderingContext2D
          viewport: unknown
          canvas: HTMLCanvasElement
        }) => { promise: Promise<void> }
      }>
    }>
  }
  export const GlobalWorkerOptions: { workerSrc: string }
}

declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" {
  const src: string
  export default src
}

declare module "puppeteer-core" {
  export interface Browser {
    newPage(): Promise<Page>
    close(): Promise<void>
  }
  export interface Page {
    setViewport(opts: { width: number; height: number; deviceScaleFactor?: number }): Promise<void>
    setContent(html: string, opts?: { waitUntil?: string; timeout?: number }): Promise<void>
    screenshot(opts: { type: "png" | "jpeg"; fullPage?: boolean }): Promise<Buffer | Uint8Array>
    pdf(opts: {
      width?: string
      height?: string
      printBackground?: boolean
      margin?: { top?: number; bottom?: number; left?: number; right?: number }
      preferCSSPageSize?: boolean
    }): Promise<Buffer | Uint8Array>
  }
  export interface LaunchOptions {
    executablePath?: string
    headless?: boolean
    args?: string[]
  }
  const _default: { launch: (options: LaunchOptions) => Promise<Browser> }
  export default _default
}
