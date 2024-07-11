// @ts-nocheck
import { LitElement, html, css } from "lit";
import { customElement, query, property } from "lit/decorators.js";
import { brush } from "d3-brush";
import { select } from "d3-selection";
import { geoPath } from "d3-geo";
import { scaleOrdinal } from "d3-scale";

import * as topojson from "topojson-client";

import { highlightedCounties } from "../../utilities/signals";
import { SignalWatcher } from "@lit-labs/preact-signals";

import { BrushController } from "../../utilities/brushController";
@customElement("brushable-us-map")
export class BrushableUSMap extends SignalWatcher(LitElement) {
  static styles = css`
    :host {
      display: contents;
    }
    canvas,
    svg {
      position: absolute;
      top: 0;
      left: 0;
    }
    .brush.selection {
      fill: none;
    }
  `;

  @query("#baseMap") baseMapCanvas!: HTMLCanvasElement;
  @query("#highlightLayer") highlightCanvas!: HTMLCanvasElement;

  @property({ type: Number }) width = 975;
  @property({ type: Number }) height = 610;
  @property({ type: Object }) usTopoJson: any;
  @property({ type: Array })
  highlightColors = ["#83CDBB", "#DFD65F", "#4CB4C7", "#8E8E8E", "#ff00ff"];
  private baseContext!: CanvasRenderingContext2D;
  private highlightContext!: CanvasRenderingContext2D;
  private path!: d3.GeoPath<any, d3.GeoPermissibleObjects>;

  private countyFeatures: any;
  private countyBounds: Array<[[number, number], [number, number]]>;

  constructor() {
    super();
    this.brushController = new BrushController(
      this,
      this.width,
      this.height,
      (selection) => this.highlightCounties(selection)
    );
  }

  firstUpdated() {
    this.baseContext = this.baseMapCanvas.getContext("2d")!;
    this.highlightContext = this.highlightCanvas.getContext("2d")!;
    this.path = geoPath().context(this.baseContext);

    this.renderBaseMap();

    this.setupCountyData();
    const svg = this.shadowRoot!.querySelector("svg");
    if (svg) {
      this.brushController.setSVG(svg);
    }
  }
  updated(cp) {
    super.updated(cp);
    this.updateHighlight();
  }

  updateHighlight() {
    this.highlightContext.clearRect(0, 0, this.width, this.height);
    // Set global alpha before drawing
    this.highlightContext.globalAlpha = 0.55; // Adjust the value to your desired alpha level (0.0 to 1.0)

    // Create a color scale using the predefined colors
    const colorScale = scaleOrdinal(this.highlightColors);

    this.countyFeatures.forEach((feature: any) => {
      if (highlightedCounties.value.has(feature.id)) {
        this.highlightContext.beginPath();
        this.path.context(this.highlightContext)(feature);

        // Use the color scale to get a color for each county
        this.highlightContext.fillStyle = colorScale(feature.id);
        this.highlightContext.fill();
      }
    });
  }
  setupCountyData() {
    this.countyFeatures = topojson.feature(
      this.usTopoJson,
      this.usTopoJson.objects.counties
    ).features;
    this.countyBounds = this.countyFeatures.map((feature: any) =>
      this.path.bounds(feature)
    );
  }
  renderBaseMap() {
    this.baseContext.lineJoin = "round";
    this.baseContext.lineCap = "round";

    // Draw counties
    this.baseContext.beginPath();
    this.path(
      topojson.mesh(
        this.usTopoJson,
        this.usTopoJson.objects.counties,
        (a: any, b: any) =>
          a !== b && ((a.id / 1000) | 0) === ((b.id / 1000) | 0)
      )
    );
    this.baseContext.lineWidth = 0.5;
    this.baseContext.strokeStyle = "#aaa";
    this.baseContext.stroke();

    // Draw states
    this.baseContext.beginPath();
    this.path(
      topojson.mesh(
        this.usTopoJson,
        this.usTopoJson.objects.states,
        (a: any, b: any) => a !== b
      )
    );
    this.baseContext.lineWidth = 0.5;
    this.baseContext.strokeStyle = "#000";
    this.baseContext.stroke();

    // Draw nation
    this.baseContext.beginPath();
    this.path(
      topojson.feature(this.usTopoJson, this.usTopoJson.objects.nation)
    );
    this.baseContext.lineWidth = 1;
    this.baseContext.strokeStyle = "#000";
    this.baseContext.stroke();
  }

  public highlightCounties(
    selection: [[number, number], [number, number]] | null
  ) {
    if (!selection) {
      highlightedCounties.value = new Set();
      return;
    }

    const [x0, y0, x1, y1] = [...selection[0], ...selection[1]];
    const newHighlightedCounties = new Set<string>();

    this.countyFeatures.forEach((feature: any, index: number) => {
      const [[minX, minY], [maxX, maxY]] = this.countyBounds[index];
      if (!(maxX < x0 || minX > x1 || maxY < y0 || minY > y1)) {
        newHighlightedCounties.add(feature.id);
      }
    });

    highlightedCounties.value = newHighlightedCounties;
  }

  render() {
    return html`
      <canvas
        id="baseMap"
        width="${this.width}"
        height="${this.height}"
      ></canvas>
      <canvas
        id="highlightLayer"
        width="${this.width}"
        height="${this.height}"
      ></canvas>
      <svg width="${this.width}" height="${this.height}"></svg>
    `;
  }
}
