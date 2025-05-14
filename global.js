import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let allData = null;
let currentDay = null;


async function loadCSVOnce() {
    if (!allData) {
        allData = await d3.csv('cleaned_data/all_temp.csv', d3.autoType);
    }
}

async function loadAndPlotHourly(dayNum = 0) {
    await loadCSVOnce();
    if (dayNum === currentDay) return;
    currentDay = dayNum;
    const raw = allData;
    const filtered = raw.filter(d => d.day === dayNum);

    const groupByHour = d3.groups(filtered, d => d.hour);

    const ids = raw.columns.filter(c => /^f\d+$/.test(c) || /^m\d+$/.test(c));
    const result = groupByHour
    .sort((a, b) => a[0] - b[0])
    .map(([_, rows], idx) => {
        const obj = { hour: idx };

        ids.forEach(id => {
            const vals = rows.map(d => +d[id]);
            obj[id] = d3.mean(vals);
        });

        obj.fe_mean = d3.mean(ids.filter(id => id.startsWith('f')).map(id => obj[id]));
        obj.ma_mean = d3.mean(ids.filter(id => id.startsWith('m')).map(id => obj[id]));

        return obj;
    });

    result.columns = ['hour', ...ids, 'fe_mean', 'ma_mean'];
    drawHourlyLinePlot(result, 'hour', dayNum);
}

function drawHourlyLinePlot(data, xKey, dayNum) {
    const columns = data.columns;
    const femaleCols = columns.filter(c => /^f\d+$/.test(c));
    const maleCols = columns.filter(c => /^m\d+$/.test(c));

    const series = [];

    femaleCols.forEach((col, i) => {
        series.push({
            name: i === 0 ? "female" : "",
            group: "female",
            color: "rgb(255, 210, 210)",
            values: data.map(d => ({ x: +d[xKey], y: d[col] }))
        });
    });

    maleCols.forEach((col, i) => {
        series.push({
            name: i === 0 ? "male" : "",
            group: "male",
            color: "rgb(210, 210, 255)",
            values: data.map(d => ({ x: +d[xKey], y: d[col] }))
        });
    });

    series.push({
        name: "female mean",
        group: "female mean",
        color: "rgb(255, 0, 0)",
        values: data.map(d => ({ x: +d[xKey], y: d.fe_mean }))
    });

    series.push({
        name: "male mean",
        group: "male mean",
        color: "rgb(0, 0, 255)",
        values: data.map(d => ({ x: +d[xKey], y: d.ma_mean }))
    });

    const width = 800;
    const height = 400;
    const margin = {top: 40, right: 100, bottom: 40, left: 60};

    const x = d3.scaleLinear()
        .domain([0, 23])
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

    d3.select("#chart").html("");

    const svg = d3.select("#chart").append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).ticks(24));

    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y));

    svg.selectAll(".line")
        .data(series)
        .enter()
        .append("path")
        .attr("class", "line")
        .attr("d", d => line(d.values))
        .attr("stroke", d => d.color)
        .attr("fill", "none")
        .attr("stroke-width", 1.5);
        
    const tooltip = d3.select("#tooltip");

    // Add points and interactivity
    series.forEach(s => {
        svg.selectAll(`.point-${s.group.replace(/\s/g, '-')}`)
            .data(s.values)
            .enter()
            .append("circle")
            .attr("class", `point-${s.group}`)
            .attr("cx", d => x(d.x))
            .attr("cy", d => y(d.y))
            .attr("r", 3)
            .attr("fill", s.color)
            .on("mouseover", function (event, d) {
                d3.select(this).attr("r", 6);
                tooltip.style("visibility", "visible")
                    .html(`<strong>${s.name || s.group}</strong><br>Hour: ${d.x}<br>Temp: ${d.y.toFixed(2)}`);
            })
            .on("mousemove", function (event) {
                tooltip.style("top", (event.pageY - 40) + "px")
                    .style("left", (event.pageX + 10) + "px");
            })
            .on("mouseout", function () {
                d3.select(this).attr("r", 3);
                tooltip.style("visibility", "hidden");
            });
    });

    svg.append("text")
        .attr("x", width / 2)
        .attr("y", margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text(`Average Hourly Temperature – Day ${dayNum+1}`);

    const legend = svg.selectAll(".legend")
        .data(series.filter(d => d.name))
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
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
function createSlider(maxDay = 13) {
    const width = 800;
    const height = 60;

    const svg = d3.select("#slider")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const margin = { left: 60, right: 60 };
    const sliderWidth = width - margin.left - margin.right;

    const x = d3.scaleLinear()
        .domain([0, maxDay])
        .range([0, sliderWidth])
        .clamp(true);

    const slider = svg.append("g")
        .attr("class", "slider")
        .attr("transform", `translate(${margin.left}, ${height / 2})`);

   
    slider.append("line")
        .attr("class", "track")
        .attr("x1", x.range()[0])
        .attr("x2", x.range()[1])
        .attr("stroke", "#ccc")
        .attr("stroke-width", 10)
        .attr("stroke-linecap", "round");

  
    const handle = slider.append("circle")
        .attr("class", "handle")
        .attr("r", 8)
        .attr("fill", "#666");

    
    const label = slider.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", -15)
        .text("Day 14");

    const debouncedLoad = debounce(loadAndPlotHourly, 100);
    const drag = d3.drag()
        .on("start drag", (event) => {
            const pos = x.invert(event.x); // ← no margin subtraction
            const clamped = Math.max(0, Math.min(maxDay, pos));
            const dayNum = Math.round(clamped);
            handle.attr("cx", x(dayNum));
            label.attr("x", x(dayNum)).text(`Day ${dayNum + 1}`);
            debouncedLoad(dayNum);
        });

    slider.call(drag);

  
    handle.attr("cx", x(13));
    label.attr("x", x(13));
}
createSlider();
loadAndPlotHourly(13);
