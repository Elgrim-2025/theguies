// playback/PlaybackController.ts

import {PlaybackModel} from './PlaybackModel'
import {PlaybackButtonView, PlaybackButtonConfig} from './PlaybackButtonView'

// 이벤트 상수
const VIDEO_TARGET_ACTIVATED = 'video-target-activated'
const VIDEO_TARGET_DEACTIVATED = 'video-target-deactivated'
const VIDEO_PLAYBACK_COMMAND = 'video-playback-command'

export interface PlaybackControllerConfig extends PlaybackButtonConfig {
  processingDelay?: number
}

export class PlaybackController {
  private model: PlaybackModel

  private view: PlaybackButtonView

  private config: PlaybackControllerConfig

  private unsubscribe: (() => void) | null = null

  private eventCleanups: (() => void)[] = []

  // ★ 현재 활성화된 타겟 정보
  private activeTarget: {
    eid: string
    videoId: string
    imageTargetName: string
  } | null = null

  constructor(config: PlaybackControllerConfig) {
    this.config = {
      processingDelay: 100,
      ...config,
    }

    this.model = new PlaybackModel()
    this.view = new PlaybackButtonView({
      top: config.top,
      right: config.right,
      size: config.size,
    })

    this.initialize()
  }

  private initialize(): void {
    // Model → View 바인딩
    this.unsubscribe = this.model.subscribe((state) => {
      this.view.render(state)
    })

    // View → Controller 바인딩
    this.view.onClick(() => this.handleToggle())

    // ★ 이미지 타겟 이벤트 구독
    this.subscribeToTargetEvents()

    // DOM에 마운트
    this.view.mount()

    console.log('[PLAYBACK] Controller initialized - waiting for target activation')
  }

  // ★ 이미지 타겟 이벤트 구독
  private subscribeToTargetEvents(): void {
    // 타겟 활성화
    const onTargetActivated = (e: CustomEvent) => {
      const {eid, videoId, imageTargetName, isPlaying} = e.detail

      this.activeTarget = {eid, videoId, imageTargetName}

      this.model.updateState({
        isPlaying,
        isReady: true,
      })

      console.log(`[PLAYBACK] Target activated: ${videoId}, playing: ${isPlaying}`)
    }

    // 타겟 비활성화
    const onTargetDeactivated = (e: CustomEvent) => {
      const {videoId} = e.detail

      // 현재 활성화된 타겟이 비활성화되면 상태 초기화
      if (this.activeTarget?.videoId === videoId) {
        this.activeTarget = null

        this.model.updateState({
          isPlaying: false,
          isReady: false,
        })

        console.log(`[PLAYBACK] Target deactivated: ${videoId}`)
      }
    }

    window.addEventListener(VIDEO_TARGET_ACTIVATED, onTargetActivated as EventListener)
    window.addEventListener(VIDEO_TARGET_DEACTIVATED, onTargetDeactivated as EventListener)

    this.eventCleanups.push(
      () => window.removeEventListener(VIDEO_TARGET_ACTIVATED, onTargetActivated as EventListener),
      () => window.removeEventListener(VIDEO_TARGET_DEACTIVATED, onTargetDeactivated as EventListener)
    )
  }

  // ★ 토글 핸들러 - ECS 컴포넌트에 명령 전달
  private handleToggle(): void {
    if (!this.model.canToggle || !this.activeTarget) return

    this.model.setProcessing(true)

    const currentlyPlaying = this.model.isPlaying
    const command = currentlyPlaying ? 'pause' : 'play'

    // ECS 컴포넌트에 명령 전달
    window.dispatchEvent(new CustomEvent(VIDEO_PLAYBACK_COMMAND, {
      detail: {
        videoId: this.activeTarget.videoId,
        command,
      },
    }))

    console.log(`[PLAYBACK] Command sent: ${command} to ${this.activeTarget.videoId}`)

    // Processing 상태 해제
    setTimeout(() => {
      this.model.setProcessing(false)
    }, this.config.processingDelay)
  }

  // === Public API ===
  play(): void {
    if (this.activeTarget && !this.model.isPlaying) {
      window.dispatchEvent(new CustomEvent(VIDEO_PLAYBACK_COMMAND, {
        detail: {
          videoId: this.activeTarget.videoId,
          command: 'play',
        },
      }))
    }
  }

  pause(): void {
    if (this.activeTarget && this.model.isPlaying) {
      window.dispatchEvent(new CustomEvent(VIDEO_PLAYBACK_COMMAND, {
        detail: {
          videoId: this.activeTarget.videoId,
          command: 'pause',
        },
      }))
    }
  }

  getState() {
    return this.model.getState()
  }

  getActiveTarget() {
    return this.activeTarget
  }

  dispose(): void {
    this.unsubscribe?.()
    this.eventCleanups.forEach(cleanup => cleanup())
    this.view.dispose()
    this.model.dispose()
  }
}
