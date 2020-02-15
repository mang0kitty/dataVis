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
function drawMovementCanvas() {
  return d3
    .select("body")
    .append("svg:svg")
    .attr("viewBox", "22 -58 16 6")
    .attr("class", "movementCanvas");
}

function drawTemperatureCanvas() {
  const canvas = d3
    .select("body")
    .append("svg:svg")
    .attr("viewBox", [0, -40, 30, 20])
    .attr("class", "tempCanvas");

  return canvas;
}
function drawTemperature(data, canvas) {
  const temperatureLayer = canvas.append("svg:g");
  //set the ranges
  const timeScale = d3
    .scaleTime()
    .domain([new Date(1812, 12, 5), new Date(1813, 11, 1)])
    .range([0, 700]);
  const tenpScale = d3
    .scaleLinear()
    .domain([-40, 10])
    .range(0, 40);

  const valuesLine = d3
    .line()
    .x(d => d.day)
    .y(d => d.temp)
    .attr("class", "temp-line");
}

function renderGraph(data) {
  const movementCanvas = drawMovementCanvas();
  const temperatureCanvas = drawTemperatureCanvas();
  const troopLinesLayer = drawLine(data.movements, movementCanvas);
  troopLinesLayer.selectAll("line.advance-line").raise();
  const cityText = drawCityText(data.cities, movementCanvas);
  const survivorsLayer = drawSurvivorCount(data.movements, movementCanvas);
  const temperatureLayer = drawTemperature(
    data.temperatures,
    temperatureCanvas
  );
}
function loadData() {
  return fetch("data.json").then(response => response.json());
}

loadData().then(json => renderGraph(json));
