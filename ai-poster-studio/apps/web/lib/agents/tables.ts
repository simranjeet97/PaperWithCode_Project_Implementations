/**
 * Real table extraction via Python pdfplumber.
 *
 * Spawns the Python script as a subprocess. Falls back to empty array
 * if Python or pdfplumber is not available.
 */

import "server-only"
import { execFile } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { promisify } from "node:util"

import type { ContentBrief } from "./ingest"

const execFileAsync = promisify(execFile)

export type ExtractedTable = {
  caption: string
  page: number
  tableNumber: string | null
  headers: string[]
  rows: string[][]
  columnCount: number
}

const SCRIPT_PATH = path.join(process.cwd(), "scripts", "extract-tables.py")

export async function extractTables(pdfPath: string): Promise<ExtractedTable[]> {
  if (!fs.existsSync(SCRIPT_PATH)) {
    console.warn(`extract-tables.py not found at ${SCRIPT_PATH}`)
    return []
  }
  try {
    const { stdout } = await execFileAsync("python3", [SCRIPT_PATH, pdfPath], {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30_000,
    })
    const tables = JSON.parse(stdout) as Array<
      Omit<ExtractedTable, "columnCount"> & { column_count?: number }
    >
    return tables
      .filter(
        (t) =>
          t.headers.length >= 2 && t.rows.length >= 1 && (t.column_count ?? t.headers.length) >= 2,
      )
      .map((t) => ({ ...t, columnCount: t.column_count ?? t.headers.length }))
  } catch (err) {
    console.warn("Table extraction failed:", err instanceof Error ? err.message : err)
    return []
  }
}

export function tablesToBrief(tables: ExtractedTable[]): NonNullable<ContentBrief["tables"]> {
  return tables.slice(0, 3).map((t) => ({
    id: `tbl-extracted-${t.tableNumber ?? t.page}-${Math.random().toString(36).slice(2, 6)}`,
    caption: t.caption,
    pageNumber: t.page,
    headers: t.headers,
    rows: t.rows,
  }))
}
