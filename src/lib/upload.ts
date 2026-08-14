import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'

export function getUploadDir(): string {
  const base = process.env.UPLOAD_DIR || path.join(process.env.LOCALAPPDATA || 'C:\\Users\\PC\\AppData\\Local', 'pos-system', 'uploads')
  return base
}

export async function ensureUploadDir(subDir: string): Promise<string> {
  const dir = path.join(getUploadDir(), subDir)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function saveProductImage(file: File): Promise<{ diskPath: string; publicPath: string; fileName: string }> {
  const dir = await ensureUploadDir('products')
  const sanitized = sanitizeFilename(file.name)
  const fileName = `${randomUUID()}-${sanitized}`
  const diskPath = path.join(dir, fileName)

  const bytes = await file.arrayBuffer()
  await fs.writeFile(diskPath, Buffer.from(bytes))

  return {
    diskPath,
    fileName,
    publicPath: `/api/uploads/products/${fileName}`,
  }
}

export async function deleteProductImage(publicPath: string | null | undefined): Promise<void> {
  if (!publicPath) return
  const segments = publicPath.replace(/^\/api\/uploads\//, '').split('/')
  if (segments.length < 2) return
  const diskPath = path.join(getUploadDir(), segments[0], segments[1])
  try {
    await fs.unlink(diskPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('Failed to delete product image', error)
    }
  }
}

export async function resolveStoreLogoUrl(): Promise<string | undefined> {
  const setting = await prisma.storeSetting.findUnique({ where: { id: 'default' } })
  return setting?.logoUrl ?? undefined
}

export async function saveStoreLogo(file: File): Promise<{ diskPath: string; publicPath: string; fileName: string }> {
  const dir = await ensureUploadDir('store')
  const sanitized = sanitizeFilename(file.name)
  const fileName = `logo-${randomUUID()}-${sanitized}`
  const diskPath = path.join(dir, fileName)

  const bytes = await file.arrayBuffer()
  await fs.writeFile(diskPath, Buffer.from(bytes))

  return {
    diskPath,
    fileName,
    publicPath: `/api/uploads/store/${fileName}`,
  }
}
