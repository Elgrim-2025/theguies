import * as ecs from '@8thwall/ecs'
import {VERTEX_SHADER, FRAGMENT_SHADER} from './shaders'

// 전역 비디오 레지스트리 초기화
if (!window.chromaKeyVideos) {
  window.chromaKeyVideos = new Map()
}

class ChromaKeyMaterial extends THREE.ShaderMaterial {
  constructor(
    url, keyColor, width, height, similarity = 0.01, smoothness = 0.18,
    spill = 0.1, videoId = 'chromakey-video'
  ) {
    super()

    this.videoId = videoId
    this.video = document.createElement('video')

    ecs.assets.load({url}).then((asset) => {
      this.video.src = asset.remoteUrl
    })
    this.video.setAttribute('muted', '')
    this.video.muted = true
    this.video.loop = true
    this.video.autoplay = true
    this.video.setAttribute('playsinline', '')

    // 전역 레지스트리에 등록
    window.chromaKeyVideos.set(videoId, this.video)

    // ★ 비디오 등록 즉시 초기화 이벤트 발생 (PlaybackModel 초기화용)
    window.dispatchEvent(new CustomEvent('chromakey-video-registered', {
      detail: {
        videoId,
        isPlaying: !this.video.paused,
        isReady: this.video.readyState >= 3,
      },
    }))

    // ★ 비디오 상태 변경 이벤트 발생
    this.video.addEventListener('play', () => {
      window.dispatchEvent(new CustomEvent('chromakey-video-state', {
        detail: {videoId, isPlaying: true, isReady: true},
      }))
    })

    this.video.addEventListener('pause', () => {
      window.dispatchEvent(new CustomEvent('chromakey-video-state', {
        detail: {videoId, isPlaying: false, isReady: true},
      }))
    })

    // ★ 비디오 준비 완료 이벤트
    this.video.addEventListener('canplay', () => {
      window.dispatchEvent(new CustomEvent('chromakey-video-ready', {
        detail: {videoId, isPlaying: !this.video.paused},
      }))
    })

    // 첫 터치로 재생 시작
    const startPlayback = () => {
      this.video.play().catch(e => console.warn('Autoplay failed:', e))
    }
    window.addEventListener('click', startPlayback, {once: true})
    window.addEventListener('touchstart', startPlayback, {once: true})

    this.texture = new THREE.VideoTexture(this.video)
    const chromaKeyColor = new THREE.Color(keyColor)

    this.setValues({
      uniforms: {
        tex: {value: this.texture},
        keyColor: {value: chromaKeyColor},
        texWidth: {value: width},
        texHeight: {value: height},
        similarity: {value: similarity},
        smoothness: {value: smoothness},
        spill: {value: spill},
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
    })
  }

  dispose() {
    // ★ 비디오 해제 이벤트 발생
    window.dispatchEvent(new CustomEvent('chromakey-video-disposed', {
      detail: {videoId: this.videoId},
    }))

    window.chromaKeyVideos?.delete(this.videoId)
    this.video.pause()
    this.video.src = ''
    this.texture.dispose()
    super.dispose()
  }
}

export {ChromaKeyMaterial}
