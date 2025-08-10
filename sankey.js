async function drawChart() {
  // 1. Access data

  const dataset = await d3.json("education.json");
  //Varialbe genre
  const genreAccessor = (d) => d.genre;
  const genreNames = ["femme", "homme"];
  const genreId = d3.range(genreNames.length);
  //Variable éducation
  const educationAccessor = (d) => d.education;
  const educationNames = [
    "primaire",
    "secondaire",
    "professionnel",
    "collégial",
    "certificat",
    "universitaire",
  ];
  const educationId = d3.range(educationNames.length);
  // Variable Revenu
  const revenuAccessor = (d) => d.revenu;
  const revenuNames = ["faible", "moyen", "élevé"];
  const revenuId = d3.range(revenuNames.length);

  const getStatutKey = ({ genre, revenu }) => [genre, revenu].join("--");
  const stackedProbabilites = {};
  dataset.forEach((startingPoint) => {
    const key = getStatutKey(startingPoint);
    let stackedProbability = 0;
    stackedProbabilites[key] = educationNames.map((education, i) => {
      stackedProbability += startingPoint[education] / 100;
      if (i == educationNames.length - 1) {
        return 1;
      } else {
        return stackedProbability;
      }
    });
    console.log(key, stackedProbabilites[key]);
  });

  // Création d'une 1/10000 personne
  let currentPersonId = 0;
  function generatePersonne(elapsed) {
    currentPersonId++;
    const genre = getRandomValue(genreId);
    const revenu = getRandomValue(revenuId);
    const statusKey = getStatutKey({
      genre: genreNames[genre],
      revenu: revenuNames[revenu],
    });
    const probabilities = stackedProbabilites[statusKey];
    const education = d3.bisect(probabilities, Math.random());

    return {
      genre,
      revenu,
      education,
      startTime: elapsed + getRandomNumberInRange(-0.1, 0.1),
      yJitter: getRandomNumberInRange(-15, 15),
      id: currentPersonId,
    };
  }

  // 2. Create chart dimensions

  const width = d3.min([window.innerWidth * 0.9, 1200]);
  let dimensions = {
    width: width,
    height: 500,
    margin: {
      top: 10,
      right: 200,
      bottom: 10,
      left: 120,
    },
    pathHeight: 50,
    endsBarWidth: 15,
    endingBarPadding: 3,
  };
  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right;
  dimensions.boundedHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

  // 3. Draw canvas

  const wrapper = d3
    .select("#wrapper")
    .append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height);

  const bounds = wrapper
    .append("g")
    .style(
      "transform",
      `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
    );

  // 4. Create scales
  const xScale = d3
    .scaleLinear()
    .domain([0, 1])
    .range([0, dimensions.boundedWidth])
    .clamp(true);

  const startYScale = d3
    .scaleLinear()
    .domain([revenuId.length, -1])
    .range([0, dimensions.boundedHeight]);

  const endYScale = d3
    .scaleLinear()
    .domain([educationId.length, -1])
    .range([0, dimensions.boundedHeight]);

  const yTransitionProgressScale = d3
    .scaleLinear()
    .domain([0.45, 0.55])
    .range([0, 1])
    .clamp(true);

  const colorScale = d3
    .scaleLinear()
    .domain(d3.extent(revenuId))
    .range(["#a6215f", "#F2bf27"])
    .interpolate(d3.interpolateHcl);

  // 5. Draw data
  //Générer les 6 tracées revenu --> education
  const linkLineGenerator = d3
    .line()
    .x((d, i) => i * (dimensions.boundedWidth / 5))
    .y((d, i) => (i <= 2 ? startYScale(d[0]) : endYScale(d[1])))
    .curve(d3.curveMonotoneX);

  const linkOptions = d3.merge(
    revenuId.map((startId) =>
      educationId.map((endId) => new Array(6).fill([startId, endId]))
    )
  );

  const linksGroup = bounds.append("g");
  const links = linksGroup
    .selectAll(".category-path")
    .data(linkOptions)
    .enter()
    .append("path")
    .attr("class", "category-path")
    .attr("d", linkLineGenerator)
    .attr("stroke-width", dimensions.pathHeight);

  // 6. Draw peripherals
  const startingLabelsGroup = bounds
    .append("g")
    .style("transform", "translateX(-20px)");

  const startingBars = startingLabelsGroup
    .selectAll(".start-bar")
    .data(revenuId)
    .enter()
    .append("rect")
    .attr("x", 20)
    .attr("y", (d) => startYScale(d) - dimensions.pathHeight / 2)
    .attr("width", dimensions.endsBarWidth)
    .attr("height", dimensions.pathHeight)
    .attr("fill", colorScale);

  const endingLabelsGroup = bounds
    .append("g")
    .style("transform", `translateX(${dimensions.boundedWidth + 20}px)`);

  const startingLabels = startingLabelsGroup
    .selectAll(".start-label")
    .data(revenuId)
    .enter()
    .append("text")
    .attr("class", "label start-label")
    .attr("y", (d, i) => startYScale(i))
    .text((d, i) => sentenceCase(revenuNames[i]));

  const startLabel = startingLabelsGroup
    .append("text")
    .attr("class", "start-title")
    .attr("y", startYScale(revenuId[revenuId.length - 1]) - 65)
    .text("Niveau économique");

  const startLabelLineTwo = startingLabelsGroup
    .append("text")
    .attr("class", "start-title")
    .attr("y", startYScale(revenuId[revenuId.length - 1]) - 50)
    .text("Revenu");

  const endingLabelGroup = bounds
    .append("g")
    .style("transform", `translateX(${dimensions.boundedWidth + 20}px)`);

  const endingLabels = endingLabelGroup
    .selectAll(".end-label")
    .data(educationNames)
    .enter()
    .append("text")
    .attr("class", "label end-label")
    .attr("y", (d, i) => endYScale(i) - 15)
    .text((d) => d);

  const hommeMarkers = endingLabelGroup
    .selectAll(".homme-marker")
    .data(educationId)
    .enter()
    .append("circle")
    .attr("class", "ending-marker homme-marker")
    .attr("r", 5.5)
    .attr("cx", 5)
    .attr("cy", (d) => endYScale(d) + 5);

  const trianglePoints = ["-7,6", "0,-6", "7,6"].join(" ");

  const femmeMarkers = endingLabelGroup
    .selectAll(".femme-marker")
    .data(educationId)
    .enter()
    .append("polygon")
    .attr("class", "ending-marker femme-marker")
    .attr("points", trianglePoints)
    .attr("transform", (d) => `translate(5, ${endYScale(d) + 20})`);

  //Légendes

  const legendGroup = bounds
    .append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${dimensions.boundedWidth}, 5)`);

  const maleLegend = legendGroup
    .append("g")
    .attr(
      "transform",
      `translate(${
        -dimensions.endsBarWidth * 1.5 + dimensions.endingBarPadding + 1
      }, 0)`
    );
  maleLegend
    .append("polygon")
    .attr("points", trianglePoints)
    .attr("transform", "translate(-7, 0)")
    .attr("fill", "#c9dbe6");
  maleLegend
    .append("text")
    .attr("class", "legend-text-left")
    .text("Homme")
    .attr("x", -20);
  maleLegend
    .append("line")
    .attr("class", "legend-line")
    .attr("x1", -dimensions.endsBarWidth / 2 + 1)
    .attr("x2", -dimensions.endsBarWidth / 2 + 1)
    .attr("y1", 12)
    .attr("y2", 37);

  const femaleLegend = legendGroup
    .append("g")
    .attr("transform", `translate(${-dimensions.endsBarWidth / 2 - 4}, 0)`);
  femaleLegend
    .append("circle")
    .attr("r", 5.5)
    .attr("transform", "translate(5, 0)")
    .attr("fill", "#c9dbe6");
  femaleLegend
    .append("text")
    .attr("class", "legend-text-right")
    .text("Femme")
    .attr("x", 15);
  femaleLegend
    .append("line")
    .attr("class", "legend-line")
    .attr("x1", dimensions.endsBarWidth / 2 - 3)
    .attr("x2", dimensions.endsBarWidth / 2 - 3)
    .attr("y1", 12)
    .attr("y2", 37);

  // 7. Set up interactions
  let personne = [];
  let timer = d3.timer(updateMarkers);
  const markersGroup = bounds.append("g").attr("class", "markers-group");
  const endingBarGroup = bounds
    .append("g")
    .attr("transform", `translate(${dimensions.boundedWidth}, 0)`);

  function updateMarkers(elapsed) {
    const xProgressAccessor = (d) => (elapsed - d.startTime) / 5000;
    if (personne.length < 1000) {
  personne.push(generatePersonne(elapsed));
} else {
    timer.stop(); // <-- Stoppe le timer à 1000 personnes
    return;       // Optionnel : sort la fonction
  }

    const femmes = markersGroup.selectAll(".marker-circle").data(
      personne.filter((d) => xProgressAccessor(d) < 1 && genreAccessor(d) == 0),
      (d) => d.id // <--- la fonction de clé (ici dans les parenthèses du data)
    );

    femmes
      .enter()
      .append("circle")
      .attr("class", "marker marker-circle")
      .attr("r", 5.5)
      .attr("opacity", 0);

    femmes.exit().remove();

    const hommes = markersGroup.selectAll(".marker-triangle").data(
      personne.filter((d) => xProgressAccessor(d) < 1 && genreAccessor(d) == 1),
      (d) => d.id // <--- la fonction de clé (ici dans les parenthèses du data)
    );

    hommes
      .enter()
      .append("polygon")
      .attr("class", "marker marker-triangle")
      .attr("points", trianglePoints)
      .attr("opacity", 0);

    hommes.exit().remove();

    const markers = d3.selectAll(".marker");

    markers
      .style("transform", (d) => {
        const x = xScale(xProgressAccessor(d));
        const yStart = startYScale(revenuAccessor(d));
        const yEnd = endYScale(educationAccessor(d));
        const yChange = yEnd - yStart;
        const yProgress = yTransitionProgressScale(xProgressAccessor(d));
        const y = yStart + yChange * yProgress + d.yJitter;
        return `translate(${x}px, ${y}px)`;
      })
      .attr("fill", (d) => colorScale(revenuAccessor(d)))
      .transition()
      .duration(100)
      .style("opacity", (d) => (xScale(xProgressAccessor(d)) < 10 ? 0 : 1));

    const endingGroups = educationId.map((endId, i) =>
      personne.filter(
        (d) => xProgressAccessor(d) >= 1 && educationAccessor(d) == endId
      )
    );

    const endingPercentages = d3.merge(
      endingGroups.map((peopleWithSameEnding, endingId) =>
        d3.merge(
          genreId.map((genreId) =>
            revenuId.map((revenuId) => {
              const peopleInBar = peopleWithSameEnding.filter(
                (d) => genreAccessor(d) == genreId
              );
              const countInBar = peopleInBar.length;
              const peopleInBarWithSameStart = peopleInBar.filter(
                (d) => revenuAccessor(d) == revenuId
              );
              const count = peopleInBarWithSameStart.length;
              const numberOfPeopleAbove = peopleInBar.filter(
                (d) => revenuAccessor(d) > revenuId
              ).length;

              return {
                endingId,
                revenuId,
                genreId,
                count,
                countInBar,
                percentAbove: numberOfPeopleAbove / (peopleInBar.length || 1),
                percent: count / (countInBar || 1),
              };
            })
          )
        )
      )
    );
    endingBarGroup
      .selectAll(".ending-bar")
      .data(endingPercentages)
      .join("rect")
      .attr("class", "ending-bar")
      .attr(
        "x",
        (d) =>
          -dimensions.endsBarWidth * (d.genreId + 1) -
          d.genreId * dimensions.endingBarPadding
      )
      .attr("width", dimensions.endsBarWidth)
      .attr(
        "y",
        (d) =>
          endYScale(d.endingId) -
          dimensions.pathHeight / 2 +
          dimensions.pathHeight * d.percentAbove
      )
      .attr("height", (d) =>
        d.countInBar ? dimensions.pathHeight * d.percent : dimensions.pathHeight
      )
      .attr("fill", (d) => (d.countInBar ? colorScale(d.revenuId) : "#dadadd"));

    endingLabelsGroup
      .selectAll(".ending-value")
      .data(endingPercentages)
      .join("text")
      .attr("class", "ending-value")
      .attr("x", (d) => d.revenuId * 33 + 47)
      .attr(
        "y",
        (d) =>
          endYScale(d.endingId) -
          dimensions.pathHeight / 2 +
          14 * d.genreId +
          35
      )
      .attr("fill", (d) => (d.countInBar ? colorScale(d.revenuId) : "#dadadd"))
      .text((d) => d.count);
  }
  d3.timer(updateMarkers);
}
drawChart();

// utility functions

const getRandomNumberInRange = (min, max) => Math.random() * (max - min) + min;

const getRandomValue = (arr) =>
  arr[Math.floor(getRandomNumberInRange(0, arr.length))];

const sentenceCase = (str) =>
  [str.slice(0, 1).toUpperCase(), str.slice(1)].join("");
