import * as ecs from '@8thwall/ecs'

// 커스텀 이벤트 정의
const VIDEO_DEACTIVATE_OTHERS = 'video.deactivateOthers'

// ★ 화면 버튼과 통신하기 위한 이벤트
const VIDEO_TARGET_ACTIVATED = 'video-target-activated'
const VIDEO_TARGET_DEACTIVATED = 'video-target-deactivated'
const VIDEO_PLAYBACK_COMMAND = 'video-playback-command'

// 컴포넌트 제거 시 cleanup 호출을 위한 Map
const cleanupMap = new Map<bigint, () => void>()

ecs.registerComponent({
  name: 'Video Controls UI - Image Target',
  schema: {
    // UI 엘리먼트는 더 이상 필수가 아님 (선택적으로 유지 가능)
    background: ecs.eid,
    playbackImage: ecs.eid,
    imageTargetName: ecs.string,
    // ★ 비디오 식별자 추가
    videoId: ecs.string,
  },
  schemaDefaults: {
    videoId: '',
  },
  data: {},
  stateMachine: ({world, eid, schemaAttribute}) => {
    const toPause = ecs.defineTrigger()
    const toPlaying = ecs.defineTrigger()
    const toHidden = ecs.defineTrigger()

    const logPrefix = `[VideoControl:${eid}]`

    // ★ 외부 명령 리스너 참조 저장
    let playbackCommandHandler: ((e: Event) => void) | null = null

    // ★ 화면 버튼에 활성화 알림
    const notifyActivated = (isPlaying: boolean) => {
      const {imageTargetName, videoId} = schemaAttribute.get(eid)
      const targetVideoId = videoId || imageTargetName

      window.dispatchEvent(new CustomEvent(VIDEO_TARGET_ACTIVATED, {
        detail: {
          eid: eid.toString(),
          imageTargetName,
          videoId: targetVideoId,
          isPlaying,
        },
      }))
      console.log(`${logPrefix} → 화면 버튼에 활성화 알림: ${targetVideoId}, playing: ${isPlaying}`)
    }

    // ★ 화면 버튼에 비활성화 알림
    const notifyDeactivated = () => {
      const {imageTargetName, videoId} = schemaAttribute.get(eid)
      const targetVideoId = videoId || imageTargetName

      window.dispatchEvent(new CustomEvent(VIDEO_TARGET_DEACTIVATED, {
        detail: {
          eid: eid.toString(),
          imageTargetName,
          videoId: targetVideoId,
        },
      }))
      console.log(`${logPrefix} → 화면 버튼에 비활성화 알림`)
    }

    // 다른 비디오들에게 비활성화 요청
    const requestDeactivateOthers = () => {
      console.log(`${logPrefix} requestDeactivateOthers() 호출`)
      world.events.dispatch(world.events.globalId, VIDEO_DEACTIVATE_OTHERS, {
        activeEid: eid,
      })
    }

    // ★ 화면 버튼으로부터 재생/일시정지 명령 수신
    const setupPlaybackCommandListener = () => {
      playbackCommandHandler = (e: Event) => {
        const {videoId: targetVideoId, command} = (e as CustomEvent).detail
        const {imageTargetName, videoId} = schemaAttribute.get(eid)
        const myVideoId = videoId || imageTargetName

        if (targetVideoId !== myVideoId) return

        console.log(`${logPrefix} [COMMAND] ${command} 수신`)

        if (command === 'play') {
          toPlaying.trigger()
        } else if (command === 'pause') {
          toPause.trigger()
        }
      }

      window.addEventListener(VIDEO_PLAYBACK_COMMAND, playbackCommandHandler)
    }

    const cleanupPlaybackCommandListener = () => {
      if (playbackCommandHandler) {
        window.removeEventListener(VIDEO_PLAYBACK_COMMAND, playbackCommandHandler)
        playbackCommandHandler = null
      }
    }

    // 컴포넌트 제거 시 cleanup 호출을 위해 저장
    cleanupMap.set(eid, cleanupPlaybackCommandListener)

    // ===== 초기 상태: 준비 대기 =====
    ecs.defineState('setup')
      .initial()
      .onEnter(() => {
        console.log(`${logPrefix} [STATE] setup 진입`)
        setupPlaybackCommandListener()
      })
      .listen(eid, ecs.events.VIDEO_CAN_PLAY_THROUGH, () => {
        console.log(`${logPrefix} [EVENT] VIDEO_CAN_PLAY_THROUGH 수신`)
        toHidden.trigger()
      })
      .onTrigger(toHidden, 'hidden')

    // ===== 숨김 상태: 이미지 타겟 대기 =====
    ecs.defineState('hidden')
      .onEnter(() => {
        console.log(`${logPrefix} [STATE] hidden 진입`)

        ecs.VideoControls.set(world, eid, {
          paused: true,
        })

        // ★ 비활성화 알림
        notifyDeactivated()
      })
      .listen(world.events.globalId, 'reality.imagefound', (e) => {
        const {name} = e.data as {name: string}
        const {imageTargetName} = schemaAttribute.get(eid)
        console.log(`${logPrefix} [EVENT] reality.imagefound - name: "${name}", myTarget: "${imageTargetName}"`)

        if (name === imageTargetName) {
          console.log(`${logPrefix} → 매칭됨! toPlaying 트리거`)
          toPlaying.trigger()
        }
      })
      .onTrigger(toPlaying, 'playing')

    // ===== 일시정지 상태 =====
    ecs.defineState('paused')
      .onEnter(() => {
        console.log(`${logPrefix} [STATE] paused 진입`)

        ecs.VideoControls.set(world, eid, {
          paused: true,
        })

        // ★ 화면 버튼에 상태 알림 (활성화 상태지만 일시정지)
        notifyActivated(false)
      })
      // ★ 화면 터치 제거 - 화면 버튼이 제어함
      // 이미지 타겟 재발견 시 재생
      .listen(world.events.globalId, 'reality.imagefound', (e) => {
        const {name} = e.data as {name: string}
        const {imageTargetName} = schemaAttribute.get(eid)

        if (name === imageTargetName) {
          console.log(`${logPrefix} → 이미지 재발견, toPlaying 트리거`)
          toPlaying.trigger()
        }
      })
      // 다른 비디오가 활성화되면 숨김으로
      .listen(world.events.globalId, VIDEO_DEACTIVATE_OTHERS, (e) => {
        const {activeEid} = e.data as {activeEid: bigint}
        if (activeEid !== eid) {
          console.log(`${logPrefix} → 다른 비디오 활성화됨, toHidden 트리거`)
          toHidden.trigger()
        }
      })
      // 이미지 타겟 잃으면 숨김으로
      .listen(world.events.globalId, 'reality.imagelost', (e) => {
        const {name} = e.data as {name: string}
        const {imageTargetName} = schemaAttribute.get(eid)

        if (name === imageTargetName) {
          console.log(`${logPrefix} → 이미지 잃음, toHidden 트리거`)
          toHidden.trigger()
        }
      })
      .onTrigger(toPlaying, 'playing')
      .onTrigger(toHidden, 'hidden')

    // ===== 재생 상태 =====
    ecs.defineState('playing')
      .onEnter(() => {
        console.log(`${logPrefix} [STATE] playing 진입`)

        // 다른 비디오들 비활성화
        requestDeactivateOthers()

        ecs.VideoControls.set(world, eid, {
          paused: false,
        })

        // ★ 화면 버튼에 상태 알림
        notifyActivated(true)

        console.log(`${logPrefix} playing onEnter 완료`)
      })
      // ★ 화면 터치 제거 - 화면 버튼이 제어함
      // 다른 비디오가 활성화되면 숨김으로
      .listen(world.events.globalId, VIDEO_DEACTIVATE_OTHERS, (e) => {
        const {activeEid} = e.data as {activeEid: bigint}
        if (activeEid !== eid) {
          console.log(`${logPrefix} → 다른 비디오 활성화됨, toHidden 트리거`)
          toHidden.trigger()
        }
      })
      // 이미지 타겟 잃으면 일시정지
      .listen(world.events.globalId, 'reality.imagelost', (e) => {
        const {name} = e.data as {name: string}
        const {imageTargetName} = schemaAttribute.get(eid)

        if (name === imageTargetName) {
          console.log(`${logPrefix} → 이미지 잃음, toPause 트리거`)
          toPause.trigger()
        }
      })
      .onTrigger(toPause, 'paused')
      .onTrigger(toHidden, 'hidden')
  },
  remove: (_world, component) => {
    const cleanup = cleanupMap.get(component.eid)
    if (cleanup) {
      cleanup()
      cleanupMap.delete(component.eid)
    }
  },
})
