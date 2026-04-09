declare const XR8: any

import t1_ from '../image-targets/1_.json'
import t1_2 from '../image-targets/1-2.json'
import t2_1 from '../image-targets/2-1.json'
import t2_2 from '../image-targets/2-2.json'
import t3_1 from '../image-targets/3-1.json'
import t3_2 from '../image-targets/3-2.json'
import t4_1 from '../image-targets/4-1.json'
import t4_2 from '../image-targets/4-2.json'
import t5_1 from '../image-targets/5-1.json'
import t5_2 from '../image-targets/5-2.json'
import t6_1 from '../image-targets/6-1.json'
import t6_2 from '../image-targets/6-2.json'
import t7_1 from '../image-targets/7-1.json'
import t7_2 from '../image-targets/7-2.json'
import t8_1 from '../image-targets/8-1.json'
import t8_2 from '../image-targets/8-2.json'
import t9_1 from '../image-targets/9-1.json'
import t9_2 from '../image-targets/9-2.json'
import t10_1 from '../image-targets/10-1.json'
import t10_2 from '../image-targets/10-2.json'
import t11_1 from '../image-targets/11-1.json'
import t11_2 from '../image-targets/11-2.json'
import t12_1 from '../image-targets/12-1.json'
import t12_2 from '../image-targets/12-2.json'
import eating from '../image-targets/eating.json'
import meeting from '../image-targets/meeting.json'
import vacation from '../image-targets/vacation.json'
import outofoffice from '../image-targets/outofoffice.json'
import beachTarget from '../image-targets/beach-target.json'
import palmsTarget from '../image-targets/palms-target.json'
import front from '../image-targets/front.json'

const imageTargetData = [
  t1_, t1_2,
  t2_1, t2_2,
  t3_1, t3_2,
  t4_1, t4_2,
  t5_1, t5_2,
  t6_1, t6_2,
  t7_1, t7_2,
  t8_1, t8_2,
  t9_1, t9_2,
  t10_1, t10_2,
  t11_1, t11_2,
  t12_1, t12_2,
  eating, meeting, vacation, outofoffice,
  beachTarget, palmsTarget, front,
]

const onxrloaded = () => {
  XR8.XrController.configure({imageTargetData})
}

;(window as any).XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)

// 첫 터치 시 오디오 잠금 해제 + 이후 재생되는 모든 비디오 자동 언뮤트
let audioUnlocked = false

const unlockAudio = () => {
  if (audioUnlocked) return
  audioUnlocked = true

  // 현재 이미 재생 중인 비디오 언뮤트
  document.querySelectorAll('video').forEach((video) => {
    const v = video as HTMLVideoElement
    v.muted = false
    v.volume = 1.0
    if (!v.paused) {
      v.play().catch(() => {})
    }
  })
}

// 이후 재생 시작하는 모든 비디오도 언뮤트 (이미지 타겟 인식 후 재생 포함)
document.addEventListener('play', (e) => {
  if (!audioUnlocked) return
  const v = e.target as HTMLVideoElement
  if (v && v.tagName === 'VIDEO' && v.muted) {
    v.muted = false
    v.volume = 1.0
  }
}, true)

window.addEventListener('touchstart', unlockAudio, {passive: true})
window.addEventListener('click', unlockAudio)
