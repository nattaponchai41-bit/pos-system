import { NextRequest } from 'next/server'
import { successResponse, errorResponse, handleError, requireAuthPermission } from '@/lib/api'
import { saveStoreLogo, deleteProductImage } from '@/lib/upload'

export async function POST(request: NextRequest) {
  try {
    await requireAuthPermission('SYSTEM_SETTING')

    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      return errorResponse('ต้องใช้ multipart/form-data', 400)
    }

    const formData = await request.formData()
    const file = formData.get('image') as File | null
    const currentUrl = (formData.get('currentUrl') as string | null) ?? null

    if (!file || file.size === 0) {
      return errorResponse('ไม่พบไฟล์', 400)
    }

    if (!file.type.startsWith('image/')) {
      return errorResponse('ต้องเป็นไฟล์รูปภาพ', 400)
    }

    if (file.size > 5 * 1024 * 1024) {
      return errorResponse('ขนาดไฟล์ต้องไม่เกิน 5MB', 400)
    }

    const saved = await saveStoreLogo(file)

    if (currentUrl && currentUrl.startsWith('/api/uploads/store/')) {
      await deleteProductImage(currentUrl)
    }

    return successResponse({ url: saved.publicPath, fileName: saved.fileName })
  } catch (error) {
    return handleError(error)
  }
}
