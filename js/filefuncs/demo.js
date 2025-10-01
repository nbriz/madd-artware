/* global canvas */
/*********************************************************************
 *  Demo‑Mode – low‑fps recording/playback while the mouse is idle.
 *********************************************************************/
window.demoMode = {
  enabled: false,
  /* ==============================================================
   *  Configuration
   * ============================================================== */
  fpsTarget: 10, // playback/record speed (6‑12 is fine)
  idleTime: 10 * 1000, // inactivity time before triggering playback
  maxFrames: null, // null means “auto‑detect”
  /* ==============================================================
   *  Runtime state
   * ============================================================== */
  frames: [], // Circular buffer of ImageBitmap objects
  lastFrame: null, // The most recent snapshot (ImageBitmap)
  isIdle: false,
  idleTimer: null,
  animationHandle: null, // requestAnimationFrame id (playback)
  recordHandle: null, // requestAnimationFrame id (recording)
  mouseMoved: false, // for "gated" mouse move recrod/capture
  /* ==============================================================
   *  Helpers
   * ============================================================== */
  clearIdleTimer: function () {
    if (window.demoMode.idleTimer !== null) {
      clearTimeout(window.demoMode.idleTimer)
      window.demoMode.idleTimer = null
    }
  },
  startIdleTimer: function () {
    window.demoMode.clearIdleTimer()
    window.demoMode.idleTimer = setTimeout(() => {
      window.demoMode.isIdle = true
      window.demoMode.onMouseIdle()
    }, window.demoMode.idleTime)
  },
  captureCurrentCanvas: async function () {
    // Modern browsers support `transferToImageBitmap` on an OffscreenCanvas.
    // If not, fall back to creating an Image and waiting for onload.
    if (canvas.element.transferControlToOffscreen) {
      // Offscreen path – cheap, no data‑URL round‑trip.
      const off = new window.OffscreenCanvas(canvas.element.width, canvas.element.height)
      const ctx = off.getContext('2d')
      ctx.drawImage(canvas.element, 0, 0)
      return await off.transferToImageBitmap()
    }
    // Fallback – dataURL → Image → ImageBitmap (still okay for most browsers)
    const img = new window.Image()
    img.src = canvas.element.toDataURL('image/png')
    await new window.Promise(r => (img.onload = r))
    // Some browsers allow `createImageBitmap(img)` directly.
    if (window.createImageBitmap) {
      return await window.createImageBitmap(img)
    }
    // If even that fails, just return the Image (drawImage works with it).
    return img
  },
  handleMouseMove: async function () {
    // If we were idle, stop playback and restore the most recent frame.
    if (window.demoMode.isIdle) {
      window.demoMode.isIdle = false
      if (window.demoMode.lastFrame) {
        canvas.ctx.clearRect(0, 0, canvas.element.width, canvas.element.height)
        canvas.ctx.drawImage(window.demoMode.lastFrame, 0, 0)
      }
      window.demoMode.onMouseActive() // stop playback, start recording
    }
    // Reset the idle timer on every movement.
    window.demoMode.startIdleTimer()
    window.demoMode.mouseMoved = true
  },
  onMouseIdle: async function () {
    // capture last frame (so we can reset later)
    if (!window.demoMode.lastFrame) {
      window.demoMode.lastFrame = await window.demoMode.captureCurrentCanvas()
    }

    // if there's nothing to aniamte yet, forget it
    if (!window.demoMode.frames.length) return

    const frameInterval = 1000 / window.demoMode.fpsTarget
    let lastTick = window.performance.now()
    window.demoMode.playbackIndex = -1

    const step = now => {
      if (!window.demoMode.isIdle) return
      if (now - lastTick >= frameInterval) {
        window.demoMode.playbackIndex = (window.demoMode.playbackIndex + 1) % window.demoMode.frames.length
        const frame = window.demoMode.frames[window.demoMode.playbackIndex]
        canvas.ctx.clearRect(0, 0, canvas.element.width, canvas.element.height)
        canvas.ctx.drawImage(frame, 0, 0)
        lastTick = now
      }
      window.demoMode.animationHandle = window.requestAnimationFrame(step)
    }
    window.demoMode.animationHandle = window.requestAnimationFrame(step)
  },
  onMouseActive: async function () {
    window.demoMode.mouseMoved = false
    // 1. stop playback
    if (window.demoMode.animationHandle !== null) {
      window.cancelAnimationFrame(window.demoMode.animationHandle)
      window.demoMode.animationHandle = null
    }

    // 2. capture current canvas, the "lastFrame"
    window.demoMode.lastFrame = await window.demoMode.captureCurrentCanvas()

    // 3. start recording
    const recordInterval = 1000 / window.demoMode.fpsTarget
    let lastRecord = window.performance.now()

    const recordStep = async now => {
      if (window.demoMode.isIdle) return
      if (canvas.mouseDown && window.demoMode.mouseMoved && now - lastRecord >= recordInterval) {
        const snap = await window.demoMode.captureCurrentCanvas()
        // Push the new frame, enforce the max‑size limit.
        window.demoMode.frames.push(snap)
        window.demoMode.lastFrame = snap
        if (window.demoMode.maxFrames &&
            window.demoMode.frames.length > window.demoMode.maxFrames) {
          const old = window.demoMode.frames.shift()
          if (old && typeof old.close === 'function') old.close()
        }
        // Reset the flag – we have consumed this mouse movement.
        window.demoMode.mouseMoved = false
        lastRecord = now // reset the FPS gate
      }
      window.demoMode.recordHandle = window.requestAnimationFrame(recordStep)
    }

    // Cancel any previous recording loop first.
    if (window.demoMode.recordHandle) {
      window.cancelAnimationFrame(window.demoMode.recordHandle)
    }
    window.demoMode.recordHandle = window.requestAnimationFrame(recordStep)
  },

  /* ==============================================================
   *  Auto‑detect a safe `maxFrames` value.
   *  This runs once (the first time `start()` is called) and tries to
   *  allocate increasingly larger buffers until an allocation fails.
   *  The result is cached in `window.demoMode.maxFrames`.
   * ============================================================== */
  detectMaxFrames: async function () {
    // If the user already forced a limit, honour it.
    if (window.demoMode.maxFrames !== null) return window.demoMode.maxFrames
    // Rough estimate: each ImageBitmap ≈ width × height × 4 bytes.
    const BYTES_PER_FRAME = canvas.width * canvas.height * 4
    // Try to allocate frames until we hit a memory error or a sane ceiling.
    const HARD_CAP = 2000 // never try more than window.demoMode – safety net
    let trial = 0
    const tempFrames = []
    try {
      while (trial < HARD_CAP) {
        // Allocate a dummy ImageBitmap (empty OffscreenCanvas) – cheap.
        const off = new window.OffscreenCanvas(canvas.width, canvas.height)
        const bmp = await off.transferToImageBitmap()
        tempFrames.push(bmp)
        trial++
        // Quick heuristic: stop when we have allocated ~500 MiB total.
        // 500 MiB ÷ 2.4 MiB ≈ 208 frames → we stop a bit earlier.
        if (trial * BYTES_PER_FRAME > 500 * 1024 * 1024) break
      }
    } catch (e) {
      // Allocation failed – we’ve reached the browser’s limit.
    } finally {
      // Clean up the temporary bitmaps.
      for (const b of tempFrames) if (typeof b.close === 'function') b.close()
    }

    // Use the successful count, but clamp to a conservative upper bound.
    const safeCount = Math.min(trial, 800) // 800 × 2.4 MiB ≈ 1.9 GiB (still OK on most desktops)
    window.demoMode.maxFrames = safeCount
    console.info(`[DemoMode] Auto‑detected maxFrames = ${safeCount}`)
    return safeCount
  },
  /* ============================================================== */
  start: async function () {
    window.demoMode.enabled = true
    // Detect a safe maxFrames value (runs only once).
    await window.demoMode.detectMaxFrames()
    // Reset state.
    window.demoMode.frames = []
    window.demoMode.lastFrame = null
    window.demoMode.isIdle = false
    window.demoMode.clearIdleTimer()
    // Begin listening for mouse movement.
    window.addEventListener('mousemove', window.demoMode.handleMouseMove)
    // Kick‑off an initial recording so we have something to play back later.
    window.demoMode.onMouseActive()
    // Start the idle timer (30s of inactivity → playback).
    window.demoMode.startIdleTimer()
    window.alert(
      `Demo mode engaged!\nIdle timer set for ${window.demoMode.idleTime / 1000}s.\n` +
      `Recording at ${window.demoMode.fpsTarget} fps, buffer capped at ${window.demoMode.maxFrames} frames.`
    )
  },

  stop: function () {
    // Remove listeners and timers.
    window.removeEventListener('mousemove', window.demoMode.handleMouseMove)
    window.demoMode.clearIdleTimer()
    // Cancel any loops that might still be running.
    if (window.demoMode.animationHandle) {
      window.cancelAnimationFrame(window.demoMode.animationHandle)
    }
    if (window.demoMode.recordHandle) {
      window.cancelAnimationFrame(window.demoMode.recordHandle)
    }
    window.demoMode.animationHandle = null
    window.demoMode.recordHandle = null

    // Release all stored ImageBitmaps.
    for (const bmp of window.demoMode.frames) {
      if (bmp && typeof bmp.close === 'function') bmp.close()
    }
    window.demoMode.frames = []

    if (window.demoMode.lastFrame && typeof window.demoMode.lastFrame.close === 'function') {
      window.demoMode.lastFrame.close()
    }

    window.demoMode.lastFrame = null
    window.demoMode.isIdle = false
    window.alert('Demo Mode disabled!')
    console.info('[DemoMode] Stopped and cleaned up.')
  }
}

/* -----------------------------------------------------------------
  ADD IT TO THE START MENU
----------------------------------------------------------------- */
window.menu.File['Demo Mode'] = () => {
  if (window.demoMode.enabled) {
    window.demoMode.stop()
  } else {
    window.demoMode.start()
  }
}
