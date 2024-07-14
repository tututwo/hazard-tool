// @ts-nocheck
import { ReactiveController, ReactiveControllerHost } from "lit";
import { brush } from "d3-brush";
import { select } from "d3-selection";

export class BrushController implements ReactiveController {
  private host: ReactiveControllerHost;
  private brushInstance: d3.BrushBehavior<unknown>;
  private svg: SVGElement | null = null;
  private width: number;
  private height: number;

  constructor(
    host: ReactiveControllerHost,
    width: number,
    height: number,
    private onBrush: (
      selection: [[number, number], [number, number]] | null
    ) => void
  ) {
    this.host = host;
    this.width = width;
    this.height = height;
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

  updateDimensions(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.brushInstance.extent([
      [0, 0],
      [width, height],
    ]);
    if (this.svg) {
      select(this.svg)
        .attr("width", width)
        .attr("height", height)
        .call(this.brushInstance);

      // Update the overlay rect
      select(this.svg)
        .select(".overlay")
        .attr("width", width)
        .attr("height", height);
    }
  }

  private setupBrush() {
    if (!this.svg) return;

    const brushGroup = select(this.svg)
      
      .attr("class", "brush")
      .call(this.brushInstance);

    brushGroup
      .select(".selection")
      .attr("fill", "none")
      .attr("stroke", "none")
      .attr("shape-rendering", "crispEdges");

    // Ensure the overlay matches the initial dimensions
    brushGroup
      .select(".overlay")
      .attr("fill", "none")
      .attr("width", this.width)
      .attr("height", this.height);
  }
}
