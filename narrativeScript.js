const margin = { top: 120, right: 80, bottom: 50, left: 60 };
const width = 1200 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Append title container
d3.select("body").insert("h1", "#filter-container").attr("id", "scene-title").style("text-align", "center");

// Function to update the scene title
const updateTitle = (scene) => {
  const title = d3.select("#scene-title");
  if (scene === "intro") {
    title.text("Chicago Crime Visualization from 2019 to 2023");
  } 
  if (scene === "line") {
    title.text("Crime Trends Over Time");
  } 
  if (scene === "scatterplot") {
    title.text("Crime Rate vs Income by Community");
  } 
  if (scene === "heatmap") {
    title.text("Crime Heatmap by Community Area");
  } 
  if (scene === "bar") {
    title.text("Crime Counts by Type");
  }
};

const lineSvg = d3.select("#chart")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const mapSvg = d3.select("#map")
  .append("svg")
    .attr("width", 960)
    .attr("height", 520);

const barSvg = d3.select("#barChart")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const scatterSvg = d3.select("#scatterplot")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const tooltip = d3.select(".tooltip");

let currentScene = 0; // 0 for introduction, 1 for line graph, 2 for scatterplot, 3 for heatmap, 4 for bar chart
const scenes = ["intro", "line", "scatterplot", "heatmap", "bar"];
let viewByYear = true; // Track the view state

// Function to show an element
const showElement = (selector) => d3.select(selector).style("display", "block");

// Function to hide an element
const hideElement = (selector) => d3.select(selector).style("display", "none");

// Function to set an element's display to inline
const inlineElement = (selector) => d3.select(selector).style("display", "inline");

// Function to update the line chart
const updateLineChart = (data, populationData, crimeType) => {
  console.log("Updating line chart");

  // Filter data by selected crime type
  let filteredData = data;
  if (crimeType !== "all") {
    filteredData = data.filter(d => d["Primary Type"] === crimeType);
  }

  console.log("Filtered Data:", filteredData);  // Debugging log

  // Ensure populationData is an array
  if (!Array.isArray(populationData)) {
    console.error("Population data is not an array", populationData);
    return;
  }

  // Calculate total population
  const totalPopulation = populationData.reduce((sum, d) => sum + (+d.Population || 0), 0);
  console.log("Total Population:", totalPopulation);  // Debugging log

  // Aggregate data and calculate crime rate
  const aggregateData = d3.rollups(filteredData, v => {
    // Calculate total crime rate
    const crimeRate = totalPopulation ? (v.length / totalPopulation * 100000) : 0;
    console.log("Date:", v[0]["Date"], "Crime Count:", v.length, "Crime Rate:", crimeRate);  // Debugging log
    return crimeRate;
  }, d => {
    const date = new Date(d["Date"]);
    return viewByYear ? date.getFullYear() : `${date.getFullYear()}-${date.getMonth() + 1}`;
  }).map(([time, crimeRate]) => ({
    time: viewByYear ? new Date(time, 0, 1) : new Date(time.split("-")[0], time.split("-")[1] - 1, 1),
    crimeRate
  })).sort((a, b) => a.time - b.time);

  console.log("Aggregate Data:", aggregateData);  // Debugging log

  const x = d3.scaleTime()
    .domain(d3.extent(aggregateData, d => d.time))
    .range([0, width]);

  const minCrimeRate = d3.min(aggregateData, d => d.crimeRate);
  const maxCrimeRate = d3.max(aggregateData, d => d.crimeRate);

  console.log("Min Crime Rate:", minCrimeRate, "Max Crime Rate:", maxCrimeRate);  // Debugging log

  const y = d3.scaleLinear()
    .domain([minCrimeRate - (minCrimeRate * 0.05), maxCrimeRate])
    .nice()
    .range([height, 0]);

  lineSvg.selectAll("*").remove();

  lineSvg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(d3.timeYear).tickFormat(d3.timeFormat("%Y"))) // Display years on the x-axis
    .append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("fill", "#000")
      .text("Year");

  lineSvg.append("g")
    .call(d3.axisLeft(y))
    .append("text")
      .attr("x", -height / 2)
      .attr("y", -50)
      .attr("fill", "#000")
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .text("Crime Rate per 100,000 People");

  const line = d3.line()
    .x(d => x(d.time))
    .y(d => y(d.crimeRate));

  lineSvg.append("path")
    .datum(aggregateData)
    .attr("fill", "none")
    .attr("stroke", "steelblue")
    .attr("stroke-width", 1.5)
    .attr("d", line)
    .attr("stroke-dasharray", function() { return this.getTotalLength(); })
    .attr("stroke-dashoffset", function() { return this.getTotalLength(); })
    .transition()
    .duration(2000)
    .ease(d3.easeLinear)
    .attr("stroke-dashoffset", 0);

  lineSvg.selectAll("circle")
    .data(aggregateData)
    .join("circle")
      .attr("cx", d => x(d.time))
      .attr("cy", d => y(d.crimeRate))
      .attr("r", 5)
      .attr("fill", "steelblue")
      .on("mouseover", (event, d) => {
        tooltip.style("display", "block")
        .html(`Time: ${viewByYear ? d3.timeFormat("%Y")(d.time) : d3.timeFormat("%Y-%m")(d.time)}<br>Crime Rate: ${d.crimeRate.toFixed(2)}`);
      })
      .on("mousemove", event => {
        tooltip.style("top", (event.pageY + 5) + "px")
          .style("left", (event.pageX + 5) + "px");
      })
      .on("mouseout", () => {
        tooltip.style("display", "none");
      })
      .attr("opacity", 0)
      .transition()
      .duration(2000)
      .delay((d, i) => i * 25)
      .attr("opacity", 1);

  // Calculate the y position of the annotation based on the data
  const lockdownData = aggregateData.find(d => d.time.getFullYear() === 2020);
  const lockdownY2020 = lockdownData ? y(lockdownData.crimeRate) : 0;
  const lockdownEndData = aggregateData.find(d => d.time.getFullYear() === 2022);
  const lockdownY2022 = lockdownEndData ? y(lockdownEndData.crimeRate) : 0;

  console.log("Lockdown Y 2020:", lockdownY2020, "Lockdown Y 2022:", lockdownY2022);  // Debugging log

  // Define the annotations
  let annotations = [];  // create an empty list

  if (viewByYear) {
    if (crimeType === "all") {
      annotations = [
        {
          note: {
            label: "Total crime rates dropped significantly during the lockdown period.",
            title: "2020 Quarantine Lockdown:"
          },
          x: x(new Date(2020, 0, 0)),
          y: lockdownY2020,
          dy: -100,
          dx: 0,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineType: "vertical",
            lineWidth: 2
          }
        },
        {
          note: {
            label: "Total crime rates increased significantly after restrictions were lifted.",
            title: "2022 End of Quarantine:"
          },
          x: x(new Date(2022, 0, 0)),
          y: lockdownY2022,
          dy: -100,
          dx: 0,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineType: "vertical",
            lineWidth: 2
          }
        }
      ];
    } else {
      annotations = [
        {
          note: {
            label: "",
            title: "2020: Quarantine Begins"
          },
          x: x(new Date(2020, 0, 0)),
          y: lockdownY2020,
          dy: -80,
          dx: 0,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineType: "vertical",
            lineWidth: 2
          }
        },
        {
          note: {
            label: "",
            title: "2022: End of Quarantine"
          },
          x: x(new Date(2022, 0, 0)),
          y: lockdownY2022,
          dy: -100,
          dx: 0,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineType: "vertical",
            lineWidth: 2
          }
        }
      ];
    }
  } else {
    if (crimeType === "all") {
      annotations = [
        {
          note: {
            label: "First confirmed COVID-19 case in Illinois",
            title: ""
          },
          x: x(new Date(2020, 0, 0)),
          y: y(aggregateData.find(d => d.time.getFullYear() === 2020 && d.time.getMonth() === 0).crimeRate),
          dy: 100,
          dx: -70,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineType: "vertical",
            lineWidth: 2
          }
        },
        {
          note: {
            label: "Illinois issues a statewide Quarantine order",
            title: ""
          },
          x: x(new Date(2020, 2, 0)),
          y: y(aggregateData.find(d => d.time.getFullYear() === 2020 && d.time.getMonth() === 2).crimeRate),
          dy: -300,
          dx: -40,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineType: "vertical",
            lineWidth: 2
          }        
        },
        {
          note: {
            label: "Chicago begins a phased reopening. Crime rates begin to rise again.",
            title: ""
          },
          x: x(new Date(2020, 5, 0)),
          y: y(aggregateData.find(d => d.time.getFullYear() === 2020 && d.time.getMonth() === 5).crimeRate),
          dy: -100,
          dx: 0,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineType: "vertical",
            lineWidth: 2
          }
        },
        // Additional annotations for month view
        {
          note: {
            label: "Chicago imposes new restrictions. COVID-19 cases surge",
            title: ""
          },
          x: x(new Date(2020, 8, 0)), // Example date
          y: y(aggregateData.find(d => d.time.getFullYear() === 2020 && d.time.getMonth() === 8).crimeRate),
          dy: 50,
          dx: -10,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineWidth: 2
          }
        },
        {
          note: {
            label: "COVID-19 vaccinations begin in Chicago",
            title: ""
          },
          x: x(new Date(2021, 0, 0)), // Example date
          y: y(aggregateData.find(d => d.time.getFullYear() === 2021 && d.time.getMonth() === 0).crimeRate),
          dy: -100,
          dx: 20,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineWidth: 2
          }
        },
        {
          note: {
            label: "Illinois lifts most COVID-19 restrictions as vaccination rates increase.",
            title: ""
          },
          x: x(new Date(2021, 4, 0)), // Example date
          y: y(aggregateData.find(d => d.time.getFullYear() === 2021 && d.time.getMonth() === 4).crimeRate),
          dy: -230,
          dx: 60,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineWidth: 2
          }
        },
        {
          note: {
            label: "Omicron variant leads to reinstated quarantine",
            title: ""
          },
          x: x(new Date(2021, 11, 0)), // Example date
          y: y(aggregateData.find(d => d.time.getFullYear() === 2021 && d.time.getMonth() === 11).crimeRate),
          dy: -100,
          dx: 40,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineWidth: 2
          }        
        },
        {
          note: {
            label: "Chicago lifts remaining COVID-19 restrictions",
            title: ""
          },
          x: x(new Date(2022, 2, 0)), // Example date
          y: y(aggregateData.find(d => d.time.getFullYear() === 2022 && d.time.getMonth() === 2).crimeRate),
          dy: 90,
          dx: 40,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineWidth: 2
          }        
        },
        {
          note: {
            label: "City officials launch a spring vaccination campaign to encourage booster shots",
            title: ""
          },
          x: x(new Date(2023, 3, 0)), // Example date
          y: y(aggregateData.find(d => d.time.getFullYear() === 2023 && d.time.getMonth() === 3).crimeRate),
          dy: 80,
          dx: 110,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineWidth: 2
          }
        },
        {
          note: {
            label: "Emergence of more contagious subvariants of Omicron, specifically the BQ.1 and BQ.1.1",
            title: ""
          },
          x: x(new Date(2022, 9, 0)), // Example date
          y: y(aggregateData.find(d => d.time.getFullYear() === 2022 && d.time.getMonth() === 9).crimeRate),
          dy: -50,
          dx: -50,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineWidth: 2
          }        
        },
        {
          note: {
            label: "Post-Christmas surge in COVID-19 cases",
            title: ""
          },
          x: x(new Date(2023, 0, 0)), // Example date
          y: y(aggregateData.find(d => d.time.getFullYear() === 2023 && d.time.getMonth() === 0).crimeRate),
          dy: 120,
          dx: -10,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineWidth: 2
          }        
        },
        {
          note: {
            label: "Chicago reports steady COVID-19 case numbers and high vaccination rates.",
            title: ""
          },
          x: x(new Date(2023, 4, 0)), // Example date
          y: y(aggregateData.find(d => d.time.getFullYear() === 2023 && d.time.getMonth() === 4).crimeRate),
          dy: -80,
          dx: -10,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineWidth: 2
          }        
        }
      ];

    } else {
      annotations = [
        {
          note: {
            label: "",
            title: "2020: Quarantine Begins"
          },
          x: x(new Date(2020, 0, 0)),
          y: lockdownY2020,
          dy: -200,
          dx: 0,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineType: "vertical",
            lineWidth: 2
          }
        },
        {
          note: {
            label: "",
            title: "2022: End of Quarantine"
          },
          x: x(new Date(2022, 0, 0)),
          y: lockdownY2022,
          dy: -200,
          dx: 0,
          color: ["black"],
          subject: {
            radius: 5,
            radiusPadding: 5
          },
          connector: {
            end: "arrow",
            type: "line",
            lineType: "vertical",
            lineWidth: 2
          }
        }
      ];
    }
  }

  const makeAnnotations = d3.annotation()
    .annotations(annotations)
    .type(d3.annotationLabel);

  lineSvg.selectAll(".annotation-group").remove();
  lineSvg.append("g")
    .attr("class", "annotation-group")
    .call(makeAnnotations);

  console.log("lockdownY2020: ", lockdownY2020);
  console.log("lockdownY2022: ", lockdownY2022);

};

// Function to update the scatter plot
const updateScatterPlot = (crimeData, incomeData, populationData, crimeType, year) => {
  console.log("Updating scatter plot");

  // Filter data by crime type and year
  let filteredData = crimeData;
  if (crimeType !== "all") {
    filteredData = crimeData.filter(d => d["Primary Type"] === crimeType);
  }
  if (year !== "all") {
    filteredData = filteredData.filter(d => new Date(d["Date"]).getFullYear() == year);
  }

  // Aggregate crime counts by community area
  const crimeCounts = d3.rollups(filteredData, v => v.length, d => d["Community Area"].toString())
    .map(([area, count]) => ({ area, count }));

  console.log("Crime Counts:", crimeCounts);  // Debugging log

  // Map population data by community number
  const populationMap = new Map(populationData.map(d => [d["Community Number"].toString(), +d.Population]));
  console.log("Population Map:", Array.from(populationMap));  // Debugging log

  // Calculate crime rates
  const crimeRates = crimeCounts.map(({ area, count }) => {
    const population = populationMap.get(area) || 0;
    const rate = population ? (count / population * 100000) : 0;
    return { area, rate };
  });

  console.log("Crime Rates:", crimeRates);  // Debugging log

  // Map income data by community number
  const incomeMap = new Map(incomeData.map(d => [d["Community Number"].toString(), { income: +d["Median Household Income"], name: d["Community Name"] }]));
  console.log("Income Map:", Array.from(incomeMap));  // Debugging log

  // Combine crime rates and income data
  const scatterData = crimeRates.map(({ area, rate }) => {
    const incomeData = incomeMap.get(area);
    return {
      area,
      rate,
      income: incomeData ? incomeData.income : NaN,
      name: incomeData ? incomeData.name : "Unknown"
    };
  }).filter(d => !isNaN(d.income));

  console.log("Scatter Data:", scatterData);  // Debugging log

  // Sort data by income for ordered plotting
  scatterData.sort((a, b) => a.income - b.income);

  // Define scales
  const x = d3.scaleLinear()
    .domain(d3.extent(scatterData, d => d.income))
    .range([0, width])
    .nice();

  const y = d3.scaleLinear()
    .domain([0, d3.max(scatterData, d => d.rate)])
    .range([height, 0])
    .nice();

  scatterSvg.selectAll("*").remove();

  // Add axes
  scatterSvg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .append("text")
      .attr("x", width / 2)
      .attr("y", 40)
      .attr("fill", "#000")
      .text("Median Household Income");

  scatterSvg.append("g")
    .call(d3.axisLeft(y))
    .append("text")
      .attr("x", -height / 2)
      .attr("y", -50)
      .attr("fill", "#000")
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .text("Crime Rate per 100,000 People");

  // Add points with transitions
  const points = scatterSvg.append("g")
    .selectAll("circle")
    .data(scatterData, d => d.area);

  points.enter().append("circle")
      .attr("cx", d => x(d.income))
      .attr("cy", d => y(d.rate))
      .attr("r", 0) // Start with radius 0
      .attr("fill", d => {if (d.income < 40000) return "red";
        else if (d.income >= 40000 && d.income <= 90000) return "blue";
        else return "green";
      })
      .on("mouseover", (event, d) => {
        tooltip.style("display", "block")
          .html(`Community: ${d.name}<br>Income: $${d.income}<br>Crime Rate: ${d.rate.toFixed(2)} per 100,000`);
      })
      .on("mousemove", event => {
        tooltip.style("top", (event.pageY + 5) + "px")
          .style("left", (event.pageX + 5) + "px");
        })
        .on("mouseout", () => {
          tooltip.style("display", "none");
        })
        .transition()
        .duration(0)
        .delay((d, i) => i * 30) // Delay based on index for ordered plotting
        .attr("r", 5); // Only animate the radius
  
    points.transition()
        .duration(0)
        .delay((d, i) => i * 10)
        .attr("cx", d => x(d.income))
        .attr("cy", d => y(d.rate))
        .attr("r", 5);
  
    points.exit()
        .transition()
        .duration(200)
        .attr("r", 0)
        .remove();

  // Add dashed lines for income thresholds
  const incomeThresholds = [40000, 90000];
  incomeThresholds.forEach(threshold => {
    scatterSvg.append("line")
      .attr("x1", x(threshold))
      .attr("x2", x(threshold))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "black")
      .attr("stroke-dasharray", "4 4")
      .attr("stroke-width", 1.5);
  });

  // Add legend
  const legend = scatterSvg.append("g")
    .attr("transform", `translate(${width - 150}, ${20})`);

  const legendData = [
    { color: "red", label: "Less than $40k" },
    { color: "blue", label: "$40k to $90k" },
    { color: "green", label: "Greater than $90k" },
  ];

  legend.selectAll("rect")
    .data(legendData)
    .enter().append("rect")
      .attr("x", 0)
      .attr("y", (d, i) => i * 20)
      .attr("width", 18)
      .attr("height", 18)
      .style("fill", d => d.color);

  legend.selectAll("text")
    .data(legendData)
    .enter().append("text")
      .attr("x", 24)
      .attr("y", (d, i) => i * 20 + 9)
      .attr("dy", ".35em")
      .text(d => d.label);
};

// Function to update the heatmap
const updateHeatmap = (crimeData, geoData, populationData, incomeData, year, crimeType, incomeLevel) => {
  console.log("Updating heatmap");

  // Filter data by year if specified
  let filteredData = crimeData;
  if (year !== "all") {
    filteredData = crimeData.filter(d => new Date(d["Date"]).getFullYear() == year);
  }
  if (crimeType !== "all") {
    filteredData = filteredData.filter(d => d["Primary Type"] === crimeType);
  }

  // Map income data by community number
  const incomeMap = new Map(incomeData.map(d => [d["Community Number"].toString(), +d["Median Household Income"]]));
  console.log("Income Map:", Array.from(incomeMap));  // Debugging log

  // Filter data by income level if specified
  if (incomeLevel !== "all") {
    filteredData = filteredData.filter(d => {
      const income = incomeMap.get(d["Community Area"]);
      if (incomeLevel === "low") {
        return income < 40000;
      } else if (incomeLevel === "medium") {
        return income >= 40000 && income <= 90000;
      } else if (incomeLevel === "high") {
        return income > 90000;
      }
    });
  }

  // Aggregate crime counts by community area
  const crimeCounts = d3.rollups(filteredData, v => v.length, d => d["Community Area"].toString())
    .map(([area, count]) => ({ area, count }));

  console.log("Crime Counts:", crimeCounts);  // Debugging log

  // Map population data by community number
  const populationMap = new Map(populationData.map(d => [d["Community Number"].toString(), +d.Population]));
  console.log("Population Map:", Array.from(populationMap));  // Debugging log

  // Calculate crime rates
  const crimeRates = crimeCounts.map(({ area, count }) => {
    const population = populationMap.get(area) || 0;
    const rate = population ? (count / population * 100000) : 0;
    return { area, rate };
  });

  // Find the maximum crime rate for color scale
  const maxCrimeRate = d3.max(crimeRates, d => d.rate);

  // Update color scale based on income level
  let colorScale;
  if (incomeLevel === "low") {
    colorScale = d3.scaleSequential(d3.interpolateReds).domain([0, maxCrimeRate]);
  } else if (incomeLevel === "medium") {
    colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, maxCrimeRate]);
  } else if (incomeLevel === "high") {
    colorScale = d3.scaleSequential(d3.interpolateGreens).domain([0, maxCrimeRate]);
  } else {
    colorScale = d3.scaleSequential(d3.interpolatePurples).domain([0, maxCrimeRate]); // colour purple if "all"
  }

  mapSvg.selectAll("*").remove();

  // Draw the map
  mapSvg.append("g")
    .selectAll("path")
    .data(geoData.features)
    .join("path")
      .attr("d", d3.geoPath().projection(d3.geoAlbers()
        .center([0, 41.88])
        .rotate([87.63, 0])
        .parallels([40, 45])
        .scale(70000)
        .translate([width / 2, height / 2])))
      .attr("fill", d => {
        const area = d.properties.area_numbe.toString();
        const rate = crimeRates.find(c => c.area === area)?.rate || 0;
        console.log(`Area: ${area}, Rate: ${rate}`);  // Debugging log
        return colorScale(rate);
      })
      .attr("stroke", "#000")
      .on("mouseover", (event, d) => {
        const area = d.properties.area_numbe.toString();
        const rate = crimeRates.find(c => c.area === area)?.rate || 0;
        const income = incomeMap.get(area) || "N/A";
        tooltip.style("display", "block")
          .html(`Community Area: ${d.properties.community}<br>Crime Rate: ${rate.toFixed(2)} per 100,000<br>Income: $${income}`);
      })
      .on("mousemove", event => {
        tooltip.style("top", (event.pageY + 5) + "px")
          .style("left", (event.pageX + 5) + "px");
      })
      .on("mouseout", () => {
        tooltip.style("display", "none");
      });
};

// Define the location categories
const locationCategories = {
  "Residential": [
      "RESIDENCE",
      "APARTMENT",
      "RESIDENCE - PORCH / HALLWAY",
      "RESIDENCE PORCH/HALLWAY",
      "RESIDENCE - YARD (FRONT / BACK)",
      "RESIDENTIAL YARD (FRONT/BACK)",
      "RESIDENCE - GARAGE",
      "RESIDENCE-GARAGE"
  ],
  "Business": [
      "SMALL RETAIL STORE",
      "RESTAURANT",
      "DEPARTMENT STORE",
      "GROCERY FOOD STORE",
      "COMMERCIAL / BUSINESS OFFICE",
      "CONVENIENCE STORE",
      "BAR OR TAVERN",
      "HOTEL / MOTEL",
      "DRUG STORE"
  ],
  "Public": [
      "STREET",
      "SIDEWALK",
      "ALLEY",
      "PARKING LOT / GARAGE (NON RESIDENTIAL)",
      "PARKING LOT/GARAGE(NON.RESID.)",
      "VEHICLE NON-COMMERCIAL",
      "GAS STATION",
      "PARK PROPERTY",
      "SCHOOL - PUBLIC BUILDING",
      "SCHOOL - PUBLIC GROUNDS",
      "SCHOOL, PUBLIC, BUILDING",
      "CTA TRAIN"
  ]
};

// Function to map a location description to a category
const getLocationCategory = (location) => {
  for (const [category, locations] of Object.entries(locationCategories)) {
    if (locations.includes(location)) {
      return category;
    }
  }
  return "other"; // Default category if not found
};

// Function to update the bar chart
const updateBarChart = (data, year) => {
  console.log("Updating bar chart");

  // Filter data by year if specified
  let filteredData = data;
  if (year !== "all") {
    filteredData = data.filter(d => new Date(d["Date"]).getFullYear() == year);
  }

  // Aggregate crime counts by location category
  const crimeCounts = d3.rollups(filteredData, v => v.length, d => getLocationCategory(d["Location Description"]))
    .map(([type, count]) => ({ type, count }))
    .filter(d => d.type !== "other" && d.type.trim() !== "") // Exclude "other" and blank location descriptions
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // Keep only the top 20

  const x = d3.scaleLinear()
    .domain([0, d3.max(crimeCounts, d => d.count)])
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(crimeCounts.map(d => d.type))
    .range([0, height])
    .padding(0.1);

  const bars = barSvg.selectAll("rect")
    .data(crimeCounts, d => d.type);

  // Enter new bars
  bars.enter()
    .append("rect")
    .attr("x", 0)
    .attr("y", d => y(d.type))
    .attr("height", y.bandwidth())
    .attr("fill", d => {
      if (d.type === "Residential") return "#ff1493";
      if (d.type === "Business") return "steelblue";
      if (d.type === "Public") return "orange";
      return "gray"; // Default color for other categories
    })
    .attr("width", d => x(d.count)) // Set initial width to the current value
    .on("mouseover", (event, d) => {
      tooltip.style("display", "block")
        .html(`Category: ${d.type}<br>Count: ${d.count}`);
    })
    .on("mousemove", event => {
      tooltip.style("top", (event.pageY + 5) + "px")
        .style("left", (event.pageX + 5) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("display", "none");
    })
    .transition()
    .duration(1000)
    .attr("width", d => x(d.count));

  // Update existing bars
  bars.transition()
    .duration(1000)
    .attr("width", d => x(d.count))
    .attr("y", d => y(d.type))
    .attr("fill", d => {
      if (d.type === "Residential") return "#ff1493"; 
      if (d.type === "Business") return "steelblue"; 
      if (d.type === "Public") return "orange"; 
      return "gray"; // Default color for other categories
    });

  // Add mouseover event listeners to existing bars
  bars.on("mouseover", (event, d) => {
    tooltip.style("display", "block")
      .html(`Category: ${d.type}<br>Count: ${d.count}`);
  })
  .on("mousemove", event => {
    tooltip.style("top", (event.pageY + 5) + "px")
      .style("left", (event.pageX + 5) + "px");
  })
  .on("mouseout", () => {
    tooltip.style("display", "none");
  });

  // Remove old bars
  bars.exit()
    .transition()
    .duration(1000)
    .attr("width", 0)
    .remove();

  barSvg.selectAll("g.axis").remove();

  barSvg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y));

  barSvg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5));
};

// Function to switch scenes
const switchScene = (scene, data, geoData, populationData, incomeData) => {
  console.log(`Switching to ${scene} scene`);
  updateTitle(scene);

  // Hide all elements initially
  hideElement("#chart");
  hideElement("#map");
  hideElement("#barChart");
  hideElement("#scatterplot");
  hideElement("#lineCrimeType");
  hideElement("#scatterCrimeType");
  hideElement("#scatterYearFilter");
  hideElement("#heatmapYearFilter");
  hideElement("#barYearFilter");
  hideElement("#heatmapCrimeType");
  hideElement("#incomeFilter");
  hideElement("#filter-label");
  hideElement("#toggleView");
  hideElement("#line-text");
  hideElement("#scatter-text");
  hideElement("#heatmap-text");
  hideElement("#bar-text");

  // Show or hide the previous button based on the current scene
  if (scene === "intro") {
    prevButton.style("display", "none");
  } else {
    prevButton.style("display", "inline-block");
  }

  // Show or hide the next button based on the current scene
  if (scene === "bar") {
    nextButton.style("display", "none");
  } else {
    nextButton.style("display", "inline-block");
  }

  if (scene === "intro") {
    // No specific elements to show for intro
  } else if (scene === "line") {
    showElement("#chart");
    showElement("#line-text");
    inlineElement("#lineCrimeType");
    inlineElement("#filter-label").text("Select Crime Type:");
    inlineElement("#toggleView").text(viewByYear ? "Switch to Monthly View" : "Switch to Yearly View");
    updateLineChart(data, populationData, d3.select("#lineCrimeType").node().value);
  } else if (scene === "scatterplot") {
    showElement("#scatterplot");
    showElement("#scatter-text");
    inlineElement("#scatterCrimeType");
    inlineElement("#scatterYearFilter");
    inlineElement("#filter-label").text("Select Crime Type:");
    updateScatterPlot(data, incomeData, populationData, d3.select("#scatterCrimeType").node().value, d3.select("#scatterYearFilter").node().value);
  } else if (scene === "heatmap") {
    showElement("#map");
    showElement("#heatmap-text");
    inlineElement("#heatmapYearFilter");
    inlineElement("#heatmapCrimeType");
    inlineElement("#incomeFilter");
    inlineElement("#filter-label").text("Select Year:");
    updateHeatmap(data, geoData, populationData, incomeData, d3.select("#heatmapYearFilter").node().value, d3.select("#heatmapCrimeType").node().value, d3.select("#incomeFilter").node().value);
  } else if (scene === "bar") {
    showElement("#barChart");
    showElement("#bar-text");
    inlineElement("#barYearFilter");
    inlineElement("#filter-label").text("Select Year:");
    updateBarChart(data, d3.select("#barYearFilter").node().value);
  }
};

// Show loading message
const loadingMessage = d3.select("#loading-message");

// Hide navigation buttons initially
const prevButton = d3.select("#prev").style("display", "none");
const nextButton = d3.select("#next").style("display", "none");
const toggleViewButton = d3.select("#toggleView").style("display", "none");

Promise.all([
  d3.csv("https://media.githubusercontent.com/media/TigerGahalaut/TigerGahalaut.github.io/main/Chicago_Crimes_2019_to_2023_UPDATED.csv"),
  d3.json("Boundaries - Community Areas (current).geojson"),
  d3.csv("Chicago Population 2020.csv"),
  d3.csv("Rounded_Median_Household_Income_DataFrame.csv")
]).then(([crimeData, geoData, populationData, incomeData]) => {
  console.log("Data loaded");
  console.log("Crime Data:", crimeData);  // Debugging log
  console.log("Geo Data:", geoData);      // Debugging log
  console.log("Population Data:", populationData);  // Debugging log
  console.log("Income Data:", incomeData);  // Debugging log

  // Hide loading message
  loadingMessage.style("display", "none");
  // Show navigation buttons after data is loaded
  prevButton.style("display", "inline-block");
  nextButton.style("display", "inline-block");
  toggleViewButton.style("display", "inline-block");

  // Standardize the community area identifiers in the crime data
  crimeData.forEach(d => {
    if (d["Community Area"] !== undefined) {
      d["Community Area"] = d["Community Area"].toString();
    }
    
    if (d["Primary Type"] === "CRIM SEXUAL ASSAULT" || d["Primary Type"] === "CRIMINAL SEXUAL ASSAULT") {
      d["Primary Type"] = "SEXUAL ASSAULT";
    }
    
    if (d["Primary Type"] !== undefined) {
      d["Primary Type"] = d["Primary Type"].trim(); // Ensure no extra spaces
    }
  });

  // Log unique crime types to debug the issue with "ARSON"
  const uniqueCrimeTypes = Array.from(new Set(crimeData.map(d => d["Primary Type"])));
  console.log("Unique Crime Types:", uniqueCrimeTypes);

  // Sort crime types and log them
  const crimeTypes = uniqueCrimeTypes.sort();
  console.log("Sorted Crime Types:", crimeTypes);

  const lineCrimeTypeSelect = d3.select("#lineCrimeType");
  const scatterCrimeTypeSelect = d3.select("#scatterCrimeType");
  const heatmapCrimeTypeSelect = d3.select("#heatmapCrimeType");

  lineCrimeTypeSelect.selectAll("option").remove(); // Clear existing options
  scatterCrimeTypeSelect.selectAll("option").remove(); // Clear existing options
  heatmapCrimeTypeSelect.selectAll("option").remove(); // Clear existing options

  lineCrimeTypeSelect.append("option")
    .attr("value", "all")
    .text("All Crimes");

  scatterCrimeTypeSelect.append("option")
    .attr("value", "all")
    .text("All Crimes");

  heatmapCrimeTypeSelect.append("option")
    .attr("value", "all")
    .text("All Crimes");

  crimeTypes.forEach(crimeType => {
    lineCrimeTypeSelect.append("option")
      .attr("value", crimeType)
      .text(crimeType);

    scatterCrimeTypeSelect.append("option")
      .attr("value", crimeType)
      .text(crimeType);

    heatmapCrimeTypeSelect.append("option")
      .attr("value", crimeType)
      .text(crimeType);
  });

  // Extract years from the crime data and ensure 2019 is included
  const years = Array.from(new Set(crimeData.map(d => new Date(d["Date"]).getFullYear())))
    .concat([2019])  // Ensure 2019 is included
    .sort((a, b) => a - b);

  const scatterYearFilterSelect = d3.select("#scatterYearFilter");
  const heatmapYearFilterSelect = d3.select("#heatmapYearFilter");
  const barYearFilterSelect = d3.select("#barYearFilter");

  scatterYearFilterSelect.selectAll("option")
    .data(years)
    .enter()
    .append("option")
      .attr("value", d => d)
      .text(d => d);

  heatmapYearFilterSelect.selectAll("option")
    .data(years)
    .enter()
    .append("option")
      .attr("value", d => d)
      .text(d => d);

  barYearFilterSelect.selectAll("option")
    .data(years)
    .enter()
    .append("option")
      .attr("value", d => d)
      .text(d => d);

  // Initial chart update
  updateTitle("intro");
  switchScene("intro");

  // Event listener for the line graph crime type dropdown menu
  lineCrimeTypeSelect.on("change", function() {
    const selectedCrimeType = this.value;
    updateLineChart(crimeData, populationData, selectedCrimeType);
  });

  // Event listener for the scatterplot crime type dropdown menu
  scatterCrimeTypeSelect.on("change", function() {
    const selectedCrimeType = this.value;
    updateScatterPlot(crimeData, incomeData, populationData, selectedCrimeType, scatterYearFilterSelect.node().value);
  });

  // Event listener for the scatterplot year filter dropdown menu
  scatterYearFilterSelect.on("change", function() {
    const selectedYear = this.value;
    updateScatterPlot(crimeData, incomeData, populationData, scatterCrimeTypeSelect.node().value, selectedYear);
  });

  // Event listener for the heatmap year filter dropdown menu
  heatmapYearFilterSelect.on("change", function() {
    const selectedYear = this.value;
    updateHeatmap(crimeData, geoData, populationData, incomeData, selectedYear, heatmapCrimeTypeSelect.node().value, d3.select("#incomeFilter").node().value);
  });

  // Event listener for the heatmap crime type dropdown menu
  heatmapCrimeTypeSelect.on("change", function() {
    const selectedCrimeType = this.value;
    updateHeatmap(crimeData, geoData, populationData, incomeData, heatmapYearFilterSelect.node().value, selectedCrimeType, d3.select("#incomeFilter").node().value);
  });

  // Event listener for the income filter dropdown menu
  d3.select("#incomeFilter").on("change", function() {
    const selectedIncomeLevel = this.value;
    updateHeatmap(crimeData, geoData, populationData, incomeData, heatmapYearFilterSelect.node().value, heatmapCrimeTypeSelect.node().value, selectedIncomeLevel);
  });

  // Event listener for the bar year filter dropdown menu
  barYearFilterSelect.on("change", function() {
    const selectedYear = this.value;
    updateBarChart(crimeData, selectedYear);
  });

  // Navigation buttons to switch scenes
  d3.select("#prev").on("click", () => {
    currentScene = (currentScene - 1 + scenes.length) % scenes.length;
    switchScene(scenes[currentScene], crimeData, geoData, populationData, incomeData);
  });

  d3.select("#next").on("click", () => {
    currentScene = (currentScene + 1) % scenes.length;
    switchScene(scenes[currentScene], crimeData, geoData, populationData, incomeData);
  });

  // Toggle view button to switch between year and month views in line chart
  d3.select("#toggleView").on("click", () => {
    viewByYear = !viewByYear;
    d3.select("#toggleView").text(viewByYear ? "Switch to Monthly View" : "Switch to Yearly View");
    updateLineChart(crimeData, populationData, lineCrimeTypeSelect.node().value);
  });

}).catch(error => {
  console.error("Error loading the data:", error);
});
