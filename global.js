import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// load fem_temp data
async function loadData() {
    const fem_temp_data = await d3.csv('./data/fem_temp.csv'); 
    const columns = fem_temp_data.columns;
    console.log(columns[0]);
    return fem_temp_data
}


function renderLinePlot(data) {
    const columns = data.columns;
    const numRows = data.length;

    const series = columns.map(col => ({
        name: col,
        values: data.map((d, i) => ({ x: i, y: +d[col] }))
    }));

    const width = 800;
    const height = 400;
    const margin = {top: 20, right: 30, bottom: 30, left: 40};

    const x = d3.scaleLinear()
        .domain([0, numRows - 1])
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
    .domain([
        d3.min(series, s => d3.min(s.values, d => d.y)),
        d3.max(series, s => d3.max(s.values, d => d.y))
    ])
    .nice()
    .range([height - margin.bottom, margin.top]);

    const color = d3.scaleOrdinal(d3.schemeCategory10)
    .domain(columns);

    const line = d3.line()
    .x(d => x(d.x))
    .y(d => y(d.y));

    const svg = d3.select("#chart").append("svg")
    .attr("width", width)
    .attr("height", height);

    svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(10));

    svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y));

    // Draw lines
    svg.selectAll(".line")
    .data(series)
    .enter()
    .append("path")
    .attr("class", "line")
    .attr("d", d => line(d.values))
    .attr("stroke", d => color(d.name));

    // Add legend
    svg.selectAll(".legend")
    .data(series)
    .enter()
    .append("text")
    .attr("class", "legend")
    .attr("x", width - margin.right + 10)
    .attr("y", (d, i) => margin.top + i * 20)
    .attr("fill", d => color(d.name))
    .text(d => d.name);
}

// Load data and render the line plot
let data = await loadData();
renderLinePlot(data);
