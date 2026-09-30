/**
 * Browser geolocation helper — returns { latitude, longitude, label? }.
 *
 * `label` is a best-effort reverse-geocode using the free OpenStreetMap
 * Nominatim endpoint. If it fails we still return coordinates with no label.
 *
 * This runs CLIENT-SIDE only (uses navigator.geolocation + fetch).
 */
import type { GeoLocation } from './store'

export function isGeolocationAvailable(): boolean {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator
}

export function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationAvailable()) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) reject(new Error('Location permission denied.'))
        else if (err.code === err.POSITION_UNAVAILABLE) reject(new Error('Location unavailable.'))
        else if (err.code === err.TIMEOUT) reject(new Error('Location request timed out.'))
        else reject(new Error('Could not get location.'))
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  })
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14`,
      { headers: { Accept: 'application/json' } },
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.display_name ?? null
  } catch {
    return null
  }
}

export async function captureLocation(): Promise<GeoLocation | null> {
  const { latitude, longitude } = await getCurrentPosition()
  const label = await reverseGeocode(latitude, longitude)
  return { latitude, longitude, label: label ?? undefined }
}

export function formatLocation(loc: { latitude: number; longitude: number; label?: string } | null): string {
  if (!loc) return 'Location not captured'
  const coords = `${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}`
  if (loc.label) {
    // Trim the long OSM display_name to first two comma segments
    const short = loc.label.split(',').slice(0, 2).join(',').trim()
    return `${short} (${coords})`
  }
  return coords
}

export function mapsLink(loc: { latitude: number; longitude: number } | null): string | null {
  if (!loc) return null
  return `https://www.openstreetmap.org/?mlat=${loc.latitude}&mlon=${loc.longitude}#map=16/${loc.latitude}/${loc.longitude}`
}
