/**
 * Client-side image-quality analysis.
 *
 * Runs entirely in the browser on a <canvas> — no server round-trip needed.
 * Returns sharpness (Laplacian variance proxy), brightness, resolution and a
 * verdict the UI can surface before submitting to the AI analysis API.
 */
export interface ImageQuality {
  width: number
  height: number
  brightness: number // 0..255 mean luminance
  sharpness: number // Laplacian-variance proxy; higher = sharper
  contrast: number // std-dev of luminance
  status: 'good' | 'acceptable' | 'poor'
  checks: { label: string; ok: boolean; detail: string }[]
}

export async function analyseImageQuality(dataUrl: string, maxDim = 512): Promise<ImageQuality> {
  const img = await loadImage(dataUrl)
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(img, 0, 0, w, h)
  const { data } = ctx.getImageData(0, 0, w, h)

  const gray = new Float32Array(w * h)
  let sum = 0
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const lum = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]
    gray[i] = lum
    sum += lum
  }
  const brightness = sum / gray.length

  let varSum = 0
  for (let i = 0; i < gray.length; i++) varSum += (gray[i] - brightness) ** 2
  const contrast = Math.sqrt(varSum / gray.length)

  // Laplacian variance (sharpness proxy)
  let lapSum = 0
  let lapSqSum = 0
  let count = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x
      const lap =
        4 * gray[idx] -
        gray[idx - 1] -
        gray[idx + 1] -
        gray[idx - w] -
        gray[idx + w]
      lapSum += lap
      lapSqSum += lap * lap
      count++
    }
  }
  const lapMean = count ? lapSum / count : 0
  const lapVar = count ? lapSqSum / count - lapMean * lapMean : 0
  const sharpness = Math.max(0, lapVar)

  const checks: ImageQuality['checks'] = []
  checks.push({
    label: 'Image detected',
    ok: w > 0 && h > 0,
    detail: `${img.width}×${img.height}px`,
  })
  checks.push({
    label: 'Resolution acceptable',
    ok: img.width >= 320 && img.height >= 240,
    detail: img.width >= 320 && img.height >= 240 ? 'OK' : 'Too small',
  })
  checks.push({
    label: 'Sharpness acceptable',
    ok: sharpness >= 25,
    detail: sharpness >= 120 ? 'Sharp' : sharpness >= 25 ? 'Acceptable' : 'Blurry',
  })
  checks.push({
    label: 'Brightness acceptable',
    ok: brightness >= 40 && brightness <= 220,
    detail: brightness < 40 ? 'Too dark' : brightness > 220 ? 'Too bright' : 'OK',
  })
  checks.push({
    label: 'Contrast acceptable',
    ok: contrast >= 15,
    detail: contrast >= 15 ? 'OK' : 'Low contrast',
  })

  const okCount = checks.filter((c) => c.ok).length
  const status: ImageQuality['status'] = okCount >= 5 ? 'good' : okCount >= 3 ? 'acceptable' : 'poor'

  return { width: img.width, height: img.height, brightness, sharpness, contrast, status, checks }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = src
  })
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}
