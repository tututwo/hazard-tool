// @ts-nocheck
import { LitElement, css, html } from "lit";
import { customElement, property, state, query } from "lit/decorators.js";

// Helpful Directives
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";

// Importing Components
import "./components/chart/brushableUsMap";
import "./components/chart/scatterPlot";

// Useful libraries
import { feature, mesh } from "topojson-client";

// import data
import usTopoJSON from "./assets/counties-albers-10m.json";

import { SignalWatcher } from "@lit-labs/preact-signals";
/**

 */
@customElement("main-component")
export class MyElement extends SignalWatcher(LitElement) {
  @state() private selectedCounties: Set<string> = new Set();
  @state() private topCounties: County[] = [];

  @query("#map1") map1!: BrushableUSMap;
  @query("#map2") map2!: BrushableUSMap;
  handleSelectionChange(event: CustomEvent) {
    this.selectedCounties = event.detail;
  }
  firstUpdated() {
    this.addEventListener(
      "brush-event",
      this.handleBrushEvent as EventListener
    );
  }

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
          <div class="objective-risk map-container">
            <brushable-us-map
              id="map1"
              .usTopoJson=${usTopoJSON}
            ></brushable-us-map>
          </div>
          <div class="subject-view  map-container">
            <brushable-us-map
              id="map2"
              .usTopoJson=${usTopoJSON}
            ></brushable-us-map>
          </div>
        </div>
        <div class="scatter-plot-container">
          <risk-scatter-plot .data=${scatterplotData}></risk-scatter-plot>
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
