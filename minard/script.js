// const latScale = d3
//   .scaleLinear()
//   .domain([56, 54])
//   .range([0, 30]);

class NonLinearScale {
  constructor() {
    this._domain = [0, 1];
    this._range = [0, 1];
    this._scaleFactorDomain = [0, 1];
    this._scaleFactorRange = [1, 1];
    this._scaleOffsetRange = [0, 0];
  }

  scale(input, factor = null) {
    if (factor === null)
      return this.scaleWith(input, this._domain, this._range);

    return (
      this.scaleWith(input, this._domain, this._range) *
        this.scaleWith(
          factor,
          this._scaleFactorDomain,
          this._scaleFactorRange
        ) +
      this.scaleWith(factor, this._scaleFactorDomain, this._scaleOffsetRange)
    );
  }

  scaleWith(input, domain = [0, 1], range = [0, 1]) {
    const domainDelta = domain[1] - domain[0];
    const rangeDelta = range[1] - range[0];

    return ((input - domain[0]) / domainDelta) * rangeDelta + range[0];
  }

  domain(domain) {
    this._domain = domain;

    return this;
  }

  range(range) {
    this._range = range;

    return this;
  }

  scaleFactorDomain(scaleFactorDomain) {
    this._scaleFactorDomain = scaleFactorDomain;

    return this;
  }

  scaleFactorRange(scaleFactorRange) {
    this._scaleFactorRange = scaleFactorRange;

    return this;
  }

  scaleOffsetRange(scaleOffsetRange) {
    this._scaleOffsetRange = scaleOffsetRange;

    return this;
  }
}

class Vector {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * Adds another vector to this vector, returning a new vector result.
   * @param {Vector} v Another vector
   * @returns {Vector}
   */
  add(v) {
    return new Vector(this.x + v.x, this.y + v.y);
  }

  /**
   * Scales this vector by a constant, returning a new vector
   * @param {Number} c A scaling constant
   * @returns {Vector}
   */
  scale(c) {
    return new Vector(this.x * c, this.y * c);
  }

  /**
   * Calculates the dot-product of two vectors
   * @param {Vector} v Another vector
   * @returns {Number}
   */
  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  /**
   * Calculates the angle between this vector and another vector in radians.
   * @param {Vector} v Another vector.
   * @returns {Number}
   */
  angle(v) {
    return Math.acos(this.dot(v) / (this.length * v.length));
  }

  /**
   * Gets the unit vector representing the direction in which this vector travels
   * @returns {Vector}
   */
  get unit() {
    const c = 1 / this.length;
    return this.scale(c);
  }

  /**
   * Calculates a perpendicular vector and returns it.
   * @returns {Vector}
   */
  get perpendicular() {
    return new Vector(1, -this.x / this.y).unit;
  }

  /**
   * Calculates the length of this vector
   * @returns {Number}
   */
  get length() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
  }

  /**
   * @returns {String}
   */
  toString() {
    return `${this.x},${this.y}`;
  }
}

function latScale(lat, lng = null, direction = "A") {
  const scale = new NonLinearScale();

  scale
    .domain([54, 56])
    .range([30, 0])
    .scaleFactorDomain([23, 39])
    .scaleFactorRange([0.4, 1])
    .scaleOffsetRange([15, 0]);

  if (direction === "R") scale.scaleOffsetRange([18.5, 0]);

  return scale.scale(lat, lng);
}

const lngScale = d3
  .scaleLinear()
  .domain([23, 39])
  .range([0, 100]);

const temperatureScale = d3
  .scaleLinear()
  .domain([0, -30])
  .range([30, 37]);

function widthScale(survivors, lng = null) {
  const scale = new NonLinearScale();

  scale
    .domain([0, 422000])
    .range([0, 7])
    .scaleFactorDomain([23, 39])
    .scaleFactorRange([0.9, 1]);

  return scale.scale(survivors, lng);
}

function getPreviousMovement(data, d, i) {
  if (!data[i - 1]) return d;
  if (data[i - 1].division !== d.division) return d;
  return data[i - 1];
}

function getNextMovement(data, d, i) {
  if (!data[i + 1]) return d;
  if (data[i + 1].division !== d.division) return d;
  return data[i + 1];
}

/**
 * @param {Number} i
 * @returns {Vector}
 */
function getMovementVector(data, d, i) {
  if (!data[i - 1]) return new Vector(0, 0);
  if (data[i - 1].division !== d.division) return new Vector(0, 0);

  return new Vector(d.lng - data[i - 1].lng, d.lat - data[i - 1].lat);
}

function drawLine(data, canvas) {
  const linesLayer = canvas.append("svg:g");

  linesLayer
    .selectAll("line")
    .data(data)
    .enter()
    .append("svg:line")
    .attr("x1", d => lngScale(d.lng))
    .attr("y1", (d, i) =>
      latScale(d.lat, d.lng, getPreviousMovement(data, d, i).direction)
    )
    .attr("x2", (d, i) => lngScale(getNextMovement(data, d, i).lng))
    .attr("y2", (d, i) =>
      latScale(
        getNextMovement(data, d, i).lat,
        getNextMovement(data, d, i).lng,
        d.direction
      )
    )
    .attr("raw-data", d => JSON.stringify(d))
    .attr("class", d => (d.direction == "A" ? "advance-line" : "retreat-line"))
    .attr("stroke-width", d => widthScale(d.survivors, d.lng));

  // const debugLayer = linesLayer.append("svg:g");

  // debugLayer
  //   .selectAll("line.debug")
  //   .data(data.slice(0, 8))
  //   .enter()
  //   .append("line")
  //   .attr("class", "debug")
  //   .attr("x1", (d, i) =>
  //     lngScale(
  //       getMovementVector(data, d, i).perpendicular.add(
  //         new Vector(d.lng, d.lat)
  //       ).x
  //     )
  //   )
  //   .attr("y1", (d, i) =>
  //     latScale(
  //       getMovementVector(data, d, i).perpendicular.add(
  //         new Vector(d.lng, d.lat)
  //       ).y,
  //       d.lng,
  //       d.direction
  //     )
  //   )
  //   .attr("x2", d => lngScale(d.lng))
  //   .attr("y2", d => latScale(d.lat, d.lng, d.direction))
  //   .attr("stroke-width", "0.5px")
  //   .attr("stroke", "magenta");

  linesLayer
    .selectAll("polygon")
    .data(data)
    .enter()
    .append("polygon")
    .attr("raw-data", d => JSON.stringify(d))
    //.attr("class", d => (d.direction == "A" ? "advance-line" : "retreat-line"))
    .attr("stroke-width", 0)
    .attr("fill", "cyan")
    .attr("v-before", (d, i) => getMovementVector(data, d, i).toString())
    .attr("v-after", (d, i) => {
      const nextMovement = getNextMovement(data, d, i);
      if (d === nextMovement) return "";
      const nextMovementVector = getMovementVector(data, nextMovement, i + 1);
      return nextMovementVector.toString();
    })
    .attr("angle-between", (d, i) => {
      const movementVector = getMovementVector(data, d, i);
      const nextMovement = getNextMovement(data, d, i);
      if (d === nextMovement) return "";
      const nextMovementVector = getMovementVector(data, nextMovement, i + 1);

      return (movementVector.angle(nextMovementVector) * 180) / Math.PI;
    })
    .attr("points", (d, i) => {
      const movementVector = getMovementVector(data, d, i);
      const nextMovement = getNextMovement(data, d, i);
      if (d === nextMovement) return "";
      const nextMovementVector = getMovementVector(data, nextMovement, i + 1);

      const pcenter = new Vector(d.lng, d.lat);
      const pend = pcenter.add(movementVector.perpendicular.scale(0.3));
      const pstart = pcenter.add(nextMovementVector.perpendicular.scale(0.3));

      return [
        `${lngScale(pcenter.x)},${latScale(pcenter.y, pcenter.x, d.direction)}`,
        `${lngScale(pend.x)},${latScale(pend.y, pcenter.x, d.direction)}`,
        `${lngScale(pstart.x)},${latScale(
          pstart.y,
          pcenter.x,
          nextMovement.direction
        )}`
      ].join(" ");
    });

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
    .attr("x", d => lngScale(d.lng))
    .attr("y", d => latScale(d.lat, d.lng))
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
    .attr("x", d => lngScale(d.lng))
    .attr("y", d => latScale(d.lat, d.lng))
    .attr("class", "city-text")
    .text(d => d.name);

  return citiesLayer;
}

function drawCanvas() {
  return d3
    .select("body")
    .append("svg:svg")
    .attr("viewBox", "0 0 100 45")
    .attr("class", "movementCanvas");
}
function drawTemperature(data, canvas) {
  const temperatureLayer = canvas.append("svg:g");

  const line = temperatureLayer
    .selectAll("line")
    .data(data)
    .enter()
    .append("svg:line")
    .attr("x1", d => lngScale(d.lng))
    .attr("y1", d => temperatureScale(d.temp))
    .attr("x2", (d, i) => lngScale((data[i + 1] || d).lng))
    .attr("y2", (d, i) => temperatureScale((data[i + 1] || d).temp))
    .attr("class", "temperature-line");

  const text = temperatureLayer
    .selectAll("text.temp-text")
    .data(data)
    .enter()
    .append("svg:text")
    .attr("class", "temp-text")
    .attr("x", d => lngScale(d.lng))
    .attr("y", d => temperatureScale(d.temp) + 0.8)
    .text(d =>
      d.month != undefined ? `${d.temp}° ${d.month} ${d.day}` : `${d.temp}°`
    );

  return temperatureLayer;
}

function drawTemperatureLines(data, canvas) {
  const temperatureData = data.temperatures.filter(
    x => !(x.month === "Oct" && x.day === 24)
  );
  const retreatData = data.movements.filter(x => x.direction === "R");

  const temperatureLineLayer = canvas
    .append("svg:g")
    .attr("class", "temperature-lines");

  temperatureLineLayer
    .selectAll("line")
    .data(temperatureData)
    .enter()
    .append("svg:line")
    .attr("x1", d => lngScale(d.lng))
    .attr("y1", d => temperatureScale(d.temp))
    .attr("x2", d => lngScale(d.lng))
    .attr("y2", d =>
      latScale(getRetreatLatitute(retreatData, d.lng), d.lng, "R")
    )
    .attr("class", "temperature-connector-line");
}
function drawTempHorizontalLine(canvas) {
  const tempHorizontalLine = canvas.append("svg:g");

  tempHorizontalLine
    .selectAll("line")
    .data([0, -10, -20, -30])
    .enter()
    .append("svg:line")
    .attr("x1", d => lngScale(26.7))
    .attr("y1", d => temperatureScale(d))
    .attr("x2", d => lngScale(37.6))
    .attr("y2", d => temperatureScale(d))
    .attr("class", "temperature-horizontal-line");
}

function drawThermometer(canvas) {
  const thermometerLayer = canvas.append("svg:g");

  thermometerLayer
    .selectAll("text")
    .data([
      ["°R", "°C", "°F"],
      [0, 0, 32],
      [-10, -13, 10],
      [-20, -25, -13],
      [-30, -38, -36]
    ])
    .enter()
    .append("text")
    .attr("x", lngScale(37.75))
    .attr("y", d =>
      typeof d[0] == "number" ? temperatureScale(d[0]) : temperatureScale(3)
    )
    .attr("class", "thermometer-text")
    .text(d => `${d[0]} ${d[1]}  ${d[2]}`);

  // const thermonometerText = thermometerLayer.insert(
  //   "text",
  //   ".thermometer-text"
  // );
  // thermonometerText
  //   .selectAll("text")
  //   .data([["°R", "°C", "°F"]])
  //   .enter()
  //   .append("text")
  //   .attr("x", lngScale(37.75))
  //   .attr("y", temperatureScale(2))
  //   .attr("class", "thermometer-unit-text")
  //   .text(d => `${d[0]} ${d[1]}  ${d[2]}`);
}
function getRetreatLatitute(data, lng) {
  const left = data.find(x => x.lng <= lng);
  const right = data
    .slice()
    .reverse()
    .find(x => x.lng >= lng);

  const dlng = left.lng - right.lng;
  if (!dlng) {
    return left.lat;
  }

  const dlat = right.lat - left.lat;
  const gradient = dlat / dlng;

  return gradient * (lng - right.lng) + right.lat;
}

function renderGraph(data) {
  const canvas = drawCanvas();
  const troopLinesLayer = drawLine(data.movements, canvas);
  troopLinesLayer.selectAll("line.advance-line").raise();
  drawCityText(data.cities, canvas);
  drawSurvivorCount(data.movements, canvas);
  drawTemperature(data.temperatures, canvas);
  drawTemperatureLines(data, canvas);
  drawTempHorizontalLine(canvas);
  drawThermometer(canvas);
}
function loadData() {
  return fetch("data.json").then(response => response.json());
}

loadData().then(json => renderGraph(json));
