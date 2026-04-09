// playback/PlaybackButtonView.ts

import {PlaybackState} from './PlaybackModel'

export interface PlaybackButtonConfig {
  top: number
  right: number
  size: number
}

export class PlaybackButtonView {
  private button: HTMLButtonElement

  private config: PlaybackButtonConfig

  private onClickCallback: (() => void) | null = null

  constructor(config: PlaybackButtonConfig) {
    this.config = config
    this.button = this.createButton()
  }

  // === 버튼 생성 ===
  private createButton(): HTMLButtonElement {
    const button = document.createElement('button')
    button.id = 'playback-toggle-button'

    button.style.cssText = `
      position: fixed;
      top: ${this.config.top}px;
      right: ${this.config.right}px;
      width: ${this.config.size}px;
      height: ${this.config.size}px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.4);
      background: rgba(0, 0, 0, 0.5);
      cursor: pointer;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: manipulation;
      padding: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: opacity 0.3s ease;
      opacity: 0.5;
      pointer-events: none;
    `

    // ★ 클릭 이벤트 - 버블링 차단
    button.addEventListener('click', (e) => {
      e.stopPropagation()  // window로 이벤트 전파 차단
      this.onClickCallback?.()
    })

    // ★ 터치 이벤트도 버블링 차단
    button.addEventListener('touchstart', (e) => {
      e.stopPropagation()  // window로 이벤트 전파 차단
    })

    return button
  }

  // === 아이콘 렌더링 ===
  private renderPlayIcon(isReady: boolean): string {
    const color = isReady ? 'white' : 'rgba(255,255,255,0.4)'
    return `
      <div style="
        width: 0;
        height: 0;
        border-left: 14px solid ${color};
        border-top: 10px solid transparent;
        border-bottom: 10px solid transparent;
        margin-left: 4px;
      "></div>
    `
  }

  private renderPauseIcon(isReady: boolean): string {
    const color = isReady ? 'white' : 'rgba(255,255,255,0.4)'
    return `
      <div style="display: flex; gap: 4px;">
        <div style="width: 6px; height: 20px; background: ${color}; border-radius: 2px;"></div>
        <div style="width: 6px; height: 20px; background: ${color}; border-radius: 2px;"></div>
      </div>
    `
  }

  // === 상태에 따른 UI 업데이트 ===
  render(state: PlaybackState): void {
    const {isPlaying, isReady} = state

    // 아이콘 업데이트
    this.button.innerHTML = isPlaying
      ? this.renderPauseIcon(isReady)
      : this.renderPlayIcon(isReady)

    // 버튼 활성화 상태
    this.button.style.opacity = isReady ? '1' : '0.5'
    this.button.style.pointerEvents = isReady ? 'auto' : 'none'
    this.button.style.borderColor = isReady ? 'white' : 'rgba(255,255,255,0.4)'
  }

  // === 이벤트 바인딩 ===
  onClick(callback: () => void): void {
    this.onClickCallback = callback
  }

  // === DOM 마운트/언마운트 ===
  mount(container: HTMLElement = document.body): void {
    container.appendChild(this.button)
  }

  unmount(): void {
    this.button.remove()
  }

  // === Cleanup ===
  dispose(): void {
    this.onClickCallback = null
    this.unmount()
  }
}
