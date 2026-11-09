// Unified input state shared by touch controls and keyboard.

class InputState {
  moveX = 0;
  moveY = 0;
  private keys = new Set<string>();
  private dodgeQueued = false;
  private specialQueued = false;
  joyX = 0;
  joyY = 0;
  joyActive = false;
  enabled = true;
  onPause: (() => void) | null = null;

  constructor() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(k);
      if (k === ' ' || k === 'shift' || k === 'l') this.queueDodge();
      if (k === 'e' || k === 'q' || k === 'k' || k === 'j') this.queueSpecial();
      if (k === 'escape' || k === 'p') this.onPause?.();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  queueDodge() {
    if (this.enabled) this.dodgeQueued = true;
  }
  queueSpecial() {
    if (this.enabled) this.specialQueued = true;
  }
  consumeDodge(): boolean {
    const d = this.dodgeQueued;
    this.dodgeQueued = false;
    return d;
  }
  consumeSpecial(): boolean {
    const s = this.specialQueued;
    this.specialQueued = false;
    return s;
  }
  clear() {
    this.dodgeQueued = false;
    this.specialQueued = false;
    this.joyActive = false;
    this.joyX = this.joyY = 0;
    this.keys.clear();
  }

  /** Recompute movement vector; call each frame. */
  poll() {
    let x = 0;
    let y = 0;
    const k = this.keys;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) y -= 1;
    if (k.has('s') || k.has('arrowdown')) y += 1;
    if (this.joyActive) {
      x = this.joyX;
      y = this.joyY;
    }
    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    if (!this.enabled) x = y = 0;
    this.moveX = x;
    this.moveY = y;
  }
}

export const Input = new InputState();
