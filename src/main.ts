// @ts-nocheck
import { LitElement, css, html } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";
import { Task } from "@lit/task";
import { SignalWatcher } from "@lit-labs/preact-signals";

// Helpful Directives
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";

// Importing Components
import "./components/chart/brushableUsMap";
import "./components/chart/scatterPlot";

// Useful libraries
import { feature, mesh } from "topojson-client";
import * as d3 from "d3";
// import data
import usTopoJSON from "./data/counties-albers-10m.json";
// import scatterplotData from "./data/hazards_webtool_data.csv";

/**

 */
@customElement("main-component")
export class MyElement extends SignalWatcher(LitElement) {
  @state() private selectedCounties: Set<string> = new Set();
  @state() private topCounties: County[] = [];

  @query("#map1") map1!: BrushableUSMap;
  @query("#map2") map2!: BrushableUSMap;

  private mapDataTask = new Task(this, {
    task: async ([], { signal }) => {
      const response = await d3.json(
        "https://raw.githubusercontent.com/tututwo/hazard-tool/brush-controller/src/data/counties-albers-10m.json",
        { signal }
      );
      if (!response) throw new Error("Failed to load map data");
      return response;
    },
    args: () => [],
  });

  private scatterPlotDataTask = new Task(this, {
    task: async ([], { signal }) => {
      const data = await d3.csv(
        "https://raw.githubusercontent.com/tututwo/hazard-tool/brush-controller/src/data/hazards_webtool_data.csv",
        { signal }
      );
      if (!data) throw new Error("Failed to load scatter plot data");
      return data;
    },
    args: () => [],
  });
  handleSelectionChange(event: CustomEvent) {
    this.selectedCounties = event.detail;
  }
  firstUpdated() {}

  handleBrushEvent(event: CustomEvent) {
    const { selection, sourceMapId } = event.detail;
    if (sourceMapId === "map1") {
      this.map2.highlightCounties(selection);
    } else {
      this.map1.highlightCounties(selection);
    }
  }

  render() {
    return html`
      <main class="visualization-container">
        <h1 class="bg-blue-500 text-white p-4 rounded-lg">
          Made By <u>tu</u> Mosaic Style
        </h1>
        <div class="maps-container">
          ${this.mapDataTask.render({
            pending: () => html`<div>Loading map data...</div>`,
            complete: (mapData) => html`
              <div class="objective-risk map-container">
                <brushable-us-map
                  id="map1"
                  .usTopoJson=${mapData}
                ></brushable-us-map>
              </div>
              <div class="subject-view map-container">
                <brushable-us-map
                  id="map2"
                  .usTopoJson=${mapData}
                ></brushable-us-map>
              </div>
            `,
            error: (e) => html`<div>Error loading map data: ${e}</div>`,
          })}
        </div>
        <div class="scatter-plot-container">
          ${this.scatterPlotDataTask.render({
            pending: () => html`<div>Loading scatter plot data...</div>`,
            complete: (scatterData) => html`
              <risk-scatter-plot .data=${scatterData}></risk-scatter-plot>
            `,
            error: (e) =>
              html`<div>Error loading scatter plot data: ${e}</div>`,
          })}
        </div>
        <div class="table-container">
          <top-counties-table
            .counties=${this.topCounties}
          ></top-counties-table>
        </div>
      </main>
    `;
  }
  static styles = css`
    :host {
      max-width: 2280px;
      width: 100vw;
      margin: 0 auto;
      padding: 2rem;
      text-align: center;
      background-color: #8080808c;
    }
    .maps-container {
      width: 100%;
      display: flex;
      height: 50vh;
    }

    .map-container {
      position: relative;
      height: 100%;
      width: 50%;
    }
  `;
}
declare global {
  interface HTMLElementTagNameMap {
    "main-component": MyElement;
  }
}
