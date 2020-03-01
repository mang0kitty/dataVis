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

  static fromLatLng({ lat, lng }) {
    return new Vector(lng, lat);
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
   * Subtracts a vector from this vector, returning a new vector result.
   * @param {Vector} v Another vector
   * @returns {Vector}
   */
  subtract(v) {
    return new Vector(this.x - v.x, this.y - v.y);
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
    if (!this.y) return new Vector(0, 1);
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

function latScale(lat, lng = null) {
  const scale = new NonLinearScale();

  scale
    .domain([54, 56])
    .range([30, 0])
    .scaleFactorDomain([23, 39])
    .scaleFactorRange([0.4, 1])
    .scaleOffsetRange([15, 0]);

  return scale.scale(lat, lng);
}

const lngScale = d3
  .scaleLinear()
  .domain([23, 39])
  .range([0, 100]);

const temperatureScale = d3
  .scaleLinear()
  .domain([0, -30])
  .range([35, 41]);

function widthScale(survivors, lng = null) {
  const scale = new NonLinearScale();

  scale
    .domain([0, 422000])
    .range([0.02, 0.7])
    .scaleFactorDomain([23, 39])
    .scaleFactorRange([1, 0.6]);

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

function getMergedMovement(data, movement, force = false) {
  if (!force && movement.merge === false) return movement;

  const maxDistance = 0.4;
  const movementVector = Vector.fromLatLng(movement);
  const nearbyMovements = data
    .filter(m => m.direction === movement.direction)
    .filter(
      m =>
        m.lng === movement.lng &&
        Vector.fromLatLng(m).subtract(movementVector).length <= maxDistance
    );
  nearbyMovements.sort(
    (a, b) =>
      Vector.fromLatLng(a).subtract(movementVector).length -
      Vector.fromLatLng(b).subtract(movementVector).length
  );

  const countedDivisions = new Set();
  const countedMovements = nearbyMovements.filter(m => {
    if (countedDivisions.has(m.division)) return false;
    countedDivisions.add(m.division);
    return true;
  });

  // Put the largest division in position 0
  countedMovements.sort((a, b) => b.survivors - a.survivors);

  return {
    lng: countedMovements[0].lng,
    lat: countedMovements[0].lat,
    division: -1, // a merged division
    direction: movement.direction,
    survivors: countedMovements
      .map(m => m.survivors)
      .reduce((sum, s) => sum + s, 0)
  };
}

function getMovementPolygon(data, division, direction) {
  const movements = data.filter(m => m.division === division);

  // 1. Setup our polygon points array
  const topPoints = [];
  const bottomPoints = [];

  movements.forEach((movement, i) => {
    // If our current movement is in the wrong direction, then don't render it
    if (movement.direction !== direction) {
      return;
    }

    // 2. Move forward over the top of the polygon (line of movement)
    //    and add these points to the array.

    // 3. Move backward over the bottom of the polygon (line of movement)
    //    and add these points to the array.

    const nextMovement = getNextMovement(movements, movement, i);
    if (nextMovement === movement) {
      return;
    }

    const mergedStart = getMergedMovement(data, movement);
    const mergedEnd = getMergedMovement(data, nextMovement, true);

    const startPoint = Vector.fromLatLng(mergedStart);
    const endPoint = Vector.fromLatLng(mergedEnd);
    const movementVector = endPoint.subtract(startPoint);

    let perpendicular = movementVector.perpendicular.unit;
    // Ensure that our perpendicular always points upwards
    if (perpendicular.y < 0) perpendicular = perpendicular.scale(-1);

    const width = widthScale(mergedStart.survivors, mergedStart.lng);
    const widthVector = perpendicular.scale(width / 2);

    const topLeft = startPoint.add(widthVector);
    const topRight = endPoint.add(widthVector);
    const bottomLeft = startPoint.add(widthVector.scale(-1));
    const bottomRight = endPoint.add(widthVector.scale(-1));

    topPoints.push(topLeft, topRight);
    bottomPoints.unshift(bottomRight, bottomLeft);
  });

  // 4. Convert the points into our polygon points format
  const points = [
    Vector.fromLatLng(movements.find(m => m.direction === direction)),
    ...topPoints,
    ...bottomPoints
  ];

  return points
    .map(p => `${lngScale(p.x).toFixed(4)},${latScale(p.y, p.x).toFixed(4)}`)
    .join(" ");
}

function drawLine(data, canvas) {
  const linesLayer = canvas.append("svg:g");

  // linesLayer
  //   .selectAll("line")
  //   .data(data)
  //   .enter()
  //   .append("svg:line")
  //   .attr("x1", d => lngScale(d.lng))
  //   .attr("y1", (d, i) =>
  //     latScale(d.lat, d.lng, getPreviousMovement(data, d, i).direction)
  //   )
  //   .attr("x2", (d, i) => lngScale(getNextMovement(data, d, i).lng))
  //   .attr("y2", (d, i) =>
  //     latScale(
  //       getNextMovement(data, d, i).lat,
  //       getNextMovement(data, d, i).lng,
  //       d.direction
  //     )
  //   )
  //   .attr("raw-data", d => JSON.stringify(d))
  //   .attr("class", d => (d.direction == "A" ? "advance-line" : "retreat-line"))
  //   .attr("stroke-width", d => widthScale(d.survivors, d.lng));

  linesLayer
    .selectAll("polygon")
    .data([
      { division: 1, direction: "R" },
      { division: 2, direction: "R" },
      { division: 3, direction: "R" },
      { division: 1, direction: "A" },
      { division: 2, direction: "A" },
      { division: 3, direction: "A" }
    ])
    .enter()
    .append("svg:polygon")
    .attr("points", d => getMovementPolygon(data, d.division, d.direction))
    .attr("raw-data", d => JSON.stringify(d))
    .attr("class", d => (d.direction == "A" ? "advance-line" : "retreat-line"));

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

  return linesLayer;
}

function drawSurvivorCount(data, canvas) {
  const survivorsLayer = canvas.append("svg:g").attr("id", "survivors-count");
  formatComma = d3.format(",");

  survivorsLayer
    .selectAll("path")
    .data(data)
    .enter()
    .append("svg:path")
    .attr("id", (d, i) => `division-${d.division}-${d.direction}-${i}`)
    .attr("fill", "none")
    .attr("stroke", "none")
    .attr("d", (movement, i) => {
      const nextMovement = getNextMovement(data, movement, i);
      if (nextMovement === movement) {
        return;
      }

      const mergedStart = getMergedMovement(data, movement);
      const mergedEnd = getMergedMovement(data, nextMovement);

      const startPoint = Vector.fromLatLng(mergedStart);
      const endPoint = Vector.fromLatLng(mergedEnd);
      const movementVector = endPoint.subtract(startPoint);

      let perpendicular = movementVector.perpendicular.unit;
      // Ensure that our perpendicular always points upwards
      if (perpendicular.y < 0) perpendicular = perpendicular.scale(-1);

      const width = widthScale(mergedStart.survivors * 1.5, mergedStart.lng);
      const widthVector = perpendicular
        .scale(width / 2)
        .scale(movement.labelOffsetScale || 1);

      const centerVector = startPoint.add(
        movementVector.scale(movement.labelCenterScale || 0.5)
      );
      const textVector = centerVector.add(
        perpendicular.scale(movement.labelOffsetScale || 1).scale(4)
      );

      const instructions = [
        `M${lngScale(centerVector.add(widthVector).x).toFixed(3)},${latScale(
          centerVector.add(widthVector).y,
          centerVector.add(widthVector).x
        ).toFixed(3)}`,
        `L${lngScale(textVector.x).toFixed(3)},${latScale(
          textVector.y,
          textVector.x
        ).toFixed(3)}`
      ];

      return instructions.join(" ");
    });

  survivorsLayer
    .selectAll("text")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "survivor-count")
    .append("textPath")
    .attr("href", (d, i) => `#division-${d.division}-${d.direction}-${i}`)
    .text(d =>
      d.label === false ? "" : formatComma(getMergedMovement(data, d).survivors)
    );

  return survivorsLayer;
}

function drawCityText(data, canvas) {
  const citiesLayer = canvas.append("svg:g");

  citiesLayer
    .selectAll("text")
    .data(data)
    .enter()
    .append("text")
    .attr("x", d => lngScale(d.lng + (d.lngOffset || 0)))
    .attr("y", d =>
      latScale(d.lat + (d.latOffset || 0), d.lng + (d.lngOffset || 0))
    )
    .attr("class", "city-text")
    .style("font-size", d => d.font)
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

  temperatureLayer
    .selectAll("line.temperature-line-shadow")
    .data(data)
    .enter()
    .append("svg:line")
    .attr("x1", d => lngScale(d.lng))
    .attr("y1", d => temperatureScale(d.temp))
    .attr("x2", (d, i) => lngScale((data[i + 1] || d).lng))
    .attr("y2", (d, i) => temperatureScale((data[i + 1] || d).temp))
    .attr("class", "temperature-line-shadow");

  temperatureLayer
    .selectAll("line.temperature-line")
    .data(data)
    .enter()
    .append("svg:line")
    .attr("x1", d => lngScale(d.lng))
    .attr("y1", d => temperatureScale(d.temp))
    .attr("x2", (d, i) => lngScale((data[i + 1] || d).lng))
    .attr("y2", (d, i) => temperatureScale((data[i + 1] || d).temp))
    .attr("class", "temperature-line");

  temperatureLayer
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
    .attr("y2", d => latScale(getRetreatLatitute(retreatData, d.lng), d.lng))
    .attr("class", "temperature-connector-line");
}
function drawTempHorizontalLine(canvas) {
  const tempHorizontalLine = canvas.append("svg:g");

  tempHorizontalLine
    .selectAll("line")
    .data([0, -10, -20, -30])
    .enter()
    .append("svg:line")
    .attr("x1", d => (d != 0 ? lngScale(26.7) : lngScale(0)))
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
      typeof d[0] == "number" ? temperatureScale(d[0]) : temperatureScale(5)
    )
    .attr("class", "thermometer-text")
    .text(
      d => `${leftPad(d[0], 6)}  ${leftPad(d[1], 6)}   ${leftPad(d[2], 6)}`
    );
}
function getRetreatLatitute(data, lng) {
  const left = data.find(x => x.lng <= lng);
  const right = data
    .slice()
    .reverse()
    .find(x => x.lng >= lng);

  const mergedLeft = getMergedMovement(data, left);
  const mergedRight = getMergedMovement(data, right);

  const dlng = mergedLeft.lng - mergedRight.lng;
  if (!dlng) {
    console.log("found temp location at", mergedLeft);
    return left.lat;
  }

  console.log(
    "interpolating temp location for",
    lng,
    "between",
    mergedLeft,
    mergedRight
  );

  const dlat = mergedLeft.lat - mergedRight.lat;
  const gradient = dlat / dlng;

  return gradient * (lng - mergedRight.lng) + mergedRight.lat;
}
function drawMainTitle(canvas) {
  const text = [
    {
      fontSize: "1.4px",
      x: 7,
      dy: 1.5,
      text: "Figurative Map"
    },
    {
      fontSize: "1px",
      x: 15,
      dy: 0,
      text: "of the successive losses of men in the"
    },
    {
      fontSize: "1.4px",
      x: 29.5,
      dy: 0,
      text: "French Army"
    },
    {
      fontSize: "1px",
      x: 36.5,
      dy: 0,
      text: "in the"
    },
    {
      fontSize: "1.4px",
      x: 39,
      dy: 0,
      text: "Russian Campaign 1812 - 1813"
    },
    {
      fontSize: "1.2px",
      x: 15,
      dy: 1.5,
      text: "Drawn by M."
    },
    {
      fontSize: "1.5px",
      x: 21.3,
      dy: 0,
      text: "Minard, "
    },
    {
      fontSize: "1.2px",
      x: 26,
      dy: 0,
      text: "Inspector General of Bridges and Roads (retired)."
    },
    {
      fontSize: "1.px",
      x: 49,
      dy: 0.5,
      text: "Paris, November 20, 1869."
    },
    {
      fontSize: "1px",
      x: 7,
      dy: 1.5,
      text:
        "The numbers of men present are represented by the widths of the colored zones at a rate of one millimeter for every ten thousand men; they are further written"
    },
    {
      fontSize: "1px",
      x: 6.3,
      dy: 1.5,
      text:
        "across the zones. The red designates the men who enter Russia, the black those who leave it. — The information which has served to draw up the map has been"
    },
    {
      fontSize: "1px",
      x: 7,
      dy: 1.5,
      text:
        "extracted from the works of M. M. Thiers, de Ségur, de Fezensac, de Chambray and the unpublished diary of Jacob, the pharmacist of the Army since"
    },
    {
      fontSize: "1px",
      x: 6.2,
      dy: 1.5,
      text:
        "October 28th. In order to better judge with the eye the diminution of the army, I have assumed that the troops of Prince Jérôme and of Marshal Davout, who had"
    },
    {
      fontSize: "1px",
      x: 14.9,
      dy: 1.5,
      text:
        "been detached at Minsk and Mogilev and have rejoined near Orsha and Vitebsk, had always marched with the army."
    }
  ];

  const titleText = canvas.append("svg:text").attr("class", "title-text");
  titleText
    .selectAll("tspan")
    .data(text)
    .enter()
    .append("svg:tspan")
    .attr("x", d => d.x)
    .attr("dy", d => d.dy)
    .style("font-size", d => d.fontSize)
    .text(d => d.text);
}
function drawTemperatureTitle(canvas) {
  const text = [
    {
      fontSize: "1.1px",
      x: 20,
      dy: 33.5,
      text: "GRAPHIC TABLE",
      font: "Georgia, Times New Roman, Times, serif",
      style: "italic"
    },
    {
      fontSize: "1.1px",
      x: 29,
      dy: 0,
      text: "of the temperature in degrees below zero of the ",
      font: "Playball",
      style: "normal"
    },
    {
      fontSize: "1.3px",
      x: 48.5,
      dy: 0,
      text: "Réaumur",
      style: "italic"
    },
    {
      fontSize: "1.1px",
      x: 53.5,
      dy: 0,
      text: "thermometer",
      font: "Playball",
      style: "normal"
    }
  ];
  const tempTitleText = canvas
    .append("svg:text")
    .attr("class", "temperature-title-text");
  tempTitleText
    .selectAll("tspan")
    .data(text)
    .enter()
    .append("svg:tspan")
    .attr("x", d => d.x)
    .attr("dy", d => d.dy)
    .style("font-family", d => d.font)
    .style("font-size", d => d.fontSize)
    .style("font-style", d => d.style)
    .text(d => d.text);
}
function drawCanvasSeperatorLines(canvas) {
  const canvasSeperatorLineLayer = canvas.append("svg:g");
  canvasSeperatorLineLayer
    .append("line")
    .attr("class", "canvas-seperator-line")
    .attr("x1", 0)
    .attr("y1", 32)
    .attr("x2", 100)
    .attr("y2", 32);

  canvasSeperatorLineLayer
    .append("line")
    .attr("x1", 0)
    .attr("y1", 32.15)
    .attr("x2", 100)
    .attr("y2", 32.15)
    .attr("class", "canvas-seperator-line");

  canvasSeperatorLineLayer
    .append("line")
    .attr("x1", 25.2)
    .attr("y1", 3.7)
    .attr("x2", 40)
    .attr("y2", 3.7)
    .attr("class", "title-format-line");
}

function leftPad(number, length) {
  number = `${number}`;
  while (number.length < length) number = ` ${number}`;

  return number;
}

function renderGraph(data) {
  const canvas = drawCanvas();
  drawMainTitle(canvas);
  drawTemperatureTitle(canvas);
  drawTemperature(data.temperatures, canvas);
  drawTemperatureLines(data, canvas);
  drawTempHorizontalLine(canvas);
  drawThermometer(canvas);

  const troopLinesLayer = drawLine(data.movements, canvas);
  troopLinesLayer.selectAll("line.advance-line").raise();
  drawCityText(data.cities, canvas);
  drawSurvivorCount(data.movements, canvas);

  drawCanvasSeperatorLines(canvas);
}
function loadData() {
  return fetch("data.json").then(response => response.json());
}

loadData().then(json => renderGraph(json));
