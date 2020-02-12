function getData() {
  return fetch("/nightingale-data.xlsx", {})
    .then(res => res.arrayBuffer())
    .then(data => XLSX.read(new Uint8Array(data), { type: "array" }))
    .then(file => file.Sheets.Sheet1)
    .then(sheet => XLSX.utils.sheet_to_json(sheet, { header: 1 }))
    .then(sheet => {
      return sheet.slice(2).map(row => ({
        month: months[row[0].split(" ")[0]],
        year: parseInt(row[0].split(" ")[1], 10),

        armySize: parseInt(row[1], 10),
        deaths: {
          zyoticDiseases: parseInt(row[2], 10),
          woundsInjuries: parseInt(row[3], 10),
          other: parseInt(row[4], 10)
        },
        rateOfMortality: {
          zyoticDiseases: parseFloat(row[5]),
          woundsInjuries: parseFloat(row[6]),
          other: parseFloat(row[7])
        }
      }));
    });
}

function scaleData(data) {
  return data.map(d => ({
    month: d.month,
    diseasesScaled: (d.deaths.zyoticDiseases * 12000) / d.armySize,
    woundsInjuriesScaled: (d.deaths.woundsInjuries * 12000) / d.armySize,
    otherScaled: (d.deaths.other * 12000) / d.armySize
  }));
}

function getMaxValue(data) {
  var maxValue = data
    .map(d =>
      Object.values(d)
        .filter(v => typeof v == "number")
        .reduce(function(a, b) {
          return Math.max(a, b);
        })
    )
    .reduce(function(a, b) {
      return Math.max(a, b);
    });
  var maxRadius = Math.sqrt((maxValue * 12) / Math.PI);
  return { maxValue: maxValue, maxRadius: maxRadius };
}

function divideData(data) {
  return [data.slice(0, data.length / 2), data.slice(data.length / 2)];
}
months = {
  Jan: "January",
  Feb: "February",
  Mar: "March",
  Apr: "April",
  May: "May",
  Jun: "June",
  Jul: "July",
  Aug: "August",
  Sep: "September",
  Oct: "October",
  Nov: "November",
  Dec: "December"
};

var labels = ["disease", "wounds", "other"];

getData()
  .then(data => {
    console.log(data);
    return data;
  })
  .then(data => divideData(data))
  .then(datasets => {
    const maxMortalityRate = Math.max(
      ...datasets.map(scaleData).map(getMaxMortalityRate)
    );

    renderChart("#chart_old", datasets[0], maxMortalityRate, 1);
    renderChart("#chart_new", datasets[1], maxMortalityRate, 0.25);
  });

function calculateArcRadius(scaledValue) {
  return Math.sqrt((scaledValue * 12) / Math.PI);
}

function getMaxMortalityRate(scaledDataset) {
  return Math.max(
    ...scaledDataset.map(d =>
      Math.max(d.diseasesScaled, d.woundsInjuriesScaled, d.otherScaled)
    )
  );
}

function renderChart(
  target,
  dataset,
  maxMortalityRate = 0,
  chartWidthRatio = 1
) {
  const scaledData = scaleData(dataset);

  const bounds = document
    .getElementById(target.substring(1))
    .getBoundingClientRect();

  const chartMaxMortalityRate = getMaxMortalityRate(scaledData);
  maxMortalityRate = maxMortalityRate || chartMaxMortalityRate;

  const radiusScale = d3
    .scaleLinear()
    .domain([0, maxMortalityRate])
    .range([
      0,
      Math.min(bounds.height, bounds.width) /
        (Math.min(bounds.height, bounds.width) / bounds.width) /
        chartWidthRatio /
        2
    ]);

  const angleScale = d3
    .scaleLinear()
    .domain([0, 12])
    .range([1.5 * Math.PI, 3.5 * Math.PI]);

  const arc = d3
    .arc()
    .innerRadius(0)
    .outerRadius(d => {
      return radiusScale(d.value);
    })
    .startAngle(d => angleScale(d.index))
    .endAngle(d => angleScale(d.index + 1));

  const chart = d3
    .select(target)
    .append("svg:svg")
    .attr("width", bounds.width)
    .attr("height", bounds.height)
    .attr("class", "chart");

  const graph = chart
    .append("svg:g")
    .attr("class", "chart-graph")
    .attr("transform", `translate(${bounds.width / 2}, ${bounds.height / 2})`);

  const wedgeGroups = graph
    .selectAll(".chart-wedge")
    .data(scaledData)
    .enter()
    .append("svg:g")
    .attr("class", "chart-wedge");

  wedgeGroups
    .selectAll(".label-path")
    .data((d, i) => [
      {
        index: i,
        value: Math.max(
          d.diseasesScaled,
          d.woundsInjuriesScaled,
          d.otherScaled,
          150
        )
      }
    ])
    .enter()
    .append("svg:path")
    .attr("class", "label-path")
    .attr("id", d => `${target.substring(1)}-month-label-${d.index}`)
    .attr("d", arc)
    .attr("fill", "none")
    .attr("stroke", "none");

  wedgeGroups
    .selectAll(".label")
    .data((d, i) => [
      {
        index: i,
        label: d.month
      }
    ])
    .enter()
    .append("svg:text")
    .attr("class", "label")
    .attr("text-anchor", "start")
    .attr("x", 5)
    .attr("dy", "-.71em")
    .attr("text-align", "center")
    .append("textPath")
    .attr("xlink:href", d => `${target}-month-label-${d.index}`)
    .text(d => d.label);

  const wedges = wedgeGroups
    .selectAll(".chart-wedgearc")
    .data((d, i) =>
      [
        {
          index: i,
          month: d.month,
          value: d.diseasesScaled,
          label: "diseases"
        },
        {
          index: i,
          month: d.month,
          value: d.woundsInjuriesScaled,
          label: "wounds"
        },
        {
          index: i,
          month: d.month,
          value: d.otherScaled,
          label: "other"
        }
      ].sort((a, b) => b.value - a.value)
    )
    .enter()
    .append("svg:path")
    .attr("class", d => `chart-wedgearc chart-wedge__${d.label}`)
    .attr("d", arc);

  wedges.append("svg:title").text(d => `${d.label}: ${d.value}`);

  const graphBBox = graph.node().getBBox();
  graph.attr(
    "transform",
    `translate(${(bounds.width - graphBBox.width) / 2 -
      graphBBox.x}, ${-graphBBox.y})`
  );
}
