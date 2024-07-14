// @ts-nocheck
import { LitElement, html, css } from "lit";
import { customElement, query, property, state } from "lit/decorators.js";
import { brush } from "d3-brush";
import { select } from "d3-selection";
import { geoPath } from "d3-geo";
import { scaleOrdinal } from "d3-scale";
import * as topojson from "topojson-client";
import { highlightedCounties } from "../../utilities/signals";
import { SignalWatcher } from "@lit-labs/preact-signals";
import { BrushController } from "../../utilities/brushController";
import { ResizeController } from "../../utilities/resizeController";

@customElement("brushable-us-map")
export class BrushableUSMap extends SignalWatcher(LitElement) {
  static styles = css`
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
    }
    canvas,
    svg {
      position: absolute;
      top: 0;
      left: 0;
    }
    .brush .selection {
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

  @state() private zoomLevel = 2;

  @state() private scale = 1;
  @state() private translateX = 0;
  @state() private translateY = 0;

  private baseContext!: CanvasRenderingContext2D;
  private highlightContext!: CanvasRenderingContext2D;
  private path!: d3.GeoPath<any, d3.GeoPermissibleObjects>;
  private countyFeatures: any;
  private countyBounds: Array<[[number, number], [number, number]]>;
  private resizeController: ResizeController;
  private brushController: BrushController;

  constructor() {
    super();
    this.resizeController = new ResizeController(this, this.handleResize);
    this.brushController = new BrushController(
      this,
      this.width,
      this.height,
      (selection) => this.highlightCounties(selection)
    );
  }

  private handleResize = (width: number, height: number) => {
    this.width = width;
    this.height = height;

    const originalWidth = 975;
    const originalHeight = 610;
    const scaleX = this.width / originalWidth;
    const scaleY = this.height / originalHeight;
    this.scale = Math.min(scaleX, scaleY);
    this.translateX = (this.width - originalWidth * this.scale) / 2;
    this.translateY = (this.height - originalHeight * this.scale) / 2;
   
    this.redrawMap();
    this.brushController.updateDimensions(this.width, this.height);
  };

  firstUpdated() {
    this.baseContext = this.baseMapCanvas.getContext("2d")!;
    this.highlightContext = this.highlightCanvas.getContext("2d")!;
    this.path = geoPath().context(this.baseContext);
    this.setupCountyData();
    this.redrawMap();
    const svg = this.shadowRoot!.querySelector("svg");
    if (svg) {
      this.brushController.setSVG(svg);
    }
    this.hasRendered = true;
  }

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    this.baseContext.imageSmoothingEnabled = true;
    this.highlightContext.imageSmoothingEnabled = true;
    
    if (!this.hasRendered) return;

    if (changedProperties.has("usTopoJson")) {
      this.setupCountyData();
      this.redrawMap();
    } else if (
      changedProperties.has("width") ||
      changedProperties.has("height")
    ) {
      this.redrawMap();
    } else {
      this.updateHighlight();
    }
  }

  private redrawMap() {
    // const pixelRatio = window.devicePixelRatio || 1;
    // this.baseMapCanvas.width = this.width * pixelRatio;
    // this.baseMapCanvas.height = this.height * pixelRatio;
    // this.baseMapCanvas.style.width = `${this.width}px`;
    // this.baseMapCanvas.style.height = `${this.height}px`;

    this.renderBaseMap();
    this.updateHighlight();
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

  // renderMap() {
  //   this.renderBaseMap();
  //   this.updateHighlight();
  // }

  renderBaseMap() {
    if (!this.baseContext || !this.usTopoJson) return;

    const pixelRatio = window.devicePixelRatio || 1;
    const zoomedWidth = this.width * this.zoomLevel;
    const zoomedHeight = this.height * this.zoomLevel;
    this.baseContext.canvas.width = zoomedWidth * pixelRatio;
    this.baseContext.canvas.height = zoomedHeight * pixelRatio;
    this.baseContext.canvas.style.width = `${this.width}px`;
    this.baseContext.canvas.style.height = `${this.height}px`;
    this.baseContext.clearRect(0, 0, zoomedWidth, zoomedHeight);

    this.baseContext.setTransform(
      this.scale * this.zoomLevel * pixelRatio,
      0,
      0,
      this.scale * this.zoomLevel * pixelRatio,
      this.translateX * pixelRatio,
      this.translateY * pixelRatio
    );
    this.path = geoPath().context(this.baseContext);
    // Draw counties, states, and nation boundaries
    this.drawFeature(this.usTopoJson.objects.counties, "white", 0.5);
    this.drawFeature(this.usTopoJson.objects.states, "#495462", 1.5);
    this.drawFeature(this.usTopoJson.objects.nation, "grey", 1);
  }

  private drawFeature(feature: any, strokeColor: string, lineWidth: number) {
    this.baseContext.beginPath();
    if (feature === this.usTopoJson.objects.nation) {
      this.path(topojson.feature(this.usTopoJson, feature));
    } else {
      this.path(topojson.mesh(this.usTopoJson, feature, (a, b) => a !== b));
    }
    this.baseContext.lineWidth = lineWidth / this.scale;
    this.baseContext.strokeStyle = strokeColor;
    this.baseContext.stroke();
   
  }
  updateHighlight() {
    const pixelRatio = window.devicePixelRatio || 1;
    const zoomedWidth = this.width * this.zoomLevel;
    const zoomedHeight = this.height * this.zoomLevel;
    this.highlightContext.canvas.width = zoomedWidth * pixelRatio;
    this.highlightContext.canvas.height = zoomedHeight * pixelRatio;
    this.highlightContext.canvas.style.width = `${this.width}px`;
    this.highlightContext.canvas.style.height = `${this.height}px`;
    this.highlightContext.clearRect(0, 0, zoomedWidth, zoomedHeight);

    this.highlightContext.setTransform(
      this.scale * this.zoomLevel * pixelRatio,
      0,
      0,
      this.scale * this.zoomLevel * pixelRatio,
      this.translateX * pixelRatio,
      this.translateY * pixelRatio
    );
    this.highlightContext.globalAlpha = 0.55;

    const colorScale = scaleOrdinal(this.highlightColors);

    this.countyFeatures.forEach((feature: any) => {
      if (highlightedCounties.value.has(feature.id)) {
        this.highlightContext.beginPath();
        this.path.context(this.highlightContext)(feature);
        this.highlightContext.fillStyle = colorScale(feature.id);
        this.highlightContext.fill();
      }
    });
  }

  highlightCounties(selection: [[number, number], [number, number]] | null) {
    if (!selection) {
      highlightedCounties.value = new Set();
      return;
    }

    // Transform the selection coordinates to match the map's coordinate system
    const transformedSelection = [
      [
        (selection[0][0] - this.translateX) / this.scale,
        (selection[0][1] - this.translateY) / this.scale,
      ],
      [
        (selection[1][0] - this.translateX) / this.scale,
        (selection[1][1] - this.translateY) / this.scale,
      ],
    ];

    const [x0, y0, x1, y1] = [
      ...transformedSelection[0],
      ...transformedSelection[1],
    ];
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
