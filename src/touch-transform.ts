// touch-transform.ts
import * as ecs from '@8thwall/ecs'

ecs.registerComponent({
  name: 'touch-transform',
  schema: {
    // 스케일 제한
    minScale: ecs.f32,
    maxScale: ecs.f32,
    // 이동 감도
    moveSensitivity: ecs.f32,
    // 롱프레스 시간 (ms)
    longPressTime: ecs.f32,
    // 드래그 활성화 여부 (롱프레스 없이 바로 드래그)
    instantDrag: ecs.boolean,
    // X축 반전 여부 (AR 카메라 방향 보정)
    invertX: ecs.boolean,
    // Y축 반전 여부
    invertY: ecs.boolean,
  },
  schemaDefaults: {
    minScale: 0.3,
    maxScale: 3.0,
    moveSensitivity: 0.005,
    longPressTime: 500,
    instantDrag: true,
    invertX: false,
    invertY: true,
  },
  data: {
    // 터치 상태
    isDragging: ecs.boolean,
    isPinching: ecs.boolean,
    isLongPressing: ecs.boolean,

    // 드래그 시작 위치
    dragStartX: ecs.f32,
    dragStartY: ecs.f32,

    // 핀치 초기값
    initialPinchDistance: ecs.f32,
    initialScaleX: ecs.f32,
    initialScaleY: ecs.f32,
    initialScaleZ: ecs.f32,

    // ★ 추가: 기준 스케일 (비율 계산용)
    baseScaleX: ecs.f32,
    baseScaleY: ecs.f32,
    baseScaleZ: ecs.f32,

    // 롱프레스 타이머
    longPressStartTime: ecs.f32,
  },
  add: (world, component) => {
    const {eid, schema, data} = component

    // 데이터 초기화
    data.isDragging = false
    data.isPinching = false
    data.isLongPressing = false
    data.dragStartX = 0
    data.dragStartY = 0
    data.initialPinchDistance = 0
    data.initialScaleX = 1
    data.initialScaleY = 1
    data.initialScaleZ = 1
    data.longPressStartTime = 0

    // ★ 초기 비율 저장 (컴포넌트 추가 시점의 스케일)
    const initialScale = ecs.Scale.get(world, eid)
    data.baseScaleX = initialScale.x
    data.baseScaleY = initialScale.y
    data.baseScaleZ = initialScale.z

    const canvas = document.querySelector('canvas')
    if (!canvas) return

    // 두 손가락 사이 거리 계산
    const getPinchDistance = (touches: TouchList): number => {
      if (touches.length < 2) return 0
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.sqrt(dx * dx + dy * dy)
    }

    // ========== TOUCH START ==========
    // ========== TOUCH START ==========
    const onTouchStart = (e: TouchEvent) => {
  // 첫 터치 시 모든 비디오 소리 활성화
  window.chromaKeyVideos?.forEach((video) => {
    if (video.muted) {
      video.muted = false
      video.volume = 1.0
    }
  })

  const touches = e.targetTouches

  // 두 손가락: 핀치 줌 시작
  if (touches.length === 2) {
    data.isDragging = false
    data.isLongPressing = false
    data.isPinching = true
    data.initialPinchDistance = getPinchDistance(touches)

    // 현재 스케일 저장
    const scale = ecs.Scale.get(world, eid)
    data.initialScaleX = scale.x
    data.initialScaleY = scale.y
    data.initialScaleZ = scale.z
    return
  }

  // 한 손가락: 드래그 준비
  if (touches.length === 1) {
    const touch = touches[0]
    data.dragStartX = touch.clientX
    data.dragStartY = touch.clientY

    if (schema.instantDrag) {
      data.isDragging = true
    } else {
      data.longPressStartTime = performance.now()
    }
  }
    }
    // ========== TOUCH MOVE ==========
    const onTouchMove = (e: TouchEvent) => {
      const touches = e.targetTouches

      // 핀치 줌 처리
      if (data.isPinching && touches.length === 2) {
        const currentDistance = getPinchDistance(touches)

        if (data.initialPinchDistance === 0) {
          data.initialPinchDistance = currentDistance
          return
        }

        // ★ 핵심 수정: 균일 스케일 팩터 계산
        const scaleFactor = currentDistance / data.initialPinchDistance

        // 현재 스케일 팩터 계산 (기준 스케일 대비)
        // initialScale = baseScale * currentFactor 이므로
        // currentFactor = initialScale / baseScale
        const currentFactorX = data.initialScaleX / data.baseScaleX

        // 새로운 균일 스케일 팩터
        let newUniformFactor = currentFactorX * scaleFactor

        // ★ 스케일 팩터에 대해서만 min/max 적용 (비율 유지)
        // 가장 큰 축 기준으로 제한 계산
        const maxBaseScale = Math.max(data.baseScaleX, data.baseScaleY, data.baseScaleZ)
        const minFactor = schema.minScale / maxBaseScale
        const maxFactor = schema.maxScale / maxBaseScale

        newUniformFactor = Math.max(minFactor, Math.min(maxFactor, newUniformFactor))

        // ★ 비율 유지하며 스케일 적용
        ecs.Scale.set(world, eid, {
          x: data.baseScaleX * newUniformFactor,
          y: data.baseScaleY * newUniformFactor,
          z: data.baseScaleZ * newUniformFactor,
        })
        return
      }

      // 드래그 이동 처리
      if (data.isDragging && touches.length === 1) {
        const touch = touches[0]

        const deltaX = touch.clientX - data.dragStartX
        const deltaY = touch.clientY - data.dragStartY

        const position = ecs.Position.get(world, eid)

        const xMultiplier = schema.invertX ? -1 : 1
        const yMultiplier = schema.invertY ? -1 : 1

        ecs.Position.set(world, eid, {
          x: position.x + (deltaX * schema.moveSensitivity * xMultiplier),
          y: position.y + (deltaY * schema.moveSensitivity * yMultiplier),
          z: position.z,
        })

        data.dragStartX = touch.clientX
        data.dragStartY = touch.clientY
      }
    }

    // ========== TOUCH END ==========
    const onTouchEnd = (e: TouchEvent) => {
      const touches = e.targetTouches

      if (touches.length < 2) {
        data.initialPinchDistance = 0
        data.isPinching = false
      }

      if (touches.length === 0) {
        data.isDragging = false
        data.isPinching = false
        data.isLongPressing = false
        data.dragStartX = 0
        data.dragStartY = 0
        data.longPressStartTime = 0
      }
    }

    // 이벤트 리스너 등록
    canvas.addEventListener('touchstart', onTouchStart, {passive: false})
    canvas.addEventListener('touchmove', onTouchMove, {passive: false})
    canvas.addEventListener('touchend', onTouchEnd, {passive: false})

    ;(component as any)._listeners = {
      canvas,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    }
  },
  tick: (world, component) => {
    const {schema, data} = component

    if (!schema.instantDrag && !data.isDragging && data.longPressStartTime > 0) {
      const elapsed = performance.now() - data.longPressStartTime
      if (elapsed >= schema.longPressTime) {
        data.isDragging = true
        data.isLongPressing = true
        data.longPressStartTime = 0

        if (navigator.vibrate) {
          navigator.vibrate(50)
        }
      }
    }
  },
  remove: (world, component) => {
    const listeners = (component as any)._listeners
    if (listeners) {
      const {canvas, onTouchStart, onTouchMove, onTouchEnd} = listeners
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
    }
  },
})
