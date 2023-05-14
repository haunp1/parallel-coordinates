var width = 1200,
  height = 800;

var colors = {
  "Nguyen Minh Chi": [185, 56, 73],
  "Tran Tan Dat": [137, 50, 75],
  "Pham Hong Dinh": [255, 165, 0],
  "Phan Thi My Dung": [10, 28, 67],
  "Khuu Thi Thuy Duong": [255, 39, 57],
  "Vo Le Duy": [56, 158, 73],
  "Lu Thanh Giang": [28, 100, 52],
  "Nguyen Phuc Hau": [41, 75, 61],
  "Nguyen Trung Hau": [60, 86, 61],
  "Tran Huu Hien": [30, 100, 73],
  "Phan Van Hoan": [255, 65, 67],
  "Nguyen Thai Hung": [255, 30, 76],
  "Bui Dinh Gia Huy": [20, 149, 149],
  "Lam Quoc Minh Huy": [255, 80, 84],
  "Nguyen Dinh Quoc Huy": [185, 80, 45],
  "Tran Minh Kha": [255, 69, 0],
  "Nguyen Dang Khoa": [255, 60, 49],
  "Lam Hieu Linh": [255, 69, 149],
  "Tran Huynh Long": [204, 70, 41],
  "Nguyen Huu Ly": [111, 100, 79],
  "Do Quang Minh": [189, 57, 75],
  "Ho Hai Minh": [110, 157, 170],
  "Le Thi Kim Ngan": [214, 55, 79],
  "Tran Chung Bao Ngan": [255, 60, 75],
  "Nguyen Chi Nguyen": [120, 156, 140],
  "Dang Thanh Phat": [139, 168, 79],
  "Truong Tai Phat": [27, 165, 100],
  "Vo Hoang Phuc": [33, 81, 52],
  "Duong Trieu Phu": [188, 51, 188],
  "Nguyen Huu Quy": [0, 0, 0],
  "Nguyen Tien Tai": [127, 114, 76],
  "Dong Giang Thai": [161, 134, 54],
  "Le Cao Hoang Thai": [37, 162, 114],
  "Tran Chien Thanh": [170, 110, 148],
  "Bui Duong Tinh": [90, 100, 154],
  "Phan Thanh Trung": [28, 143, 61],
  "Tran Quoc Trung": [172, 123, 189],
  "Vu Thi Bich Van": [13, 85, 94],
  "Lam The Vinh": [73, 124, 114],
  "Le Nguyen Tan Vuong": [125, 160, 94],
};

var textLength = 0;
Object.keys(colors).forEach((k) => {
  if (k.length > textLength) textLength = k.length;
});

var m = [60, 0, 10, 5 * textLength],
  w = width - m[1] - m[3],
  h = height - m[0] - m[2],
  xscale = d3.scale.ordinal().rangePoints([0, w], 1),
  yscale = {},
  xScaleStack = {},
  yScaleStack = {},
  xAxisStack = {},
  yAxisStack = {},
  dragging = {},
  line = d3.svg.line(),
  axis = d3.svg
    .axis()
    .orient("left")
    .ticks(1 + height / 50),
  data,
  foreground,
  background,
  highlighted,
  dimensions,
  render_speed = 50,
  brush_count = 0;

// Grid
var grid = d3.divgrid();

// Scale chart and canvas height
d3.select("#chart").style("height", h + m[0] + m[2] + "px");

d3.selectAll("canvas")
  .attr("width", w)
  .attr("height", h)
  .style("padding", m.join("px ") + "px");

// Foreground canvas for primary view
foreground = document.getElementById("foreground").getContext("2d");
foreground.globalCompositeOperation = "destination-over";
foreground.strokeStyle = "rgba(0,100,160,0.1)";
foreground.lineWidth = 1.7;
foreground.fillText("Loading...", w / 2, h / 2);

// Highlight canvas for temporary interactions
highlighted = document.getElementById("highlight").getContext("2d");
highlighted.strokeStyle = "rgba(0,100,160,1)";
highlighted.lineWidth = 2;

// Background canvas
background = document.getElementById("background").getContext("2d");
background.strokeStyle = "rgba(0,100,160,0.1)";
background.lineWidth = 1.7;

// SVG for ticks, labels, and interactions
var svg = d3
  .select("svg")
  .attr("width", w + m[1] + m[3])
  .attr("height", h + m[0] + m[2])
  .append("svg:g")
  .attr("transform", "translate(" + m[3] + "," + m[0] + ")");

// Load the data and visualization
d3.csv("emp_stats.csv", function (raw_data) {
  // Convert quantitative scales to floats
  data = raw_data.map(function (d) {
    for (var k in d) {
      if (!_.isNaN(raw_data[0][k] - 0) && k != "Name") {
        d[k] = parseFloat(d[k]) || 0;
      }
    }
    return d;
  });

  // Extract the list of numerical dimensions and create a scale for each.
  xscale.domain(
    (dimensions = d3.keys(data[0]).filter(function (k) {
      // if (k == "Model") return false;
      if (_.isNumber(data[0][k])) {
        return (yscale[k] = d3.scale
          .linear()
          .domain(d3.extent(data, (d) => +d[k]))
          .range([h, 0]));
      } else {
        return (yscale[k] = d3.scale
          .ordinal()
          .domain(data.map((d) => d[k]))
          .rangePoints([h, 0], 1));
      }
    }))
  );

  // Extract the list for x-stack
  xStack = d3.scale
    .linear()
    .rangeRound([0, (w - 300) / (dimensions.length - 1)]);

  // Add a group element for each dimension.
  var g = svg
    .selectAll(".dimension")
    .data(dimensions)
    .enter()
    .append("svg:g")
    .attr("class", "dimension")
    .attr("transform", function (d) {
      return "translate(" + xscale(d) + ")";
    })
    .call(
      d3.behavior
        .drag()
        .on("dragstart", function (d) {
          dragging[d] = this.__origin__ = xscale(d);
          this.__dragged__ = false;
          d3.select("#foreground").style("opacity", "0.5");
        })
        .on("drag", function (d) {
          dragging[d] = Math.min(
            w,
            Math.max(0, (this.__origin__ += d3.event.dx))
          );
          dimensions.sort(function (a, b) {
            return position(a) - position(b);
          });
          xscale.domain(dimensions);
          g.attr("transform", function (d) {
            return "translate(" + position(d) + ")";
          });
          brush_count++;
          this.__dragged__ = true;
        })
        .on("dragend", function (d) {
          if (!this.__dragged__) {
            // no movement, invert axis
            var extent = invert_axis(d);
          } else {
            // reorder axes
            d3.select(this)
              .transition()
              .attr("transform", "translate(" + xscale(d) + ")");

            var extent = yscale[d].brush.extent();
          }

          // TODO required to avoid a bug
          xscale.domain(dimensions);
          update_ticks(d, extent);

          // rerender
          d3.select("#foreground").style("opacity", null);
          brush();
          delete this.__dragged__;
          delete this.__origin__;
          delete dragging[d];
        })
    );

  // Add an axis and title.
  g.append("svg:g")
    .attr("class", "axis")
    .attr("transform", "translate(0,0)")
    .each(function (d) {
      d3.select(this).call(axis.scale(yscale[d]));
    })
    .append("svg:text")
    .attr("text-anchor", "middle")
    .attr("y", function (d, i) {
      return i % 2 == 0 ? -14 : -30;
    })
    .attr("x", 0)
    .attr("class", "label")
    .text(String)
    .append("title")
    .text("Click to invert. Drag to reorder");

  // Add and store a brush for each axis.
  g.append("svg:g")
    .attr("class", "brush")
    .each(function (d) {
      d3.select(this).call(
        (yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brush", brush))
      );
    })
    .selectAll("rect")
    .style("visibility", null)
    .attr("x", -23)
    .attr("width", 36)
    .append("title")
    .text("Drag up or down to brush along this axis");

  g.selectAll(".extent").append("title").text("Drag or resize this filter");

  // Render full foreground
  brush();

  // CREATE [DATA TABLE], row hover highlighting
  d3.select("#grid")
    .datum(data.slice(0, Object.keys(data).length))
    .call(grid)
    .selectAll(".row")
    .on({
      mouseover: (d) => highlight(d),
      mouseout: unhighlight,
    });
});

// render polylines i to i+render_speed
function render_range(selection, i, max, opacity) {
  selection.slice(i, max).forEach(function (d) {
    path(d, foreground, color(d.Name, opacity));
  });
}

// Adjusts rendering speed
function optimize(timer) {
  var delta = new Date().getTime() - timer;
  render_speed = Math.max(Math.ceil((render_speed * 30) / delta), 8);
  render_speed = Math.min(render_speed, 300);
  return new Date().getTime();
}

// Feedback on rendering progress
function render_stats(i, n, render_speed) {
  d3.select("#rendered-count").text(i);
  d3.select("#rendered-bar").style("width", (100 * i) / n + "%");
  d3.select("#render-speed").text(render_speed);
}

// Feedback on selection
function selection_stats(opacity, n, total) {
  d3.select("#data-count").text(total);
  d3.select("#selected-count").text(n);
  d3.select("#selected-bar").style("width", (100 * n) / total + "%");
  d3.select("#opacity").text(("" + opacity * 100).slice(0, 4) + "%");
}

// Highlight single polyline
function highlight(d) {
  d3.select("#foreground").style("opacity", "0.25");
  d3.selectAll(".row").style("opacity", function (p) {
    return d == p ? null : "0.3";
  });
  path(d, highlighted, color(d.Name, 1));
}

// Remove highlight
function unhighlight() {
  d3.select("#foreground").style("opacity", null);
  d3.selectAll(".row").style("opacity", null);
  highlighted.clearRect(0, 0, w, h);
}

function invert_axis(d) {
  // save extent before inverting
  if (!yscale[d].brush.empty()) {
    var extent = yscale[d].brush.extent();
  }
  if (yscale[d].inverted == true) {
    if (d == "Name") yscale[d].rangePoints([h, 0], 1);
    else yscale[d].range([h, 0]);
    d3.selectAll(".label")
      .filter((p) => p == d)
      .style("text-decoration", null);
    yscale[d].inverted = false;
  } else {
    if (d == "Name") yscale[d].rangePoints([0, h], 1);
    else yscale[d].range([0, h]);
    d3.selectAll(".label")
      .filter((p) => p == d)
      .style("text-decoration", "underline");
    yscale[d].inverted = true;
  }
  return extent;
}

function path(d, ctx, color) {
  if (color) ctx.strokeStyle = color;
  ctx.beginPath();
  var x0 = xscale(0) - 15,
    y0 = yscale[dimensions[0]](d[dimensions[0]]); // left edge
  ctx.moveTo(x0, y0);
  dimensions.map(function (p, i) {
    var x = xscale(p),
      y = yscale[p](d[p]);
    var cp1x = x - 0.88 * (x - x0);
    var cp1y = y0;
    var cp2x = x - 0.12 * (x - x0);
    var cp2y = y;
    // ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
    ctx.lineTo(x, y);
    x0 = x;
    y0 = y;
  });
  ctx.lineTo(x0 + 15, y0); // right edge
  ctx.stroke();
}

function color(d, a) {
  var c = colors[d];
  return ["rgba(", c[0], ",", c[1], ",", c[2], a, ")"].join("");
}

function position(d) {
  var v = dragging[d];
  return v == null ? xscale(d) : v;
}

// Handles a brush event, toggling the display of foreground lines.
// TODO refactor
function brush() {
  brush_count++;
  var actives = dimensions.filter(function (p) {
      return !yscale[p].brush.empty();
    }),
    extents = actives.map(function (p) {
      return yscale[p].brush.extent();
    });

  // hack to hide ticks beyond extent
  var b = d3.selectAll(".dimension")[0].forEach(function (element, i) {
    var dimension = d3.select(element).data()[0];
    if (_.include(actives, dimension)) {
      var extent = extents[actives.indexOf(dimension)];
      d3.select(element)
        .selectAll("text")
        .style("font-weight", "bold")
        .style("font-size", "13px")
        .style("display", function () {
          var value = d3.select(this).data();
          if (dimension == "Name") {
            return extent[0] <= yscale[dimension](value) &&
              yscale[dimension](value) <= extent[1]
              ? null
              : "none";
          } else return extent[0] <= value && value <= extent[1] ? null : "none";
        });
    } else {
      d3.select(element)
        .selectAll("text")
        .style("font-size", null)
        .style("font-weight", null)
        .style("display", null);
    }
    d3.select(element).selectAll(".label").style("display", null);
  });

  // bold dimensions with label
  d3.selectAll(".label").style("font-weight", function (dimension) {
    if (_.include(actives, dimension)) return "bold";
    return null;
  });

  // Get lines within extents
  var selected = [];
  data.map(function (d) {
    return actives.every(function (p, dimension) {
      if (typeof d[p] == "string") {
        return (
          extents[dimension][0] <= yscale[p](d[p]) &&
          yscale[p](d[p]) <= extents[dimension][1]
        );
      }
      return extents[dimension][0] <= d[p] && d[p] <= extents[dimension][1];
    })
      ? selected.push(d)
      : null;
  });

  // UPDATE [DATA TABLE] on brush event
  d3.select("#grid")
    .datum(selected)
    .call(grid)
    .selectAll(".row")
    .on({
      mouseover: (d) => highlight(d),
      mouseout: unhighlight,
    });

  // Render selected lines
  paths(selected, foreground, brush_count, actives);
}

// render a set of polylines on a canvas
function paths(selected, ctx, count, actives) {
  var n = selected.length,
    i = 0,
    opacity = d3.min([2 / Math.pow(n, 0.3), 1]),
    timer = new Date().getTime();

  selection_stats(opacity, n, data.length);

  shuffled_data = _.shuffle(selected);

  ctx.clearRect(0, 0, w + 1, h + 1);
  if (actives && actives.length) {
    ctx.lineWidth = 6.0;
    let svgPts = get_centroids(selected);
    if (svgPts && svgPts.length == 0) return false;
    clean_tooltips();
    add_tooltips(selected, svgPts);

    // Render stacked bar
    // clean_stacked_bar();
    // stacked_bar(actives, selected);
  } else {
    clean_tooltips();
    clean_stacked_bar();
    ctx.lineWidth = 1.7;
  }

  // render all lines until finished or a new brush event
  function animloop() {
    if (i >= n || count < brush_count) return true;
    var max = d3.min([i + render_speed, n]);
    render_range(shuffled_data, i, max, opacity);
    render_stats(max, n, render_speed);
    i = max;
    timer = optimize(timer); // adjusts render_speed
  }

  d3.timer(animloop);
}

// find centroids points
function get_centroids(selected) {
  let svgPts = [];

  selected.forEach((d) => {
    var initCentroids = compute_centroids(d).filter(function (_, i) {
      return i % 2 == 0;
    });
    // move points based on margins
    var centroidPts = initCentroids.map(function (d) {
      return [d[0] + m[3], d[1] + m[0]];
    });
    svgPts.push(centroidPts);
  });

  return svgPts;
}

// compute centroids
function compute_centroids(row) {
  var centroids = [];

  var p = dimensions;
  var cols = p.length;
  var a = 0.5; // center between axes
  for (var i = 0; i < cols; ++i) {
    // centroids on 'real' axes
    var x = position(p[i]);
    var y = yscale[p[i]](row[p[i]]);
    centroids.push([x, y]);

    // centroids on 'virtual' axes
    if (i < cols - 1) {
      var cx = x + a * (position(p[i + 1]) - x);
      var cy = y + a * (yscale[p[i + 1]](row[p[i + 1]]) - y);
      centroids.push([cx, cy]);
    }
  }
  return centroids;
}

// Remove tooltips
function clean_tooltips() {
  // removes any object under #tooltip is
  svg.selectAll("#tooltip").remove();
}

// Remove stacked bar
function clean_stacked_bar() {
  svg.selectAll(".stackrect").remove();
}

// Add tooltips
function add_tooltips(selected, pts) {
  let dataset = [];
  if (selected.length == 0) return;
  // selected.forEach((s) => delete s["Model"]);
  // get all the values into a single list
  // I'm pretty sure there is a better way to write this is Javascript
  for (let i = 0; i < selected.length; ++i) {
    for (let j = 0; j < pts[i].length; ++j) {
      const text = d3.values(selected[i])[j] + "";
      // not clean at all!
      const x = pts[i][j][0] - m[3];
      const y = pts[i][j][1] - m[0];
      dataset.push([x, y, text]);
    }
  }

  // add rectangles
  var fontSize = 18;
  var padding = 2;
  var hRect = fontSize + 2 * padding; //based on font size

  svg
    .selectAll("rect[id='tooltip']")
    .data(dataset)
    .enter()
    .append("rect")
    .attr("x", function (d) {
      return d[0] - d[2].length * 5;
    })
    .attr("y", function (d) {
      return d[1] - hRect + 2 * padding;
    })
    .attr("rx", "2")
    .attr("ry", "2")
    .attr("id", "tooltip")
    .attr("fill", "grey")
    .attr("opacity", 0.9)
    .attr("width", (d) => d[2].length * 10)
    .attr("height", hRect);

  // add text on top of rectangle
  svg
    .selectAll("text[id='tooltip']")
    .data(dataset)
    .enter()
    .append("text")
    .attr("x", (d) => d[0])
    .attr("y", (d) => d[1])
    .attr("id", "tooltip")
    .attr("fill", "white")
    .attr("text-anchor", "middle")
    .attr("font-size", fontSize)
    .text((d) => d[2]);
}

function stacked_bar(actives, selected) {
  var extents = actives.map(function (p) {
    return yscale[p].brush.extent();
  });

  var dataset = selected.map((e) =>
    Object.keys(e)
      .filter((k) => k != "Name")
      .map((k) => {
        return {
          y: +e[k],
          x: k,
        };
      })
  );

  d3.layout.stack()(dataset);

  var dataset = dataset.map((group) =>
    group.map((ds) => {
      return { x: ds.y, y: ds.x, x0: ds.y0 };
    })
  );

  // yAxisStack = d3.svg.axis().scale(yScaleStack).orient("left");

  // var xMax = d3.max(dataset, function (group) {
  //   var groupMax = d3.max(group, function (d) {
  //     console.log("607: >>>>", d);
  //     return d.x + d.x0;
  //   });
  //   return groupMax;
  // });

  // console.log("xMax: >>>>", xMax);

  // var xScaleStack = d3.scale.linear().domain([0, xMax]).range([0, width]);

  // xAxisStack = d3.svg.axis().scale(xScaleStack).orient("bottom");

  var idx = 0;

  dimensions.forEach(function (d) {
    actives.forEach((ad) => {
      if (ad == d) {
        // group draw stacked bar
        var xMax = d3.max(dataset, function (group) {
          var groupMax = d3.max(group, function (d) {
            if (d.y == ad) return d.x + d.x0;
          });
          return groupMax;
        });
        var xScaleStack = d3.scale.linear().domain([0, xMax]).range([0, width]);
        yScaleStack = d3.scale
          .ordinal()
          .domain([ad])
          .rangeRoundBands([0, h], 0.1);
        // draw rectangle stacked bar
        var draw_stacks = svg
          .selectAll(".state" + d)
          .data(dataset)
          .enter()
          .append("g")
          .attr("class", "g");

        draw_stacks
          .selectAll("rect")
          .data((ds, i) => {
            idx = i;
            return ds;
          })
          .enter()
          .append("rect")
          .attr("class", "stackrect")
          .attr(
            "height",
            () =>
              yscale[d](extents[actives.indexOf(d)][0]) -
              yscale[d](extents[actives.indexOf(d)][1])
          )
          // .attr("width", 80)
          .attr("x", () => xscale(d))
          // .attr("y", (ds) => yscale[d](ds[d]) - 15)
          // .attr("height", () => yScaleStack.rangeBand())
          .attr("width", (ds) => {
            if (ds.y == ad) {
              console.log([ds, xMax, ds.x]);
              return xScaleStack(xMax) - xScaleStack(ds.x);
            }
          })
          // .attr("x", (ds) => {
          //   if (ds.y == ad) return xScaleStack(ds.x);
          // })
          // .attr("y", (ds) => {
          //   if (ds.y == ad) return yScaleStack(ds.y);
          // })
          .attr("y", () => yscale[d](selected[idx][d]) - 20)
          .style("fill-opacity", 0.3)
          .style("fill", () => color(selected[idx].Name, 0.9));
      }
    });
  });
}

// transition ticks for reordering, rescaling and inverting
function update_ticks(d, extent) {
  // update brushes
  if (d) {
    var brush_el = d3.selectAll(".brush").filter(function (key) {
      return key == d;
    });
    // single tick
    if (extent) {
      // restore previous extent
      brush_el.call(
        (yscale[d].brush = d3.svg
          .brush()
          .y(yscale[d])
          .extent(extent)
          .on("brush", brush))
      );
    } else {
      brush_el.call(
        (yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brush", brush))
      );
    }
  } else {
    // all ticks
    d3.selectAll(".brush").each(function (d) {
      d3.select(this).call(
        (yscale[d].brush = d3.svg.brush().y(yscale[d]).on("brush", brush))
      );
    });
  }

  brush_count++;

  show_ticks();

  // update axes
  d3.selectAll(".axis").each(function (d, i) {
    // hide lines for better performance
    d3.select(this).selectAll("line").style("display", "none");

    // transition axis numbers
    d3.select(this).transition().duration(720).call(axis.scale(yscale[d]));

    // bring lines back
    d3.select(this)
      .selectAll("line")
      .transition()
      .delay(800)
      .style("display", null);

    d3.select(this)
      .selectAll("text")
      .style("font-weight", null)
      .style("font-size", null)
      .style("display", null);
  });
}

// Rescale to new dataset domain
function rescale() {
  // reset yscales, preserving inverted state
  dimensions.forEach(function (d, i) {
    if (yscale[d].inverted) {
      if (d == "Origin")
        yscale[d] = d3.scale
          .ordinal()
          .domain(data.map((p) => p[d]))
          .rangePoints([0, h], 1);

      yscale[d] = d3.scale
        .linear()
        .domain(
          d3.extent(data, function (p) {
            return +p[d];
          })
        )
        .range([0, h]);
      yscale[d].inverted = true;
    } else {
      if (d == "Origin")
        yscale[d] = d3.scale
          .ordinal()
          .domain(data.map((p) => p[d]))
          .rangePoints([h, 0], 1);
      yscale[d] = d3.scale
        .linear()
        .domain(
          d3.extent(data, function (p) {
            return +p[d];
          })
        )
        .range([h, 0]);
    }
  });

  update_ticks();
  // Render selected data
  paths(data, foreground, brush_count, data);
}

// Get polylines within extents
function actives() {
  var actives = dimensions.filter(function (p) {
      return !yscale[p].brush.empty();
    }),
    extents = actives.map(function (p) {
      return yscale[p].brush.extent();
    });

  // filter extents and excluded groups
  var selected = [];
  data.map(function (d) {
    return actives.every(function (p, i) {
      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
    })
      ? selected.push(d)
      : null;
  });

  return selected;
}

function show_ticks() {
  d3.selectAll(".axis g").style("display", null);
  //d3.selectAll(".axis path").style("display", null);
  d3.selectAll(".background").style("visibility", null);
  d3.selectAll("#show-ticks").attr("disabled", "disabled");
  d3.selectAll("#hide-ticks").attr("disabled", null);
}
