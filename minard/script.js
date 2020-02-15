function drawLine(data, canvas) {
  const widthScale = 0.000001;

  const linesLayer = canvas.append("svg:g");

  linesLayer
    .selectAll("line")
    .data(data)
    .enter()
    .append("svg:line")
    .attr("x1", d => d.lon_p)
    .attr("y1", d => -d.lat_p)
    .attr("x2", (d, i) => (data[i + 1] || d).lon_p)
    .attr("y2", (d, i) => -(data[i + 1] || d).lat_p)
    .attr("class", d => (d.direction == "A" ? "advance-line" : "retreat-line"))
    .attr("stroke-width", d => d.surv * widthScale);

  return linesLayer;
}
function drawCityText(data, canvas) {
  const citiesLayer = canvas.append("svg:g");

  citiesLayer
    .selectAll("text")
    .data(data)
    .enter()
    .append("text")
    .attr("x", d => d.lon_city)
    .attr("y", d => -d.lat_city)
    .attr("class", "city-text")
    .text(d => d.city);

  return citiesLayer;
}
function drawCanvas() {
  return d3
    .select("body")
    .append("svg:svg")
    .attr("viewBox", "22 -58 20 6")
    .attr("class", "canvas");
}

function renderGraph(data) {
  const canvas = drawCanvas();
  const troopLinesLayer = drawLine(data.troops, canvas);
  troopLinesLayer.selectAll("line.advance-line").raise();
  const cityText = drawCityText(data.cities, canvas);
}
function loadData() {
  return fetch("data.json").then(response => response.json());
}

loadData().then(json => renderGraph(json));
