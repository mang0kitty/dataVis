function getData() {
  return fetch("/nightingale-data.xlsx", {})
    .then(res => res.arrayBuffer())
    .then(data => XLSX.read(new Uint8Array(data), { type: "array" }))
    .then(file => file.Sheets.Sheet1)
    .then(sheet => XLSX.utils.sheet_to_json(sheet, { header: 1 }))
    .then(sheet => {
      return sheet.slice(2).map(row => ({
        month: row[0],
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

function updateChart(data) {
  // TODO: Insert your D3 rendering
}

getData().then(data => updateChart(data));
