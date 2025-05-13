import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// load data from df_path
async function loadData(df_path) {
    const fem_temp_data = await d3.csv(df_path); 
    const columns = fem_temp_data.columns;
    console.log(columns[0]);
    return fem_temp_data
}
function preprocessData(rawData, groupBy = 'hour', dayNum = null) {
    // Optional filtering by day
    if (dayNum !== null) {
        rawData = rawData.filter(d => +d.day === +dayNum);
    }

    // Group and reshape
    const grouped = d3.group(rawData, d => d[groupBy]);

    const ids = Array.from(new Set(rawData.map(d => d.id)));
    const isFemale = id => id.startsWith('f');

    const result = Array.from(grouped, ([key, rows]) => {
        const row = { [groupBy]: +key };

        ids.forEach(id => {
            const values = rows.filter(d => d.id === id).map(d => +d.value);
            row[id] = values.length ? d3.mean(values) : null;
        });

        const feVals = ids.filter(isFemale).map(id => row[id]).filter(v => v != null);
        const maVals = ids.filter(id => !isFemale(id)).map(id => row[id]).filter(v => v != null);

        row['fe_mean'] = feVals.length ? d3.mean(feVals) : null;
        row['ma_mean'] = maVals.length ? d3.mean(maVals) : null;

        return row;
    });

    // Attach column headers for convenience
    result.columns = [groupBy, ...ids, 'fe_mean', 'ma_mean'];

    return result;
}

// function renderLinePlot(data) {
//     const columns = data.columns;
//     const numRows = data.length;

//     const series = columns.map(col => ({
//         name: col,
//         values: data.map((d, i) => ({ x: i, y: +d[col] }))
//     }));

//     const width = 800;
//     const height = 400;
//     const margin = {top: 20, right: 30, bottom: 30, left: 40};

//     const x = d3.scaleLinear()
//         .domain([0, numRows - 1])
//         .range([margin.left, width - margin.right]);

//     const y = d3.scaleLinear()
//     .domain([
//         d3.min(series, s => d3.min(s.values, d => d.y)),
//         d3.max(series, s => d3.max(s.values, d => d.y))
//     ])
//     .nice()
//     .range([height - margin.bottom, margin.top]);

//     const color = d3.scaleOrdinal(d3.schemeCategory10)
//     .domain(columns);

//     const line = d3.line()
//     .x(d => x(d.x))
//     .y(d => y(d.y));

//     const svg = d3.select("#chart").append("svg")
//     .attr("width", width)
//     .attr("height", height);

//     svg.append("g")
//     .attr("transform", `translate(0,${height - margin.bottom})`)
//     .call(d3.axisBottom(x).ticks(10));

//     svg.append("g")
//     .attr("transform", `translate(${margin.left},0)`)
//     .call(d3.axisLeft(y));

//     // Draw lines
//     svg.selectAll(".line")
//     .data(series)
//     .enter()
//     .append("path")
//     .attr("class", "line")
//     .attr("d", d => line(d.values))
//     .attr("stroke", d => color(d.name));

//     // Add legend
//     svg.selectAll(".legend")
//     .data(series)
//     .enter()
//     .append("text")
//     .attr("class", "legend")
//     .attr("x", width - margin.right + 10)
//     .attr("y", (d, i) => margin.top + i * 20)
//     .attr("fill", d => color(d.name))
//     .text(d => d.name);
// }

function renderLinePlot_2(data) {
    const columns = data.columns;
    const numRows = data.length;

    const femaleCols = columns.filter(c => /^f\d+$/.test(c));
    const maleCols = columns.filter(c => /^m\d+$/.test(c));
    const feMeanCol = 'fe_mean';
    const maMeanCol = 'ma_mean';

    // Determine xKey (e.g., 'hour' or 'day')
    const xKey = data[0].hour !== undefined ? 'hour' : 'day';

    const series = [];

    femaleCols.forEach((col, i) => {
        series.push({
            name: i === 0 ? "female" : "",
            group: "female",
            color: "rgb(255, 210, 210)",
            values: data.map(d => ({ x: +d[xKey], y: +d[col] }))
        });
    });

    maleCols.forEach((col, i) => {
        series.push({
            name: i === 0 ? "male" : "",
            group: "male",
            color: "rgb(210, 210, 255)",
            values: data.map(d => ({ x: +d[xKey], y: +d[col] }))
        });
    });

    series.push({
        name: "female mean",
        group: "female mean",
        color: "rgb(255, 0, 0)",
        values: data.map(d => ({ x: +d[xKey], y: +d[feMeanCol] }))
    });

    series.push({
        name: "male mean",
        group: "male mean",
        color: "rgb(0, 0, 255)",
        values: data.map(d => ({ x: +d[xKey], y: +d[maMeanCol] }))
    });

    const width = 800;
    const height = 400;
    const margin = {top: 40, right: 100, bottom: 40, left: 60};

    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => +d[xKey]))
        .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
        .domain([
            d3.min(series, s => d3.min(s.values, d => d.y)),
            d3.max(series, s => d3.max(s.values, d => d.y))
        ])
        .nice()
        .range([height - margin.bottom, margin.top]);

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
        .attr("stroke", d => d.color)
        .attr("fill", "none")
        .attr("stroke-width", 1.5);

    // Add grouped legends
    const legend = svg.selectAll(".legend")
        .data(series.filter(d => d.name)) // Only those with labels
        .enter()
        .append("g")
        .attr("transform", (d, i) => `translate(${width - margin.right + 10},${margin.top + i * 20})`);

    legend.append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("fill", d => d.color);

    legend.append("text")
        .attr("x", 15)
        .attr("y", 10)
        .text(d => d.name)
        .style("font-size", "12px");
}

// Load data and render the line plot
let data = await loadData('cleaned_data/all_temp.csv');
renderLinePlot_2(data);
