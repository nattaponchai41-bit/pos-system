import { NextRequest } from 'next/server'
import { errorResponse, handleError } from '@/lib/api'
import { getUploadDir } from '@/lib/upload'
import fs from 'fs/promises'
import path from 'path'

interface RouteParams {
  params: Promise<{ path: string[] }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { path: segments } = await params
    if (!segments || segments.length < 2) {
      return errorResponse('Invalid path', 400)
    }

    const filePath = path.join(getUploadDir(), ...segments)
    const resolved = path.resolve(filePath)
    const uploadRoot = path.resolve(getUploadDir())

    if (!resolved.startsWith(uploadRoot)) {
      return errorResponse('Access denied', 403)
    }

    const file = await fs.readFile(resolved)
    const ext = path.extname(resolved).toLowerCase()
    const contentType =
      ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
        ? 'image/jpeg'
        : ext === '.gif'
        ? 'image/gif'
        : ext === '.webp'
        ? 'image/webp'
        : 'application/octet-stream'

    return new Response(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return errorResponse('File not found', 404)
    }
    return handleError(error)
  }
}
