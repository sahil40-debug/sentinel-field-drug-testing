'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ColorSwatch, SectionHeading } from '../ui-bits'
import { analyseImageQuality, fileToDataUrl, type ImageQuality } from '@/lib/image-quality'
import { captureLocation, formatLocation, isGeolocationAvailable } from '@/lib/geo'
import { toast } from 'sonner'
import {
  Camera, Upload, RefreshCw, ArrowRight, CheckCircle2, XCircle, Loader2,
  ArrowLeft, MapPin, LocateFixed, Palette, Crosshair, ChevronDown,
  Maximize2, SwitchCamera, X,
} from 'lucide-react'

type Facing = 'environment' | 'user'

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
  const [showColourOverride, setShowColourOverride] = useState(false)
  const [isFrontCamera, setIsFrontCamera] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; id: number } | null>(null)
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingFacingRef = useRef<Facing>('environment')

  // Attach the current stream to the <video> element and play it.
  // This is the SINGLE place that touches video.srcObject — avoids the
  // "two video elements, one ref" bug where the expanded view was blank.
  const attachStream = useCallback(async () => {
    const video = videoRef.current
    const stream = streamRef.current
    if (!video || !stream) return
    video.srcObject = stream
    try {
      await video.play()
      setVideoReady(true)
    } catch {
      // autoplay can throw if play() is interrupted — retry once
      try { await video.play(); setVideoReady(true) } catch { /* ignore */ }
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraOn(false)
    setVideoReady(false)
    setIsFrontCamera(false)
    setFocusPoint(null)
    setSwitching(false)
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current)
  }, [])

  // Acquire a stream for the given facing mode, store it in streamRef, and
  // attach to the video. Used by both startCamera and switchCamera.
  const acquireStream = useCallback(async (facing: Facing) => {
    let stream: MediaStream | null = null
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
    } catch {
      // Fallback: no facingMode constraint (e.g. desktop with one webcam)
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      })
    }
    // Stop any previous stream first to free the camera.
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }
    streamRef.current = stream
    // Detect facing from the track capabilities.
    const track = stream.getVideoTracks()[0]
    const caps = track?.getCapabilities?.() as MediaTrackCapabilities & { facingMode?: string[] } | undefined
    const facingCap = caps?.facingMode
    const label = (track?.label || '').toLowerCase()
    const looksFront = label.includes('front') || label.includes('user') || label.includes('facetime')
    const isFront = facingCap ? facingCap.includes('user') : (facing === 'user' || looksFront)
    setIsFrontCamera(isFront)
    return stream
  }, [])

  const startCamera = useCallback(async (facing: Facing = 'environment') => {
    setCamError(null)
    setVideoReady(false)
    setCameraOn(true)
    pendingFacingRef.current = facing
    try {
      await acquireStream(facing)
      // Wait one frame so the (possibly just-mounted) <video> ref is set.
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      await attachStream()
    } catch (e) {
      setCamError(e instanceof Error ? e.message : 'Could not access camera')
      setCameraOn(false)
    }
  }, [acquireStream, attachStream])

  // Switch between front and back cameras without closing the UI.
  const switchCamera = useCallback(async () => {
    if (switching) return
    setSwitching(true)
    setVideoReady(false)
    setFocusPoint(null)
    const nextFacing: Facing = isFrontCamera ? 'environment' : 'user'
    pendingFacingRef.current = nextFacing
    try {
      await acquireStream(nextFacing)
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      await attachStream()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not switch camera')
      // Try to fall back to the previous facing so the user isn't left with a dead camera.
      try { await acquireStream(isFrontCamera ? 'user' : 'environment'); await attachStream() } catch { /* ignore */ }
    } finally {
      setSwitching(false)
    }
  }, [switching, isFrontCamera, acquireStream, attachStream])

  // When expanded toggles, the <video> element remounts in a different parent.
  // Re-attach the stream so the preview keeps showing.
  useEffect(() => {
    if (cameraOn && streamRef.current) {
      attachStream()
    }
  }, [expanded, attachStream, cameraOn])

  useEffect(() => () => stopCamera(), [stopCamera])

  const handleFocusTap = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!cameraOn || !videoReady) return
    const video = videoRef.current
    if (!video) return
    const rect = video.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    const id = Date.now()
    setFocusPoint({ x, y, id })
    if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current)
    focusTimeoutRef.current = setTimeout(() => setFocusPoint(null), 1100)
  }, [cameraOn, videoReady])

  // Capture the FULL frame as-is from the camera sensor (no cropping), so the
  // stored photo is the complete scene the camera saw — matches the preview
  // aspect ratio the user framed, regardless of object-cover display cropping.
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
    setExpanded(false)
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

  // The <video> element — rendered in ONE place (normal OR expanded, not both)
  // so the ref always points to the visible element and the stream attaches.
  const videoEl = (
    <video
      ref={videoRef}
      className={`h-full w-full object-cover ${isFrontCamera ? 'scale-x-[-1]' : ''}`}
      playsInline
      muted
      autoPlay
      onLoadedData={() => setVideoReady(true)}
      onCanPlay={() => setVideoReady(true)}
    />
  )

  const focusRing = focusPoint && (
    <div
      key={focusPoint.id}
      className="absolute pointer-events-none"
      style={{
        left: `${focusPoint.x * 100}%`,
        top: `${focusPoint.y * 100}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <span className="block h-12 w-12 rounded-full border-2 border-white animate-ping-slow" />
    </div>
  )

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <SectionHeading
          eyebrow="Step 2 of 3"
          title="Capture & locate"
          sub="Photograph or upload the completed field test, then stamp the GPS location."
        />
        <Button variant="ghost" size="sm" onClick={() => setView('new-test')} className="gap-1 btn-pill shrink-0">
          <ArrowLeft className="h-4 w-4" /> Change substance
        </Button>
      </div>

      {/* Selected test strip */}
      <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/80 backdrop-blur-sm px-4 py-3">
        <span className="h-9 w-9 rounded-xl border border-black/5 shrink-0" style={{ backgroundColor: selectedDrug.expectedHex }} />
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{selectedDrug.target}</div>
          <div className="text-xs text-muted-foreground truncate">
            {selectedDrug.testMethod} · expects {selectedDrug.expectedColor}
          </div>
        </div>
      </div>

      {/* Capture / preview — full width on mobile, 2/3 on desktop */}
      <div className="grid lg:grid-cols-3 gap-5 sm:gap-6">
        <div className="lg:col-span-2 space-y-4">
          {!capturedImage ? (
            <Card className="card-soft">
              <CardContent className="p-3 sm:p-4 space-y-4">
                {!expanded ? (
                  /* Normal (inline) camera preview */
                  <div
                    className="relative aspect-video w-full overflow-hidden rounded-2xl border bg-black grid place-items-center cursor-crosshair"
                    onClick={handleFocusTap}
                    onTouchStart={handleFocusTap}
                  >
                    {videoEl}
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
                          <Loader2 className="h-4 w-4 animate-spin" /> {switching ? 'Switching camera…' : 'Starting camera…'}
                        </span>
                      </div>
                    )}
                    {cameraOn && videoReady && (
                      <>
                        <div className="absolute top-2 left-2 pill bg-black/60 text-white/90 backdrop-blur-sm text-[11px]">
                          <Crosshair className="h-3 w-3" /> Tap to focus
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpanded(true) }}
                            className="grid place-items-center h-9 w-9 rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 transition"
                            aria-label="Expand camera"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); switchCamera() }}
                            disabled={switching}
                            className="grid place-items-center h-9 w-9 rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/80 transition disabled:opacity-50"
                            aria-label="Switch camera"
                          >
                            {switching ? <Loader2 className="h-4 w-4 animate-spin" /> : <SwitchCamera className="h-4 w-4" />}
                          </button>
                        </div>
                        {focusRing}
                      </>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card className="card-soft">
              <CardContent className="p-3 sm:p-4 space-y-4">
                <div className="relative aspect-video w-full overflow-hidden rounded-2xl border bg-black grid place-items-center">
                  <img src={capturedImage} alt="Captured field test" className="h-full w-full object-contain" />
                </div>
                <ImageQualityPanel quality={quality} loading={analysingQuality} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={reset} className="btn-pill gap-1.5 h-11 flex-1 sm:flex-none">
                    <RefreshCw className="h-4 w-4" /> Retake
                  </Button>
                  <Button
                    onClick={runAnalysis}
                    disabled={quality?.status === 'poor' || analysingQuality}
                    className="btn-pill gap-1.5 h-11 flex-1 sm:flex-none order-last sm:order-none sm:ml-auto"
                  >
                    <ArrowRight className="h-4 w-4" /> Analyze test
                  </Button>
                  <Button variant="ghost" onClick={() => document.getElementById('upload-input2')?.click()} className="btn-pill gap-1.5 h-11">
                    <Upload className="h-4 w-4" /> Replace
                  </Button>
                  <input id="upload-input2" type="file" accept="image/*" className="hidden" onChange={onUpload} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side panel: GPS + manual colour + tip */}
        <div className="space-y-4">
          <Card className="card-soft">
            <CardContent className="p-4 sm:p-5 space-y-3">
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
                    <p className="text-xs text-emerald-700/90 mt-1.5 leading-relaxed break-words">{formatLocation(location)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={grabLocation} disabled={locating} className="btn-pill gap-1.5 w-full h-10">
                    {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5" />}
                    Re-capture
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {isGeolocationAvailable()
                      ? 'Stamp this test with the current GPS coordinates. Recommended for chain-of-custody.'
                      : 'Geolocation is not available in this browser. You can still proceed without location.'}
                  </p>
                  {isGeolocationAvailable() && (
                    <Button onClick={grabLocation} disabled={locating} className="btn-pill gap-1.5 w-full h-10">
                      {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
                      Capture location
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-soft">
            <CardContent className="p-4 sm:p-5 space-y-3">
              <button
                onClick={() => setShowColourOverride((s) => !s)}
                className="w-full flex items-center gap-2 text-left"
                aria-expanded={showColourOverride}
              >
                <Palette className="h-4 w-4 text-primary" />
                <span className="display-eyebrow m-0 flex-1">Manual colour override</span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showColourOverride ? 'rotate-180' : ''}`} />
              </button>
              {(manualReferenceHex || manualReactionHex) && (
                <div className="pill bg-primary/10 text-primary border border-primary/20 text-[11px]">
                  Override active
                </div>
              )}
              {!showColourOverride && !(manualReferenceHex || manualReactionHex) && (
                <p className="text-xs text-muted-foreground">
                  Photo too dark or colours washed out? Tap here to pick the colours you see manually.
                </p>
              )}
              {showColourOverride && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    If the photo didn&apos;t capture the colours clearly (bad light, cheap camera, glare),
                    pick the colours you see on the ground so the analysis uses them.
                  </p>
                  <ColourPickerRow
                    label="Reference card colour"
                    hint="The colour of the printed reference card"
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
                      className="btn-pill gap-1.5 w-full text-xs h-9"
                      onClick={() => { setManualReferenceHex(null); setManualReactionHex(null) }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Clear overrides
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="card-soft bg-accent/20">
            <CardContent className="p-4 sm:p-5 space-y-2">
              <div className="display-eyebrow">Tip</div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                For best results, capture under even lighting, include the printed reference colour card, and fill the frame with the reaction area.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inline action buttons (below the preview) — always reachable, not hidden by nav */}
      {!capturedImage && (
        <div className="space-y-3">
          {camError && (
            <p className="text-xs text-rose-600">Camera error: {camError}. You can still upload an image.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {!cameraOn ? (
              <Button onClick={() => startCamera('environment')} variant="default" className="btn-pill gap-1.5 h-11 flex-1 sm:flex-none">
                <Camera className="h-4 w-4" /> Start camera
              </Button>
            ) : (
              <Button onClick={capture} disabled={!videoReady} className="btn-pill gap-1.5 h-11 flex-1 sm:flex-none">
                {videoReady ? <Camera className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                Capture image
              </Button>
            )}
            <Button onClick={() => document.getElementById('upload-input')?.click()} variant="outline" className="btn-pill gap-1.5 h-11 flex-1 sm:flex-none">
              <Upload className="h-4 w-4" /> Upload
            </Button>
            <input id="upload-input" type="file" accept="image/*" className="hidden" onChange={onUpload} />
            {cameraOn && (
              <Button onClick={stopCamera} variant="ghost" className="btn-pill h-11">Stop</Button>
            )}
          </div>
        </div>
      )}

      {/* Expanded / fullscreen camera overlay — the <video> moves here */}
      {expanded && cameraOn && (
        <div className="fixed inset-0 z-[90] bg-black animate-in fade-in duration-200 flex flex-col">
          <div className="flex items-center justify-between px-4 pb-2" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
            <div className="text-white/80 text-sm font-medium flex items-center gap-1.5">
              <Camera className="h-4 w-4" /> {isFrontCamera ? 'Front camera' : 'Rear camera'}
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="grid place-items-center h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              aria-label="Exit fullscreen"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div
            className="flex-1 relative overflow-hidden cursor-crosshair"
            onClick={handleFocusTap}
            onTouchStart={handleFocusTap}
          >
            {videoEl}
            {!videoReady && (
              <div className="absolute inset-0 grid place-items-center bg-black/60 text-white/80 text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> {switching ? 'Switching…' : 'Loading…'}
                </span>
              </div>
            )}
            {videoReady && (
              <>
                <div className="absolute top-3 left-3 pill bg-black/60 text-white/90 backdrop-blur-sm text-[11px]">
                  <Crosshair className="h-3 w-3" /> Tap to focus
                </div>
                {focusRing}
              </>
            )}
          </div>
          <div className="flex items-center justify-center gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
            <button
              onClick={switchCamera}
              disabled={switching}
              className="grid place-items-center h-14 w-14 rounded-full bg-white/10 text-white hover:bg-white/20 transition disabled:opacity-50"
              aria-label="Switch camera"
            >
              {switching ? <Loader2 className="h-6 w-6 animate-spin" /> : <SwitchCamera className="h-6 w-6" />}
            </button>
            <button
              onClick={capture}
              disabled={!videoReady}
              className="grid place-items-center h-20 w-20 rounded-full bg-white text-primary shadow-lg hover:scale-105 transition disabled:opacity-50"
              aria-label="Capture"
            >
              {videoReady ? <Camera className="h-9 w-9" /> : <Loader2 className="h-7 w-7 animate-spin" />}
            </button>
            <button
              onClick={() => { stopCamera(); setExpanded(false) }}
              className="grid place-items-center h-14 w-14 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              aria-label="Stop camera"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ImageQualityPanel({ quality, loading }: { quality: ImageQuality | null; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/40 p-3 sm:p-4 space-y-2">
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
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
            )}
            <span className={c.ok ? '' : 'text-rose-700'}>{c.label}</span>
            <span className="text-muted-foreground ml-auto truncate">{c.detail}</span>
          </li>
        ))}
      </ul>
      {quality?.status === 'poor' && (
        <p className="text-xs text-rose-700">Image is too low quality for reliable analysis. Please retake.</p>
      )}
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
            className="h-9 w-9 rounded-xl border border-black/10 grid place-items-center overflow-hidden relative"
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
