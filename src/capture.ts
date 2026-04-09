import * as ecs from '@8thwall/ecs'

declare const XR8: any

declare global {
  interface Navigator {
    canShare?: (data?: ShareData) => boolean
  }
  interface ShareData {
    files?: File[]
  }
}

ecs.registerComponent({
  name: 'capture',
  schema: {
    buttonBottom: ecs.f32,
    buttonRight: ecs.f32,
    buttonSize: ecs.f32,
  },
  schemaDefaults: {
    buttonBottom: 50,
    buttonRight: 180,
    buttonSize: 60,
  },
  add: (world, component) => {
    const {schema} = component

    console.log('capture component added')

    // === 캡처 버튼 생성 ===
    const captureButton = document.createElement('button')
    captureButton.id = 'capture-button'
    captureButton.innerHTML = `
      <div style="
        width: 24px;
        height: 24px;
        background: white;
        border-radius: 50%;
      "></div>
    `
    captureButton.style.cssText = `
      position: fixed;
      bottom: ${schema.buttonBottom}px;
      right: ${schema.buttonRight}px;
      width: ${schema.buttonSize}px;
      height: ${schema.buttonSize}px;
      border-radius: 50%;
      border: 3px solid white;
      background: transparent;
      cursor: pointer;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: manipulation;
      padding: 0;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
    `
    document.body.appendChild(captureButton)

    // === 토스트 메시지 ===
    const showToast = (message: string) => {
      const toast = document.createElement('div')
      toast.textContent = message
      toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        z-index: 10001;
        pointer-events: none;
      `
      document.body.appendChild(toast)

      setTimeout(() => {
        toast.remove()
      }, 2000)
    }

    // === 자동 저장 함수 ===
    const autoSaveImage = (imageDataURL: string) => {
      const link = document.createElement('a')
      link.download = `AR_capture_${Date.now()}.png`
      link.href = imageDataURL
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      console.log('[CAPTURE] Auto-saved')
    }

    // === 미리보기 모달 생성 ===
    const createPreviewModal = (imageDataURL: string) => {
      const overlay = document.createElement('div')
      overlay.id = 'capture-preview-overlay'
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
      `

      // 닫기 버튼
      const closeButton = document.createElement('button')
      closeButton.innerHTML = '✕'
      closeButton.style.cssText = `
        position: absolute;
        top: 20px;
        right: 20px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: none;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      `
      closeButton.onclick = () => overlay.remove()

      // 저장 완료 메시지
      const savedMessage = document.createElement('div')
      savedMessage.innerHTML = '✓ Saved to device'
      savedMessage.style.cssText = `
        color: #4CAF50;
        font-size: 14px;
        margin-bottom: 12px;
      `

      // 이미지 미리보기
      const previewImage = document.createElement('img')
      previewImage.src = imageDataURL
      previewImage.style.cssText = `
        max-width: 90%;
        max-height: 60%;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        object-fit: contain;
      `

      // 버튼 컨테이너
      const buttonContainer = document.createElement('div')
      buttonContainer.style.cssText = `
        display: flex;
        gap: 16px;
        margin-top: 24px;
      `

      // 공유 버튼
      const shareButton = document.createElement('button')
      shareButton.innerHTML = '<span style="margin-right: 8px;">📤</span>Share'
      shareButton.style.cssText = `
        padding: 16px 32px;
        border-radius: 12px;
        border: none;
        background: #2196F3;
        color: white;
        font-size: 18px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 140px;
      `
      shareButton.onclick = async () => {
        try {
          if (navigator.share) {
            const response = await fetch(imageDataURL)
            const blob = await response.blob()
            const file = new File([blob], `AR_capture_${Date.now()}.png`, {type: 'image/png'})

            const shareData: any = {
              title: 'AR Capture',
            }

            if (navigator.canShare && navigator.canShare({files: [file]})) {
              shareData.files = [file]
            }

            await navigator.share(shareData)
            showToast('Shared!')
          } else {
            const newWindow = window.open()
            if (newWindow) {
              newWindow.document.write(`<img src="${imageDataURL}" style="max-width:100%;">`)
              showToast('Opened in new tab')
            }
          }
        } catch (error) {
          const err = error as Error
          if (err.name !== 'AbortError') {
            console.error('Share failed:', error)
            const newWindow = window.open()
            if (newWindow) {
              newWindow.document.write(`<img src="${imageDataURL}" style="max-width:100%;">`)
            }
          }
        }
      }

      // 다시 찍기 버튼
      const retakeButton = document.createElement('button')
      retakeButton.innerHTML = '<span style="margin-right: 8px;">🔄</span>Retake'
      retakeButton.style.cssText = `
        padding: 16px 32px;
        border-radius: 12px;
        border: none;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        font-size: 18px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 140px;
      `
      retakeButton.onclick = () => overlay.remove()

      buttonContainer.appendChild(shareButton)
      buttonContainer.appendChild(retakeButton)

      overlay.appendChild(closeButton)
      overlay.appendChild(savedMessage)
      overlay.appendChild(previewImage)
      overlay.appendChild(buttonContainer)

      document.body.appendChild(overlay)
    }

    // === 캡처 방법들 ===

    const captureFromVideo = (): string | null => {
      try {
        const video = document.querySelector('video') as HTMLVideoElement
        if (!video || video.readyState < 2) {
          return null
        }

        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = video.videoWidth || window.innerWidth
        tempCanvas.height = video.videoHeight || window.innerHeight
        const ctx = tempCanvas.getContext('2d')

        if (!ctx) return null

        ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height)

        const glCanvas = document.querySelector('canvas') as HTMLCanvasElement
        if (glCanvas) {
          ctx.drawImage(glCanvas, 0, 0, tempCanvas.width, tempCanvas.height)
        }

        return tempCanvas.toDataURL('image/png')
      } catch (e) {
        return null
      }
    }

    const captureFromXR8 = (): Promise<string | null> => new Promise((resolve) => {
      try {
        if (typeof XR8 === 'undefined' || !XR8.canvasScreenshot) {
          resolve(null)
          return
        }

        XR8.canvasScreenshot()
          .then((data: string) => {
            resolve(data && !data.includes('data:,') ? data : null)
          })
          .catch(() => resolve(null))
      } catch (e) {
        resolve(null)
      }
    })

    const captureOnNextFrame = (): Promise<string | null> => new Promise((resolve) => {
      requestAnimationFrame(() => {
        try {
          const canvas = document.querySelector('canvas') as HTMLCanvasElement
          if (!canvas) {
            resolve(null)
            return
          }

          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
          if (!gl) {
            resolve(null)
            return
          }

          const {width, height} = canvas
          const pixels = new Uint8Array(width * height * 4)
          gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)

          if (!pixels.some(p => p !== 0)) {
            resolve(null)
            return
          }

          const tempCanvas = document.createElement('canvas')
          tempCanvas.width = width
          tempCanvas.height = height
          const ctx = tempCanvas.getContext('2d')
          if (!ctx) {
            resolve(null)
            return
          }

          const imageData = ctx.createImageData(width, height)

          for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
              const srcIdx = ((height - 1 - y) * width + x) * 4
              const dstIdx = (y * width + x) * 4
              imageData.data[dstIdx] = pixels[srcIdx]
              imageData.data[dstIdx + 1] = pixels[srcIdx + 1]
              imageData.data[dstIdx + 2] = pixels[srcIdx + 2]
              imageData.data[dstIdx + 3] = pixels[srcIdx + 3]
            }
          }

          ctx.putImageData(imageData, 0, 0)

          const video = document.querySelector('video') as HTMLVideoElement
          if (video && video.readyState >= 2) {
            const finalCanvas = document.createElement('canvas')
            finalCanvas.width = width
            finalCanvas.height = height
            const finalCtx = finalCanvas.getContext('2d')
            if (finalCtx) {
              finalCtx.drawImage(video, 0, 0, width, height)
              finalCtx.drawImage(tempCanvas, 0, 0)
              resolve(finalCanvas.toDataURL('image/png'))
              return
            }
          }

          resolve(tempCanvas.toDataURL('image/png'))
        } catch (e) {
          resolve(null)
        }
      })
    })

    // === 메인 캡처 함수 ===
    const captureScreen = async () => {
      console.log('[CAPTURE] Starting...')
      captureButton.style.display = 'none'

      // 플래시 효과
      const flash = document.createElement('div')
      flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: white;
        z-index: 9998;
        pointer-events: none;
        opacity: 0.8;
      `
      document.body.appendChild(flash)
      setTimeout(() => flash.remove(), 100)

      let imageDataURL: string | null = null

      imageDataURL = await captureFromXR8()

      if (!imageDataURL) {
        imageDataURL = await captureOnNextFrame()
      }

      if (!imageDataURL) {
        imageDataURL = captureFromVideo()
      }

      captureButton.style.display = 'flex'

      if (imageDataURL) {
        // 자동 저장
        autoSaveImage(imageDataURL)
        // 미리보기 모달 표시
        createPreviewModal(imageDataURL)
      } else {
        showToast('Capture failed')
      }
    }

    // === 버튼 이벤트 ===
    captureButton.addEventListener('click', captureScreen)
    captureButton.addEventListener('touchend', (e) => {
      e.preventDefault()
      captureScreen()
    })

    ;(component as any).cleanup = () => {
      captureButton.remove()
      const overlay = document.getElementById('capture-preview-overlay')
      if (overlay) overlay.remove()
    }
  },
  remove: (world, component) => {
    const {cleanup} = component as any
    if (cleanup) {
      cleanup()
    }
  },
  tick: () => {},
})
