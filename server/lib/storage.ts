import fs from 'fs'
import path from 'path'
import os from 'os'
import type { DbShape } from '../../shared/types.js'
import { supabase } from './supabase.js'

const IS_VERCEL = process.env.VERCEL === '1'

export function getDataDir(): string {
  if (IS_VERCEL) return path.join(os.tmpdir(), 'rwgroup_data')
  return path.join(process.cwd(), 'server', 'data')
}

export function getUploadsDir(): string {
  if (IS_VERCEL) return path.join(os.tmpdir(), 'rwgroup_uploads')
  return path.join(process.cwd(), 'server', 'uploads')
}

export function getDbFilePath(): string {
  return path.join(getDataDir(), 'db.json')
}

export function ensureDataDir(): void {
  const dir = getDataDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function ensureUploadsDir(): void {
  const dir = getUploadsDir()
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export async function dbExists(): Promise<boolean> {
  if (supabase) {
    const { data, error } = await supabase.from('app_data').select('id').eq('id', 1).single()
    return !error && !!data
  }
  ensureDataDir()
  return fs.existsSync(getDbFilePath())
}

function readDbLocal(): DbShape {
  ensureDataDir()
  const dbFile = getDbFilePath()
  
  if (!fs.existsSync(dbFile)) {
    if (IS_VERCEL) {
       const sourcePath = path.join(process.cwd(), 'server', 'data', 'db.json')
       if (fs.existsSync(sourcePath)) {
         try {
           const content = fs.readFileSync(sourcePath, 'utf-8')
           fs.writeFileSync(dbFile, content)
           return JSON.parse(content) as DbShape
         } catch (e) {
           console.error('Failed to copy initial DB:', e)
         }
       }
    }
    throw new Error('DB_NOT_INITIALIZED')
  }
  const raw = fs.readFileSync(dbFile, 'utf-8')
  return JSON.parse(raw) as DbShape
}

export async function readDb(): Promise<DbShape> {
  if (supabase) {
    const { data, error } = await supabase.from('app_data').select('data').eq('id', 1).single()
    if (error || !data) {
      // Fallback: try to seed from local if Supabase is empty
      try {
        const local = readDbLocal()
        await writeDb(local)
        return local
      } catch {
        throw new Error('DB_NOT_INITIALIZED_IN_SUPABASE')
      }
    }
    return data.data as DbShape
  }
  return readDbLocal()
}

function writeDbLocal(db: DbShape): void {
  ensureDataDir()
  const dbFile = getDbFilePath()
  const tmp = `${dbFile}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8')
  fs.renameSync(tmp, dbFile)
}

export async function writeDb(db: DbShape): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('app_data').upsert({ id: 1, data: db })
    if (error) throw new Error(`Supabase write failed: ${error.message}`)
    return
  }
  writeDbLocal(db)
}

export async function withDb<T>(fn: (db: DbShape) => Promise<T> | T): Promise<T> {
  const db = await readDb()
  const result = await fn(db)
  await writeDb(db)
  return result
}
