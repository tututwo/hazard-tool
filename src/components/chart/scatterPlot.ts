// @ts-nochec
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import * as d3 from 'd3';

const ResizeController = (host, callback) => {
  let ro;
  return {
    hostConnected() {
      ro = new ResizeObserver(() => {
        const { width, height } = host.getBoundingClientRect();
        callback(width, height);
      });
      ro.observe(host);
    },
    hostDisconnected() {
      ro.disconnect();
    }
  };
};

@customElement('risk-scatter-plot')
export class RiskScatterPlot extends LitElement {
  @property({ type: Array }) data = [];
  @property({ type: Object }) selectedCounties = new Set();

  constructor() {
    super();
    this.resizeController = ResizeController(this, this.handleResize.bind(this));
  }

  connectedCallback() {
    super.connectedCallback();
    this.resizeController.hostConnected();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeController.hostDisconnected();
  }

  handleResize(width, height) {
    this.width = width;
    this.height = height;
    this.requestUpdate();
  }

  render() {
    return html`
      <div class="scatter-plot">
        <svg></svg>
      </div>
    `;
  }

  firstUpdated() {
    this.svg = d3.select(this.renderRoot.querySelector('svg'));
    this.updatePlot();
  }

  updated(changedProperties) {
    if (changedProperties.has('data') || changedProperties.has('width') || changedProperties.has('height')) {
      this.updatePlot();
    }
  }

  updatePlot() {
    if (!this.width || !this.height || !this.data.length) return;

    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const width = this.width - margin.left - margin.right;
    const height = this.height - margin.top - margin.bottom;

    this.svg
      .attr('width', this.width)
      .attr('height', this.height);

    const xScale = d3.scaleLinear()
      .domain(d3.extent(this.data, d => d.hazardRating))
      .range([margin.left, width + margin.left]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(this.data, d => d.worryLevel))
      .range([height + margin.top, margin.top]);

    this.svg.selectAll('*').remove();

    this.svg.append('g')
      .attr('transform', `translate(0,${height + margin.top})`)
      .call(d3.axisBottom(xScale));

    this.svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale));

    const dots = this.svg.selectAll('.dot')
      .data(this.data)
      .join('circle')
      .attr('class', 'dot')
      .attr('r', 3.5)
      .attr('cx', d => xScale(d.hazardRating))
      .attr('cy', d => yScale(d.worryLevel))
      .attr('fill', d => this.selectedCounties.has(d.id) ? 'red' : 'steelblue');

    this.setupBrush(xScale, yScale, width, height, margin);
  }

  setupBrush(xScale, yScale, width, height, margin) {
    const brush = d3.brush()
      .extent([[margin.left, margin.top], [width + margin.left, height + margin.top]])
      .on('end', (event) => this.brushed(event, xScale, yScale));

    this.svg.append('g')
      .attr('class', 'brush')
      .call(brush);
  }

  brushed(event, xScale, yScale) {
    if (!event.selection) return;

    const [[x0, y0], [x1, y1]] = event.selection;
    const selected = this.data.filter(d => {
      const x = xScale(d.hazardRating);
      const y = yScale(d.worryLevel);
      return x >= x0 && x <= x1 && y >= y0 && y <= y1;
    });

    const newSelected = new Set(selected.map(d => d.id));
    this.dispatchEvent(new CustomEvent('selection-change', {
      detail: newSelected,
      bubbles: true,
      composed: true
    }));
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .scatter-plot {
      width: 100%;
      height: 100%;
    }
    .dot {
      fill-opacity: 0.7;
      stroke: #fff;
    }
  `;
}