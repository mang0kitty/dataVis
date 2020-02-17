function drawLine(data, canvas) {
  const widthScale = 0.0000025;
  const linesLayer = canvas.append("svg:g");

  linesLayer
    .selectAll("line")
    .data(data)
    .enter()
    .append("svg:line")
    .attr("x1", d => d.lng)
    .attr("y1", d => -d.lat)
    .attr("x2", (d, i) => (data[i + 1] || d).lng)
    .attr("y2", (d, i) => -(data[i + 1] || d).lat)
    .attr("class", d => (d.direction == "A" ? "advance-line" : "retreat-line"))
    .attr("stroke-width", d => d.survivors * widthScale);

  return linesLayer;
}
function drawSurvivorCount(data, canvas) {
  const survivorsLayer = canvas.append("svg:g");
  formatComma = d3.format(",");
  survivorsLayer
    .selectAll("text")
    .data(data)
    .enter()
    .append("text")
    .attr("x", d => d.lng)
    .attr("y", d => -d.lat)
    .attr("class", "survivor-count")
    .text(d => formatComma(d.survivors));

  return survivorsLayer;
}
function drawCityText(data, canvas) {
  const citiesLayer = canvas.append("svg:g");

  citiesLayer
    .selectAll("text")
    .data(data)
    .enter()
    .append("text")
    .attr("x", d => d.lng)
    .attr("y", d => -d.lat)
    .attr("class", "city-text")
    .text(d => d.name);

  return citiesLayer;
}
function drawCanvas() {
  return d3
    .select("body")
    .append("svg:svg")
    .attr("viewBox", "22 -58 17 12")
    .attr("class", "movementCanvas");
}
function drawTemperature(data, canvas) {
  temperatureLayer = canvas.append("svg:g");
  scale = d3
    .scaleLinear()
    .domain([-30, 0])
    .range([-48, -50]);

  const line = temperatureLayer
    .selectAll("line")
    .data(data)
    .enter()
    .append("svg:line")
    .attr("x1", d => d.lng)
    .attr("y1", d => scale(d.temp))
    .attr("x2", (d, i) => (data[i + 1] || d).lng)
    .attr("y2", (d, i) => scale((data[i + 1] || d).temp))
    .attr("class", "temperature-line");

  const text = temperatureLayer
    .selectAll("text.temp-text")
    .data(data)
    .enter()
    .append("svg:text")
    .attr("class", "temp-text")
    .attr("x", d => d.lng)
    .attr("y", d => scale(d.temp))
    .text(d => `${d.temp}`);

  return temperatureLayer;
}
function connectYLines(data, canvas) {
  const connectYLinesLayer = canvas.append("svg:g");
  scale = d3
    .scaleLinear()
    .domain([-30, 0])
    .range([-48, -50]);
  const line = connectYLinesLayer
    .selectAll("line")
    .data(data)
    .enter()
    .append("svg:line")
    .attr("x1", d => d.temperatures.lng)
    .attr("y1", d => scale(d.temperatures.temp))
    .attr("x2", d => d.temperatures.lng)
    .attr("y2", d => d.movements.lat)
    .attr("class", "connectYLine");
  return connectYLinesLayer;
}

function renderGraph(data) {
  const canvas = drawCanvas();

  const troopLinesLayer = drawLine(data.movements, canvas);
  troopLinesLayer.selectAll("line.advance-line").raise();
  const cityText = drawCityText(data.cities, canvas);
  const survivorsLayer = drawSurvivorCount(data.movements, canvas);
  const temperatureLayer = drawTemperature(data.temperatures, canvas);
  const connectYLinesLayer = connectYLines(data, canvas);
}
function loadData() {
  return fetch("data.json").then(response => response.json());
}

loadData().then(json => renderGraph(json));
