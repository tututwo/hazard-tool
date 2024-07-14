//@ts-nocheck
import { ReactiveController, ReactiveControllerHost } from 'lit';

export class ResizeController implements ReactiveController {
  private host: ReactiveControllerHost;
  private resizeObserver: ResizeObserver;
  private _width: number = 0;
  private _height: number = 0;

  constructor(
    host: ReactiveControllerHost & Element,
    private callback?: (width: number, height: number) => void
  ) {
    this.host = host;
    host.addController(this);
    this.resizeObserver = new ResizeObserver(this.onResize.bind(this));
  }

  hostConnected() {
    this.resizeObserver.observe(this.host);
  }

  hostDisconnected() {
    this.resizeObserver.unobserve(this.host);
  }

  private onResize(entries: ResizeObserverEntry[]) {
    const entry = entries[0];
    if (entry) {
      const { width, height } = entry.contentRect;
      if (this._width !== width || this._height !== height) {
        this._width = width;
        this._height = height;
        this.callback?.(width, height);
        this.host.requestUpdate();
      }
    }
  }

  get width() {
    return this._width;
  }

  get height() {
    return this._height;
  }
}
