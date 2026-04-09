import * as ecs from '@8thwall/ecs'

// 타입 선언 추가
declare global {
  interface HTMLCanvasElement {
    captureStream(frameRate?: number): MediaStream
  }
}

interface BlobEvent extends Event {
  data: Blob
}

interface MediaRecorder extends EventTarget {
  readonly state: 'inactive' | 'recording' | 'paused'
  ondataavailable: ((event: BlobEvent) => void) | null
  onerror: ((event: Event) => void) | null
  onstart: (() => void) | null
  onstop: (() => void) | null
  start(timeslice?: number): void
  stop(): void
  requestData(): void
}

declare const MediaRecorder: {
prototype: MediaRecorder
new (stream: MediaStream, options?: {mimeType?: string; videoBitsPerSecond?: number}): MediaRecorder
isTypeSupported(mimeType: string): boolean
}

// 녹화 상태와 관련 객체들을 저장할 변수
let isRecording = false
let currentButtonId: string = 'record-btn'
let currentMimeType: string = 'video/webm'
let activeRecorder: MediaRecorder | null = null
let isProcessing = false

// iOS 감지
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// mimeType에서 확장자 추출
function getFileExtension(mimeType: string): string {
  if (mimeType.includes('mp4')) {
    return 'mp4'
  }
  return 'webm'
}

// 펄스 애니메이션 CSS 추가
function addPulseAnimation() {
  if (document.getElementById('pulse-animation-style')) return

  const style = document.createElement('style')
  style.id = 'pulse-animation-style'
  style.textContent = `
    @keyframes pulse {
      0% {
        transform: translateX(-50%) scale(1);
        box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7);
      }
      50% {
        transform: translateX(-50%) scale(1.1);
        box-shadow: 0 0 0 15px rgba(255, 0, 0, 0);
      }
      100% {
        transform: translateX(-50%) scale(1);
        box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
      }
    }
    
    .recording-pulse {
      animation: pulse 1.5s ease-in-out infinite;
    }
  `
  document.head.appendChild(style)
}

// 비디오 다운로드 함수
function downloadVideo(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// iOS용 비디오 저장
function saveVideoIOS(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const newWindow = window.open(url, '_blank')

  if (!newWindow) {
    downloadVideo(blob, fileName)
  }

  setTimeout(() => {
    alert('Video opened in new tab.\n\nTo save: Long press on video > "Save to Photos"\n\n(비디오가 새 탭에서 열렸습니다.\n\n저장하려면: 비디오를 길게 누르고 > "사진에 저장")')
  }, 500)
}

// 비디오 공유 함수
async function shareVideo(blob: Blob, fileName: string, mimeType: string) {
  if (isIOS() && mimeType.includes('webm')) {
    saveVideoIOS(blob, fileName)
    return
  }

  try {
    const file = new File([blob], fileName, {type: mimeType})
    const nav = navigator as Navigator & {
      share?: (data: {files?: File[]; title?: string; text?: string}) => Promise<void>
      canShare?: (data: {files?: File[]}) => boolean
    }

    if (nav.canShare && nav.canShare({files: [file]})) {
      await nav.share({
        files: [file],
        title: 'AR Video',
      })
      console.log('Shared successfully')
    } else if (isIOS()) {
      saveVideoIOS(blob, fileName)
    } else {
      alert('Sharing not supported. Downloading instead.')
      downloadVideo(blob, fileName)
    }
  } catch (error) {
    console.error('Share error:', error)
    if ((error as Error).name !== 'AbortError') {
      if (isIOS()) {
        saveVideoIOS(blob, fileName)
      } else {
        alert('Failed to share. Please try downloading.')
      }
    }
  }
}

// 미리보기 모달 생성
function createPreviewModal(): HTMLDivElement {
  const modal = document.createElement('div')
  modal.id = 'video-preview-modal'
  modal.style.cssText = `
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.9);
    z-index: 10000;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  `

  const shareButtonText = isIOS() ? 'Save' : 'Share'

  modal.innerHTML = `
    <div style="position: relative; width: 90%; max-width: 500px;">
      <video id="preview-video" controls playsinline style="width: 100%; border-radius: 10px;"></video>
      
      <div style="display: flex; gap: 15px; margin-top: 20px; justify-content: center;">
        <button id="download-btn" style="
          padding: 15px 30px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 25px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        ">Download</button>
        
        <button id="share-btn" style="
          padding: 15px 30px;
          background: #2196F3;
          color: white;
          border: none;
          border-radius: 25px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        ">${shareButtonText}</button>
        
        <button id="close-btn" style="
          padding: 15px 30px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 25px;
          font-size: 16px;
          font-weight: bold;
          cursor: pointer;
        ">Close</button>
      </div>
    </div>
  `

  document.body.appendChild(modal)
  return modal
}

// 미리보기 표시
function showPreview(blob: Blob, mimeType: string) {
  const existingModal = document.getElementById('video-preview-modal')
  if (existingModal) {
    existingModal.remove()
  }

  const modal = createPreviewModal()

  const video = document.getElementById('preview-video') as HTMLVideoElement
  const downloadBtn = document.getElementById('download-btn') as HTMLButtonElement
  const shareBtn = document.getElementById('share-btn') as HTMLButtonElement
  const closeBtn = document.getElementById('close-btn') as HTMLButtonElement

  const videoUrl = URL.createObjectURL(blob)
  video.src = videoUrl

  modal.style.display = 'flex'

  const extension = getFileExtension(mimeType)
  const fileName = `ar-video-${Date.now()}.${extension}`

  console.log('Preview file:', fileName, 'mimeType:', mimeType, 'isIOS:', isIOS())

  downloadBtn.onclick = () => {
    downloadVideo(blob, fileName)
  }

  shareBtn.onclick = async () => {
    await shareVideo(blob, fileName, mimeType)
  }

  closeBtn.onclick = () => {
    modal.style.display = 'none'
    video.pause()
    video.src = ''
    URL.revokeObjectURL(videoUrl)
  }
}

// 버튼 녹화 상태로 변경 (펄스 효과 시작)
function setButtonRecording(button: HTMLElement) {
  button.classList.add('recording-pulse')
  button.style.background = '#ff0000'
}

// 버튼 대기 상태로 변경 (펄스 효과 중지)
function setButtonIdle(button: HTMLElement) {
  button.classList.remove('recording-pulse')
  button.style.background = '#ff0000'
}

// 녹화 중지 함수
function stopRecording(button: HTMLElement) {
  console.log('stopRecording called, activeRecorder:', !!activeRecorder, 'state:', activeRecorder?.state)

  if (activeRecorder && activeRecorder.state === 'recording') {
    console.log('Stopping recorder...')
    activeRecorder.stop()
    setButtonIdle(button)
  }
}

// 실제로 작동하는 mimeType 찾기
function findWorkingMimeType(): string | null {
  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]

  for (const mimeType of mimeTypes) {
    if (MediaRecorder.isTypeSupported(mimeType)) {
      console.log('Supported mimeType:', mimeType)
      return mimeType
    }
  }

  return null
}

// 녹화 시작 함수
function startRecording(maxDuration: number, button: HTMLElement) {
  console.log('startRecording called')

  if (isProcessing) {
    console.log('Already processing, skip')
    return
  }

  isProcessing = true

  const canvas = document.querySelector('canvas') as HTMLCanvasElement
  if (!canvas) {
    console.error('Canvas not found')
    alert('Canvas not found. Cannot record.')
    isProcessing = false
    return
  }

  console.log('Canvas found:', canvas.width, 'x', canvas.height)

  let stream: MediaStream
  try {
    stream = canvas.captureStream(30)
    console.log('Stream created, tracks:', stream.getTracks().length)
  } catch (e) {
    console.error('captureStream error:', e)
    alert('Failed to capture canvas stream.')
    isProcessing = false
    return
  }

  const selectedMimeType = findWorkingMimeType()

  if (!selectedMimeType) {
    console.error('No supported mimeType found')
    alert('Video recording is not supported on this browser.')
    isProcessing = false
    return
  }

  console.log('Using mimeType:', selectedMimeType)
  currentMimeType = selectedMimeType

  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
    })
    console.log('MediaRecorder created, state:', recorder.state)
  } catch (e) {
    console.error('MediaRecorder creation error:', e)
    alert('Failed to create MediaRecorder.')
    isProcessing = false
    return
  }

  const chunks: Blob[] = []
  const recordedMimeType = selectedMimeType

  recorder.ondataavailable = (event: BlobEvent) => {
    console.log('ondataavailable, size:', event.data?.size)
    if (event.data && event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  recorder.onerror = (event: Event) => {
    console.error('MediaRecorder error event:', event)
    isProcessing = false
    isRecording = false
    activeRecorder = null
    setButtonIdle(button)
  }

  recorder.onstart = () => {
    console.log('MediaRecorder onstart')
    activeRecorder = recorder
    isRecording = true
    isProcessing = false
    setButtonRecording(button)
  }

  recorder.onstop = () => {
    console.log('MediaRecorder onstop, chunks:', chunks.length)

    isRecording = false
    activeRecorder = null

    if (chunks.length === 0) {
      console.warn('No chunks recorded')
      return
    }

    const baseMimeType = recordedMimeType.split(';')[0]
    const finalBlob = new Blob(chunks, {type: baseMimeType})
    console.log('Blob created, size:', finalBlob.size)

    if (finalBlob.size > 0) {
      showPreview(finalBlob, baseMimeType)
    }
  }

  try {
    recorder.start()
    console.log('recorder.start() called')
  } catch (e) {
    console.error('recorder.start error:', e)
    alert('Failed to start recording.')
    isProcessing = false
    return
  }

  setTimeout(() => {
    if (isRecording && activeRecorder && activeRecorder.state === 'recording') {
      console.log('Max duration reached')
      stopRecording(button)
    }
  }, maxDuration * 1000)
}

// 버튼 클릭 핸들러
function handleButtonClick(recordButtonId: string, maxDuration: number) {
  console.log('Click - isRecording:', isRecording, 'isProcessing:', isProcessing)

  const btn = document.getElementById(recordButtonId) as HTMLElement
  if (!btn) return

  if (isRecording) {
    stopRecording(btn)
  } else if (!isProcessing) {
    startRecording(maxDuration, btn)
  }
}

// 컴포넌트 등록
ecs.registerComponent({
  name: 'video-capture',
  schema: {
    recordButtonId: ecs.string,
    maxDuration: ecs.f32,
  },
  schemaDefaults: {
    recordButtonId: 'record-btn',
    maxDuration: 30,
  },

  add: (world, component) => {
    const {recordButtonId, maxDuration} = component.schema
    currentButtonId = recordButtonId

    // 펄스 애니메이션 CSS 추가
    addPulseAnimation()

    const existingButton = document.getElementById(recordButtonId)
    if (existingButton) {
      existingButton.remove()
    }

    const button = document.createElement('button')
    button.id = recordButtonId
    button.style.cssText = `
      position: fixed;
      bottom: 60px;
      left: 68%;
      transform: translateX(-50%);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #ff0000;
      border: 4px solid white;
      z-index: 9999;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    `
    document.body.appendChild(button)

    button.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      handleButtonClick(recordButtonId, maxDuration)
    }, {passive: false})
  },

  remove: () => {
    if (activeRecorder && activeRecorder.state === 'recording') {
      activeRecorder.stop()
    }
    const button = document.getElementById(currentButtonId)
    if (button) {
      button.remove()
    }
    const modal = document.getElementById('video-preview-modal')
    if (modal) {
      modal.remove()
    }
    const style = document.getElementById('pulse-animation-style')
    if (style) {
      style.remove()
    }
    isRecording = false
    isProcessing = false
    activeRecorder = null
  },
})
