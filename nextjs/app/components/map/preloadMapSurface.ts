'use client'

let mapSurfacePromise: Promise<unknown> | null = null

export function preloadMapSurface() {
  mapSurfacePromise ??= import('./MapCanvasLayer')
  return mapSurfacePromise
}
