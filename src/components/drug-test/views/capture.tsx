'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ColorSwatch } from '../ui-bits'
import { analyseImageQuality, fileToDataUrl, type ImageQuality } from '@/lib/image-quality'
import { Camera, Upload, RefreshCw, ArrowRight, CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react'

export function CaptureStep() {
  const { selectedDrug, capturedImage, setCapturedImage, setView, setAnalysing, setAnalysis } = useApp()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [camError, setCamError] = useState<string | null>(null)
  const [quality, setQuality] = useState<ImageQuality | null>(null)
  const [analysingQuality, setAnalysingQuality] = useState(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCamError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)
    } catch (e) {
      setCamError(e instanceof Error ? e.message : 'Could not access camera')
    }
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  const capture = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    const w = video.videoWidth || 1024
    const h = video.videoHeight || 768
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, w, h)
    const url = canvas.toDataURL('image/jpeg', 0.9)
    setCapturedImage(url)
    stopCamera()
  }, [setCapturedImage, stopCamera])

  // analyse quality whenever a new image arrives
  useEffect(() => {
    if (!capturedImage) {
      setQuality(null)
      return
    }
    setAnalysingQuality(true)
    analyseImageQuality(capturedImage)
      .then(setQuality)
      .finally(() => setAnalysingQuality(false))
  }, [capturedImage])

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = await fileToDataUrl(file)
    setCapturedImage(url)
  }

  const reset = () => {
    setCapturedImage(null)
    setAnalysis(null)
    setQuality(null)
  }

  const runAnalysis = async () => {
    if (!capturedImage || !selectedDrug) return
    setAnalysing(true)
    try {
      const res = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: capturedImage, drugProfileId: selectedDrug.id }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Analysis failed')
      setAnalysis({ result: d.result, imageHash: d.imageHash, drug: d.drug })
      setView('new-test') // result sub-view renders within new-test
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalysing(false)
    }
  }

  if (!selectedDrug) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">No substance selected.</p>
        <Button variant="outline" onClick={() => setView('new-test')} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Back to selection
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Capture / Upload</h1>
          <p className="text-sm text-muted-foreground">Step 2 — photograph or upload the completed field test.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setView('new-test')} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Change substance
        </Button>
      </div>

      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
        <ColorSwatch hex={selectedDrug.expectedHex} />
        <div className="min-w-0">
          <div className="font-medium truncate">{selectedDrug.target}</div>
          <div className="text-xs text-muted-foreground truncate">
            {selectedDrug.testMethod} · expects {selectedDrug.expectedColor}
          </div>
        </div>
      </div>

      {!capturedImage ? (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-black grid place-items-center">
              {cameraOn ? (
                <video ref={videoRef} className="h-full w-full object-contain" playsInline muted />
              ) : (
                <div className="text-center text-muted-foreground p-6">
                  <Camera className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Camera is off.</p>
                  <p className="text-xs mt-1">Include the reference colour card and the reaction area in the frame.</p>
                </div>
              )}
            </div>

            {camError && (
              <p className="text-xs text-rose-600">Camera error: {camError}. You can still upload an image.</p>
            )}

            <div className="flex flex-wrap gap-2">
              {!cameraOn ? (
                <Button onClick={startCamera} variant="default" className="gap-1.5">
                  <Camera className="h-4 w-4" /> Start camera
                </Button>
              ) : (
                <Button onClick={capture} className="gap-1.5">
                  <Camera className="h-4 w-4" /> Capture image
                </Button>
              )}
              <Button onClick={() => document.getElementById('upload-input')?.click()} variant="outline" className="gap-1.5">
                <Upload className="h-4 w-4" /> Upload image
              </Button>
              <input id="upload-input" type="file" accept="image/*" className="hidden" onChange={onUpload} />
              {cameraOn && (
                <Button onClick={stopCamera} variant="ghost">
                  Stop camera
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-black grid place-items-center">
              <img src={capturedImage} alt="Captured field test" className="h-full w-full object-contain" />
            </div>

            <ImageQualityPanel quality={quality} loading={analysingQuality} />

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={reset} className="gap-1.5">
                <RefreshCw className="h-4 w-4" /> Retake
              </Button>
              <Button
                onClick={runAnalysis}
                disabled={quality?.status === 'poor' || analysingQuality}
                className="gap-1.5 ml-auto"
              >
                <ArrowRight className="h-4 w-4" /> Analyze test
              </Button>
              <Button variant="ghost" onClick={() => document.getElementById('upload-input2')?.click()} className="gap-1.5">
                <Upload className="h-4 w-4" /> Replace
              </Button>
              <input id="upload-input2" type="file" accept="image/*" className="hidden" onChange={onUpload} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ImageQualityPanel({ quality, loading }: { quality: ImageQuality | null; loading: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Image quality</span>
        {loading ? (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> analysing…
          </span>
        ) : quality ? (
          <span
            className={`text-xs font-semibold ${
              quality.status === 'good'
                ? 'text-emerald-600'
                : quality.status === 'acceptable'
                  ? 'text-amber-600'
                  : 'text-rose-600'
            }`}
          >
            {quality.status === 'good' ? '● Good' : quality.status === 'acceptable' ? '● Acceptable' : '● Poor'}
          </span>
        ) : null}
      </div>
      <ul className="grid sm:grid-cols-2 gap-1">
        {quality?.checks.map((c) => (
          <li key={c.label} className="flex items-center gap-2 text-xs">
            {c.ok ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-rose-600" />
            )}
            <span className={c.ok ? '' : 'text-rose-700'}>{c.label}</span>
            <span className="text-muted-foreground ml-auto">{c.detail}</span>
          </li>
        ))}
      </ul>
      {quality?.status === 'poor' && (
        <p className="text-xs text-rose-700">
          Image is too low quality for reliable analysis. Please retake.
        </p>
      )}
    </div>
  )
}
