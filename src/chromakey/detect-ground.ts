// detect-ground.ts
// 터치 방향 이동 + 빌보드 + 핀치 크기 조절
import * as ecs from '@8thwall/ecs'

const componentState = new Map<bigint, {
targetX: number
targetY: number
targetZ: number
isMoving: boolean
isLongPressActivated: boolean
touchStartTime: number
isTouching: boolean
isPinching: boolean
initialPinchDistance: number
initialScaleX: number
initialScaleY: number
initialScaleZ: number
lastTouchX: number
lastTouchY: number
isDragging: boolean
// 월드 고정 위치
fixedWorldX: number
fixedWorldY: number
fixedWorldZ: number
isPlaced: boolean
}>()

ecs.registerComponent({
  name: 'detect-ground',
  schema: {
    smoothing: ecs.f32,
    arrivalThreshold: ecs.f32,
    longPressTime: ecs.f32,
    minScale: ecs.f32,
    maxScale: ecs.f32,
    dragSpeed: ecs.f32,
    camera: ecs.eid,
    enableBillboard: ecs.boolean,
  },
  schemaDefaults: {
    smoothing: 0.15,
    arrivalThreshold: 0.001,
    longPressTime: 1000,
    minScale: 0.1,
    maxScale: 5.0,
    dragSpeed: 0.01,
    enableBillboard: true,
  },
  data: {
    initialized: ecs.boolean,
  },
  add: (world, component) => {
    const {eid, schema} = component

    // 현재 위치를 고정 위치로 저장
    const initialPos = ecs.Position.get(world, eid)

    componentState.set(eid, {
      targetX: initialPos.x,
      targetY: initialPos.y,
      targetZ: initialPos.z,
      isMoving: false,
      isLongPressActivated: false,
      touchStartTime: 0,
      isTouching: false,
      isPinching: false,
      initialPinchDistance: 0,
      initialScaleX: 1,
      initialScaleY: 1,
      initialScaleZ: 1,
      lastTouchX: 0,
      lastTouchY: 0,
      isDragging: false,
      fixedWorldX: initialPos.x,
      fixedWorldY: initialPos.y,
      fixedWorldZ: initialPos.z,
      isPlaced: true,
    })

    const state = componentState.get(eid)!

    console.log('detect-ground component added, eid:', eid)
    console.log('Initial position:', initialPos.x, initialPos.y, initialPos.z)

    // === 전역 터치 이벤트 리스너 ===

    const handleTouchStart = (e: TouchEvent) => {
      const touchCount = e.touches.length

      if (touchCount >= 2) {
        state.isPinching = true
        state.isTouching = false
        state.isLongPressActivated = false
        state.isDragging = false

        const t0 = e.touches[0]
        const t1 = e.touches[1]
        const dx = t1.clientX - t0.clientX
        const dy = t1.clientY - t0.clientY
        state.initialPinchDistance = Math.sqrt(dx * dx + dy * dy)

        const currentScale = ecs.Scale.get(world, eid)
        state.initialScaleX = currentScale.x
        state.initialScaleY = currentScale.y
        state.initialScaleZ = currentScale.z
      } else if (touchCount === 1) {
        state.lastTouchX = e.touches[0].clientX
        state.lastTouchY = e.touches[0].clientY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      const touchCount = e.touches.length

      // === 핀치 처리 ===
      if (state.isPinching && touchCount >= 2) {
        const t0 = e.touches[0]
        const t1 = e.touches[1]
        const dx = t1.clientX - t0.clientX
        const dy = t1.clientY - t0.clientY
        const currentDistance = Math.sqrt(dx * dx + dy * dy)

        if (state.initialPinchDistance > 0) {
          const scaleRatio = currentDistance / state.initialPinchDistance

          let newScaleX = state.initialScaleX * scaleRatio
          let newScaleY = state.initialScaleY * scaleRatio
          let newScaleZ = state.initialScaleZ * scaleRatio

          const maxCurrentScale = Math.max(newScaleX, newScaleY, newScaleZ)
          const minCurrentScale = Math.min(newScaleX, newScaleY, newScaleZ)

          if (maxCurrentScale > schema.maxScale) {
            const limitRatio = schema.maxScale / maxCurrentScale
            newScaleX *= limitRatio
            newScaleY *= limitRatio
            newScaleZ *= limitRatio
          }

          if (minCurrentScale < schema.minScale) {
            const limitRatio = schema.minScale / minCurrentScale
            newScaleX *= limitRatio
            newScaleY *= limitRatio
            newScaleZ *= limitRatio
          }

          ecs.Scale.set(world, eid, {
            x: newScaleX,
            y: newScaleY,
            z: newScaleZ,
          })
        }
        return
      }

      // === 꾹 누르기 후 드래그 처리 ===
      if (state.isLongPressActivated && touchCount === 1) {
        const touch = e.touches[0]

        const deltaX = touch.clientX - state.lastTouchX
        const deltaY = touch.clientY - state.lastTouchY

        // 카메라 방향 기준으로 이동
        if (schema.camera) {
          try {
            const cameraPos = ecs.Position.get(world, schema.camera)

            // 카메라에서 오브젝트로의 방향
            const dirX = state.fixedWorldX - cameraPos.x
            const dirZ = state.fixedWorldZ - cameraPos.z
            const length = Math.sqrt(dirX * dirX + dirZ * dirZ)

            if (length > 0.001) {
              const forwardX = dirX / length
              const forwardZ = dirZ / length
              const rightX = -forwardZ
              const rightZ = forwardX

              // 화면 드래그를 월드 이동으로 변환
              const moveRight = deltaX * schema.dragSpeed
              const moveForward = -deltaY * schema.dragSpeed

              state.fixedWorldX += rightX * moveRight + forwardX * moveForward
              state.fixedWorldZ += rightZ * moveRight + forwardZ * moveForward
            }
          } catch (e) {
            // 카메라 없으면 단순 이동
            state.fixedWorldX += deltaX * schema.dragSpeed
            state.fixedWorldZ += deltaY * schema.dragSpeed
          }
        } else {
          state.fixedWorldX += deltaX * schema.dragSpeed
          state.fixedWorldZ += deltaY * schema.dragSpeed
        }

        state.lastTouchX = touch.clientX
        state.lastTouchY = touch.clientY

        state.isMoving = true
        state.isDragging = true
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const touchCount = e.touches.length

      if (touchCount < 2) {
        state.isPinching = false
      }

      if (touchCount === 0) {
        state.isTouching = false
        state.isLongPressActivated = false
        state.isPinching = false
        state.isDragging = false
      }
    }

    window.addEventListener('touchstart', handleTouchStart, {passive: true})
    window.addEventListener('touchmove', handleTouchMove, {passive: true})
    window.addEventListener('touchend', handleTouchEnd, {passive: true})

    // === 오브젝트 터치 시작 ===
    world.events.addListener(eid, ecs.input.SCREEN_TOUCH_START, () => {
      console.log('[OBJECT] touched - starting long press timer')
      state.isTouching = true
      state.touchStartTime = Date.now()
      state.isLongPressActivated = false
    })

    ;(component as any).cleanup = () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      componentState.delete(eid)
    }
  },
  remove: (world, component) => {
    const {cleanup} = component as any
    if (cleanup) {
      cleanup()
    }
  },
  tick: (world, component) => {
    const {eid, schema} = component
    const state = componentState.get(eid)
    if (!state) return

    // === 월드 고정 위치로 강제 설정 ===
    ecs.Position.set(world, eid, {
      x: state.fixedWorldX,
      y: state.fixedWorldY,
      z: state.fixedWorldZ,
    })

    // === 빌보드 효과 (Y축 회전만) ===
    if (schema.enableBillboard && schema.camera) {
      try {
        const cameraPos = ecs.Position.get(world, schema.camera)

        const dx = cameraPos.x - state.fixedWorldX
        const dz = cameraPos.z - state.fixedWorldZ
        const angle = Math.atan2(dx, dz)

        ecs.Quaternion.set(world, eid, {
          x: 0,
          y: Math.sin(angle / 2),
          z: 0,
          w: Math.cos(angle / 2),
        })
      } catch (e) {
        // 빌보드 스킵
      }
    }

    // === 꾹 누르기 체크 ===
    if (state.isTouching && !state.isLongPressActivated && !state.isPinching) {
      const elapsed = Date.now() - state.touchStartTime

      if (elapsed >= schema.longPressTime) {
        state.isLongPressActivated = true
        console.log('=== LONG PRESS ACTIVATED === Now you can drag!')
      }
    }
  },
})
