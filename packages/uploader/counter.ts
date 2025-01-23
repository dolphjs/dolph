import { EventEmitter } from 'stream';

export class Counter extends EventEmitter {
  private value: number = 0;

  increment(): void {
    this.value++;
  }

  decrement(): void {
    if (--this.value === 0) {
      this.emit('zero');
    }
  }

  isZero(): boolean {
    return this.value === 0;
  }

  onceZero(fn: () => void): void {
    if (this.isZero()) {
      fn();
    } else {
      this.once('zero', fn);
    }
  }
}
