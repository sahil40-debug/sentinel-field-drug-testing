'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ColorSwatch, SectionHeading } from '../ui-bits'
import { analyseImageQuality, fileToDataUrl, type ImageQuality } from '@/lib/image-quality'
import { captureLocation, formatLocation, isGeolocationAvailable, type GeoLocation } from '@/lib/geo'
import { toast } from 'sonner'
import {
  Camera, Upload, RefreshCw, ArrowRight, CheckCircle2, XCircle, Loader2,
  ArrowLeft, MapPin, LocateFixed, Palette,
} from 'lucide-react'

export function CaptureStep() {
  const {
    selectedDrug, capturedImage, setCapturedImage, setView, setAnalysing, setAnalysis,
    location, setLocation,
    manualReferenceHex, setManualReferenceHex,
    manualReactionHex, setManualReactionHex,
  } = useApp()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [camError, setCamError] = useState<string | null>(null)
  const [quality, setQuality] = useState<ImageQuality | null>(null)
  const [analysingQuality, setAnalysingQuality] = useState(false)
  const [locating, setLocating] = useState(false)
  // Whether the active camera is the front (user-facing) one — the preview is
  // mirrored in that case so it feels like a mirror, and the captured photo is
  // flipped to match what the officer saw on screen. Rear cameras are NOT mirrored.
  const [isFrontCamera, setIsFrontCamera] = useState(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
    setVideoReady(false)
    setIsFrontCamera(false)
  }, [])

  const startCamera = useCallback(async () => {
    setCamError(null)
    setVideoReady(false)
    try {
      // Prefer the rear (environment) camera — the natural orientation for field use.
      let stream: MediaStream | null = null
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        })
      } catch {
        // Fallback: any camera (desktops often only have a front webcam)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 960 } },
          audio: false,
        })
      }
      streamRef.current = stream
      // Detect front camera: the track label usually contains "front" or "user".
      const track = stream.getVideoTracks()[0]
      const label = (track?.label || '').toLowerCase()
      const front = label.includes('front') || label.includes('user') || label.includes('facetime')
      // facingMode setting from the track capabilities is the most reliable signal
      const caps = track?.getCapabilities?.() as MediaTrackCapabilities & { facingMode?: string[] } | undefined
      const facing = caps?.facingMode
      const isFront = facing ? facing.includes('user') : front
      setIsFrontCamera(isFront)
      setCameraOn(true)
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }
    } catch (e) {
      setCamError(e instanceof Error ? e.message : 'Could not access camera')
      setCameraOn(false)
    }
  }, [])

  useEffect(() => () => stopCamera(), [stopCamera])

  const capture = useCallback(() => {
    const video = videoRef.current
    if (!video || !videoReady) {
      toast.error('Camera is still warming up. Please wait a second and try again.')
      return
    }
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) {
      toast.error('Video frame not ready yet. Please try again.')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Mirror the captured photo to match the mirrored preview (front camera only),
    // so what the officer saw on screen is exactly what gets stored.
    if (isFrontCamera) {
      ctx.translate(w, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, w, h)
    const url = canvas.toDataURL('image/jpeg', 0.9)
    if (!url || url === 'data:,') {
      toast.error('Capture failed. Please try again.')
      return
    }
    setCapturedImage(url)
    stopCamera()
  }, [setCapturedImage, stopCamera, videoReady, isFrontCamera])

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

  const grabLocation = async () => {
    setLocating(true)
    try {
      const loc = await captureLocation()
      setLocation(loc)
      toast.success('Location captured.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not capture location.')
    } finally {
      setLocating(false)
    }
  }

  const runAnalysis = async () => {
    if (!capturedImage || !selectedDrug) return
    setAnalysing(true)
    try {
      const res = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: capturedImage,
          drugProfileId: selectedDrug.id,
          manualReferenceHex: manualReferenceHex || null,
          manualReactionHex: manualReactionHex || null,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Analysis failed')
      setAnalysis({ result: d.result, imageHash: d.imageHash, drug: d.drug })
      setView('new-test')
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
        <Button variant="outline" onClick={() => setView('new-test')} className="gap-1.5 btn-pill">
          <ArrowLeft className="h-4 w-4" /> Back to selection
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <SectionHeading
          eyebrow="Step 2 of 3"
          title="Capture & locate"
          sub="Photograph or upload the completed field test, then stamp the GPS location."
        />
        <Button variant="ghost" size="sm" onClick={() => setView('new-test')} className="gap-1 btn-pill">
          <ArrowLeft className="h-4 w-4" /> Change substance
        </Button>
      </div>

      {/* Selected test strip */}
      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm px-4 py-3">
        <span className="h-9 w-9 rounded-xl border border-black/5 shrink-0" style={{ backgroundColor: selectedDrug.expectedHex }} />
        <div className="min-w-0">
          <div className="font-medium truncate">{selectedDrug.target}</div>
          <div className="text-xs text-muted-foreground truncate">
            {selectedDrug.testMethod} · expects {selectedDrug.expectedColor}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Capture / preview */}
        <div className="lg:col-span-2 space-y-4">
          {!capturedImage ? (
            <Card className="card-soft">
              <CardContent className="p-4 space-y-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border bg-black grid place-items-center">
                  <video
                    ref={videoRef}
                    className={`h-full w-full object-contain ${isFrontCamera ? 'scale-x-[-1]' : ''}`}
                    playsInline
                    muted
                    autoPlay
                    onLoadedData={() => setVideoReady(true)}
                    onCanPlay={() => setVideoReady(true)}
                  />
                  {!cameraOn && (
                    <div className="absolute inset-0 grid place-items-center text-center text-white/70 p-6 bg-black">
                      <div>
                        <Camera className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Camera is off.</p>
                        <p className="text-xs mt-1 opacity-70">Include the reference colour card and the reaction area in the frame.</p>
                      </div>
                    </div>
                  )}
                  {cameraOn && !videoReady && (
                    <div className="absolute inset-0 grid place-items-center bg-black/60 text-white/80 text-sm">
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Starting camera…
                      </span>
                    </div>
                  )}
                </div>

                {camError && (
                  <p className="text-xs text-rose-600">Camera error: {camError}. You can still upload an image.</p>
                )}

                <div className="flex flex-wrap gap-2">
                  {!cameraOn ? (
                    <Button onClick={startCamera} variant="default" className="btn-pill gap-1.5 h-10">
                      <Camera className="h-4 w-4" /> Start camera
                    </Button>
                  ) : (
                    <Button onClick={capture} disabled={!videoReady} className="btn-pill gap-1.5 h-10">
                      {videoReady ? <Camera className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                      Capture image
                    </Button>
                  )}
                  <Button onClick={() => document.getElementById('upload-input')?.click()} variant="outline" className="btn-pill gap-1.5 h-10">
                    <Upload className="h-4 w-4" /> Upload image
                  </Button>
                  <input id="upload-input" type="file" accept="image/*" className="hidden" onChange={onUpload} />
                  {cameraOn && (
                    <Button onClick={stopCamera} variant="ghost" className="btn-pill h-10">Stop camera</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="card-soft">
              <CardContent className="p-4 space-y-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border bg-black grid place-items-center">
                  <img src={capturedImage} alt="Captured field test" className="h-full w-full object-contain" />
                </div>
                <ImageQualityPanel quality={quality} loading={analysingQuality} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={reset} className="btn-pill gap-1.5 h-10">
                    <RefreshCw className="h-4 w-4" /> Retake
                  </Button>
                  <Button
                    onClick={runAnalysis}
                    disabled={quality?.status === 'poor' || analysingQuality}
                    className="btn-pill gap-1.5 h-10 ml-auto"
                  >
                    <ArrowRight className="h-4 w-4" /> Analyze test
                  </Button>
                  <Button variant="ghost" onClick={() => document.getElementById('upload-input2')?.click()} className="btn-pill gap-1.5 h-10">
                    <Upload className="h-4 w-4" /> Replace
                  </Button>
                  <input id="upload-input2" type="file" accept="image/*" className="hidden" onChange={onUpload} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* GPS panel */}
        <div className="space-y-4">
          <Card className="card-soft">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="display-eyebrow m-0">GPS location</span>
              </div>
              {location ? (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-emerald-50/80 border border-emerald-200/60 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-emerald-800">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-medium">Location captured</span>
                    </div>
                    <p className="text-xs text-emerald-700/90 mt-1.5 leading-relaxed">{formatLocation(location)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={grabLocation} disabled={locating} className="btn-pill gap-1.5 w-full">
                    {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                    Re-capture
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {isGeolocationAvailable()
                      ? 'Stamp this test with the current GPS coordinates. Optional but recommended for chain-of-custody.'
                      : 'Geolocation is not available in this browser. You can still proceed without location.'}
                  </p>
                  {isGeolocationAvailable() && (
                    <Button onClick={grabLocation} disabled={locating} className="btn-pill gap-1.5 w-full">
                      {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                      Capture location
                    </Button>
                  )}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
                Coordinates are stored on the record and protected by the tamper-evident hash. Your browser will ask permission.
              </p>
            </CardContent>
          </Card>

          {/* Manual colour override — used when the photo didn't capture colours clearly */}
          <Card className="card-soft">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                <span className="display-eyebrow m-0">Manual colour override</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If the photo didn&apos;t capture the colours clearly (bad light, cheap camera, glare),
                pick the colours you see on the ground so the analysis can use them.
              </p>

              <ColourPickerRow
                label="Reference card colour"
                hint="The colour of the printed reference card in-frame"
                value={manualReferenceHex}
                onChange={setManualReferenceHex}
                suggested={selectedDrug.expectedHex}
              />
              <ColourPickerRow
                label="Reaction colour"
                hint="The colour the reaction area changed to"
                value={manualReactionHex}
                onChange={setManualReactionHex}
                suggested={selectedDrug.expectedHex}
              />

              {(manualReferenceHex || manualReactionHex) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="btn-pill gap-1.5 w-full text-xs"
                  onClick={() => { setManualReferenceHex(null); setManualReactionHex(null) }}
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Clear overrides
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="card-soft bg-accent/20">
            <CardContent className="p-5 space-y-2">
              <div className="display-eyebrow">Tip</div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For best results, capture under even lighting, include the printed reference colour card, and fill the frame with the reaction area.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function ColourPickerRow({
  label,
  hint,
  value,
  onChange,
  suggested,
}: {
  label: string
  hint: string
  value: string | null
  onChange: (h: string | null) => void
  suggested: string
}) {
  const useSuggested = () => onChange(suggested)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
        <label className="relative inline-flex items-center gap-2 cursor-pointer shrink-0">
          {value && (
            <span className="text-xs font-mono text-muted-foreground uppercase">{value}</span>
          )}
          <span
            className="h-9 w-9 rounded-xl border border-black/10 shadow-[inset_0_0_0_1px_oklch(1_0_0/0.4)] grid place-items-center overflow-hidden relative"
            style={{ backgroundColor: value ?? 'transparent' }}
          >
            {!value && <Palette className="h-4 w-4 text-muted-foreground/50" />}
            <input
              type="color"
              value={value ?? '#888888'}
              onChange={(e) => onChange(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label={label}
            />
          </span>
        </label>
      </div>
      {!value && (
        <button onClick={useSuggested} className="text-xs text-primary hover:underline">
          Use expected colour ({suggested})
        </button>
      )}
    </div>
  )
}

function ImageQualityPanel({ quality, loading }: { quality: ImageQuality | null; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 space-y-2">
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
            ● {quality.status === 'good' ? 'Good' : quality.status === 'acceptable' ? 'Acceptable' : 'Poor'}
          </span>
        ) : null}
      </div>
      <ul className="grid sm:grid-cols-2 gap-1.5">
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
        <p className="text-xs text-rose-700">Image is too low quality for reliable analysis. Please retake.</p>
      )}
    </div>
  )
}
