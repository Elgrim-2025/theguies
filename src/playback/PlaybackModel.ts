// playback/PlaybackModel.ts

export interface PlaybackState {
  isPlaying: boolean
  isReady: boolean
  isProcessing: boolean
}

export type PlaybackStateListener = (state: PlaybackState) => void

export class PlaybackModel {
  private state: PlaybackState = {
    isPlaying: false,
    isReady: false,
    isProcessing: false,
  }

  private listeners: Set<PlaybackStateListener> = new Set()

  // === Getters ===
  getState(): Readonly<PlaybackState> {
    return {...this.state}
  }

  get isPlaying(): boolean {
    return this.state.isPlaying
  }

  get isReady(): boolean {
    return this.state.isReady
  }

  get isProcessing(): boolean {
    return this.state.isProcessing
  }

  get canToggle(): boolean {
    return this.state.isReady && !this.state.isProcessing
  }

  // === Setters (상태 변경 시 알림) ===
  setPlaying(isPlaying: boolean): void {
    if (this.state.isPlaying !== isPlaying) {
      this.state.isPlaying = isPlaying
      this.notifyListeners()
    }
  }

  setReady(isReady: boolean): void {
    if (this.state.isReady !== isReady) {
      this.state.isReady = isReady
      this.notifyListeners()
    }
  }

  setProcessing(isProcessing: boolean): void {
    if (this.state.isProcessing !== isProcessing) {
      this.state.isProcessing = isProcessing
      this.notifyListeners()
    }
  }

  updateState(partial: Partial<PlaybackState>): void {
    let changed = false

    for (const key of Object.keys(partial) as (keyof PlaybackState)[]) {
      if (this.state[key] !== partial[key]) {
        (this.state as any)[key] = partial[key]
        changed = true
      }
    }

    if (changed) {
      this.notifyListeners()
    }
  }

  // === Observer Pattern ===
  subscribe(listener: PlaybackStateListener): () => void {
    this.listeners.add(listener)
    // 구독 즉시 현재 상태 전달
    listener(this.getState())

    // unsubscribe 함수 반환
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(): void {
    const state = this.getState()
    this.listeners.forEach(listener => listener(state))
  }

  // === Cleanup ===
  dispose(): void {
    this.listeners.clear()
  }
}
