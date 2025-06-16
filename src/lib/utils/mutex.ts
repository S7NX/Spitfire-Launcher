export default class Mutex {
  private _queue: Array<() => void> = [];
  private _locked = false;

  async lock(): Promise<() => void> {
    const unlock = () => {
      const next = this._queue.shift();
      if (next) {
        next();
      } else {
        this._locked = false;
      }
    };

    if (this._locked) {
      await new Promise<void>(resolve => {
        this._queue.push(() => resolve());
      });
    } else {
      this._locked = true;
    }

    return unlock;
  }
}
