import { ReactiveController, ReactiveControllerHost } from "lit";
import { brush } from "d3-brush";
import { select } from "d3-selection";

export class BrushController implements ReactiveController {
  private host: ReactiveControllerHost;
  private brushInstance: d3.BrushBehavior<unknown>;
  private svg: SVGElement | null = null;

  constructor(
    host: ReactiveControllerHost,
    private width: number,
    private height: number,
    private onBrush: (
      selection: [[number, number], [number, number]] | null
    ) => void
  ) {
    this.host = host;
    host.addController(this);

    this.brushInstance = brush()
      .extent([
        [0, 0],
        [width, height],
      ])
      .on("brush", (event) => {
        this.onBrush(event.selection);
      });
  }

  hostConnected() {
    this.setupBrush();
  }

  hostDisconnected() {
    if (this.svg) {
      select(this.svg).on(".brush", null);
    }
  }

  setSVG(svg: SVGElement) {
    this.svg = svg;
    this.setupBrush();
  }

  private setupBrush() {
    if (!this.svg) return;

    const brushGroup = select(this.svg)
      .append("g")
      .attr("class", "brush")
      .call(this.brushInstance);

    brushGroup.select(".selection").attr("fill", "none").attr("stroke", "none");
    brushGroup.select(".overlay").attr("fill", "none");
  }
}
