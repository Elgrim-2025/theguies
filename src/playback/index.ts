import * as ecs from '@8thwall/ecs'
import {PlaybackController} from './PlaybackController'

declare global {
  interface Window {
    chromaKeyVideos?: Map<string, HTMLVideoElement>
    // ★ 전역 PlaybackController 인스턴스 (중복 생성 방지)
    playbackController?: PlaybackController
  }
}

ecs.registerComponent({
  name: 'playback-toggle',
  schema: {
    buttonTop: ecs.f32,
    buttonRight: ecs.f32,
    buttonSize: ecs.f32,
    // ★ videoId 제거 - 동적으로 활성화된 타겟 추적
  },
  schemaDefaults: {
    buttonTop: 20,
    buttonRight: 20,
    buttonSize: 50,
  },
  add: (world, component) => {
    const {schema} = component

    // ★ 이미 생성된 컨트롤러가 있으면 재사용 (싱글톤)
    if (window.playbackController) {
      console.log('[playback-toggle] Controller already exists, skipping creation')
      ;(component as any).isOwner = false
      return
    }

    const controller = new PlaybackController({
      top: schema.buttonTop,
      right: schema.buttonRight,
      size: schema.buttonSize,
    })

    // 전역 참조 및 컴포넌트 참조 저장
    window.playbackController = controller
    ;(component as any).controller = controller
    ;(component as any).isOwner = true

    console.log('[playback-toggle] Controller created')
  },
  remove: (world, component) => {
    // ★ 소유자만 정리
    if (!(component as any).isOwner) return

    const controller = (component as any).controller as PlaybackController | undefined
    if (controller) {
      controller.dispose()
      window.playbackController = undefined
      console.log('[playback-toggle] Controller disposed')
    }
  },
  tick: () => {},
})

export {PlaybackController} from './PlaybackController'
export {PlaybackModel} from './PlaybackModel'
export {PlaybackButtonView} from './PlaybackButtonView'
