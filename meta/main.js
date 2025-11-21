import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

// color scale mapping technology ids (d.type) to colors
const colors = d3.scaleOrdinal(d3.schemeTableau10);

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line), // or just +row.line
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: 'https://github.com/vmlau/portfolio/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
        // What other options do we need to set?
        // Hint: look up configurable, writable, and enumerable
        enumerable: false,
        writable: false,
        configurable: false,
      });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
  // Create the dl element
  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  // Add total commits
  dl.append('dt').text('Total commits');
  dl.append('dd').attr('id', 'stat-total-commits').text(commits.length);

  dl.append('dt').text('Files');
  dl.append('dd').attr('id', 'stat-files').text(d3.group(data, d => d.file).size);

  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').attr('id', 'stat-total-loc').text(data.length);

  dl.append('dt').text('Max Depth');
  dl.append('dd').attr('id', 'stat-max-depth').text(d3.max(data, d => d.depth));

  dl.append('dt').text('Longest Line');
  dl.append('dd').attr('id', 'stat-longest-line').text(d3.max(data, d => d.length));

  dl.append('dt').text('Max Lines');
  dl.append('dd').attr('id', 'stat-max-lines').text(d3.max(commits, d => d.totalLines));
}

function updateSummaryStats(filteredCommits) {
  const lines = (filteredCommits || []).flatMap((c) => c.lines || []);

  const totalCommits = filteredCommits ? filteredCommits.length : 0;
  const filesCount = d3.group(lines, (d) => d.file).size;
  const totalLoc = lines.length;
  const maxDepth = lines.length ? d3.max(lines, (d) => d.depth) : 0;
  const longestLine = lines.length ? d3.max(lines, (d) => d.length) : 0;
  const maxLines = filteredCommits && filteredCommits.length ? d3.max(filteredCommits, (d) => d.totalLines) : 0;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText('stat-total-commits', totalCommits);
  setText('stat-files', filesCount);
  setText('stat-total-loc', totalLoc);
  setText('stat-max-depth', maxDepth);
  setText('stat-longest-line', longestLine);
  setText('stat-max-lines', maxLines);
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function renderScatterPlot(data, commits) {
  // Put all the JS code of Steps inside this function
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  const width = 1000;
  const height = 600;
  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, width])
    .nice();

  const yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);
  const dots = svg.append('g').attr('class', 'dots');
  
  // expose svg and scales so other functions (slider/updateScatterPlot) can reuse them
  window._commitSvg = svg;
  window.xScale = xScale;
  window.yScale = yScale;
  
  const margin = { top: 10, right: 10, bottom: 30, left: 20 };
  const usableArea = {
    top: margin.top,
    right: width - margin.right,
    bottom: height - margin.bottom,
    left: margin.left,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom,
  };

  // Update scales with new ranges
  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);

  // Add gridlines BEFORE the axes
  const gridlines = svg
    .append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left}, 0)`);

  // Create gridlines as an axis with no labels and full-width ticks
  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  // Create the axes
  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3
    .axisLeft(yScale)
    .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  // Add X axis
  svg
    .append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .attr('class', 'x-axis') // new line to mark the g tag
    .call(xAxis);

  // Add Y axis
  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .attr('class', 'y-axis') // new line to mark the g tag
    .call(yAxis);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3
    .scaleSqrt() // Change only this line
    .domain([minLines, maxLines])
    .range([2, 30]);
  // Draw circles using the sorted list so smaller dots are on top
  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .attr('fill', 'steelblue')
    .on('mouseenter', function (event, commit) {
      d3.select(this).style('fill-opacity', 1); // Full opacity on hover
      d3.select(this).classed('hovered', true);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mousemove', function(event) {
      // keep the tooltip following the cursor while hovering
      updateTooltipPosition(event);
    })
    .on('mouseleave', function () {
      d3.select(this).style('fill-opacity', 0.7);
      d3.select(this).classed('hovered', false);
      updateTooltipVisibility(false);
    });

  // Create brush and wire up handlers (Step 5)
  svg.call(d3.brush().on('start brush end', brushed));

  // Raise dots and everything after overlay so they receive pointer events
  svg.selectAll('.dots, .overlay ~ *').raise();

  function brushed(event) {
    const selection = event.selection;
    d3.selectAll('circle').classed('selected', (d) => isCommitSelected(selection, d));
    renderSelectionCount(selection);
    renderLanguageBreakdown(selection);
  }

  function isCommitSelected(selection, commit) {
    if (!selection) return false;
    const [[x0, y0], [x1, y1]] = selection;
    const cx = xScale(commit.datetime);
    const cy = yScale(commit.hourFrac);
    return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1;
  }

  function renderSelectionCount(selection) {
    const selectedCommits = selection ? commits.filter((d) => isCommitSelected(selection, d)) : [];
    const countElement = document.querySelector('#selection-count');
    if (!countElement) return;
    countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
    return selectedCommits;
  }

  function renderLanguageBreakdown(selection) {
    const selectedCommits = selection ? commits.filter((d) => isCommitSelected(selection, d)) : [];
    const container = document.getElementById('language-breakdown');
    if (!container) return;

    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }
    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines || []);

    // Use d3.rollup to count lines per language (type)
    const breakdown = d3.rollup(lines, (v) => v.length, (d) => d.type);

    container.innerHTML = '';
    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);
      container.innerHTML += `\n            <dt>${language}</dt>\n            <dd>${count} lines (${formatted})</dd>\n        `;
    }
  }
}

function renderTooltipContent(commit) {
  const tip = document.getElementById('commit-tooltip');
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (!tip) return;

  // If no commit provided, show a helpful placeholder
  if (!commit) {
    if (link) { link.href = ''; link.textContent = ''; }
    if (date) date.textContent = '';
    if (time) time.textContent = '';
    if (author) author.textContent = '';
    if (lines) lines.textContent = '';
    // Optionally show a placeholder message in the first dd
    const firstDd = tip.querySelector('dd');
    if (firstDd) firstDd.textContent = 'Hover a dot for details';
    return;
  }

  // populate fields for the hovered commit
  if (link) {
    link.href = commit.url || '';
    link.textContent = commit.id || '';
  }
  if (date) date.textContent = commit.datetime ? commit.datetime.toLocaleString('en', { dateStyle: 'full' }) : '';
  if (time) time.textContent = commit.time || '';
  if (author) author.textContent = commit.author || '';
  if (lines) lines.textContent = commit.lines ? commit.lines.length : (commit.totalLines || 0);
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

let data = await loadData();
let commits = processCommits(data);
// ensure commits are in chronological order for scrollytelling
commits.sort((a, b) => a.datetime - b.datetime);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);

// ...existing code...
let commitProgress = 100;
let commitScale = d3
  .scaleTime()
  .domain([
    d3.min(commits, (d) => d.datetime),
    d3.max(commits, (d) => d.datetime),
  ])
  .range([0, 100]);

// expose the scale and current max time on window so other code can use them
window.commitScale = commitScale;
window.commitProgress = window.commitProgress ?? commitProgress;
window.commitMaxTime = commitScale.invert(window.commitProgress);

// ...existing code...

// Slider / time filter -----------------------------------------------------
const slider = document.getElementById('commit-progress');
const timeEl = document.getElementById('commit-time');

// commitProgress and commitMaxTime are globals used elsewhere; initialize if absent
window.commitProgress = window.commitProgress ?? Number(slider?.value ?? window.commitProgress);
window.commitMaxTime = window.commitMaxTime ?? (window.commitScale ? window.commitScale.invert(window.commitProgress) : null);

// Will get updated as user changes slider
let filteredCommits = commits;
let lines = filteredCommits.flatMap((d) => d.lines);
let files = d3
  .groups(lines, (d) => d.file)
  .map(([name, lines]) => {
    return { name, lines };
  })
  .sort((a, b) => b.lines.length - a.lines.length);
updateFileDisplay(filteredCommits);
updateSummaryStats(filteredCommits);

function onTimeSliderChange() {
  if (!slider) return;

  // robust read + clamp to [0,100]
  let val = Number(slider.value ?? window.commitProgress ?? 100);
  val = Math.max(0, Math.min(100, val));
  window.commitProgress = val;

  if (window.commitScale && typeof window.commitScale.invert === 'function') {
    try {
      window.commitMaxTime = window.commitScale.invert(val);
    } catch (e) {
      window.commitMaxTime = null;
    }
  } else {
    window.commitMaxTime = null;
  }

  if (timeEl) {
    if (window.commitMaxTime instanceof Date) {
      // show a long date and short time
      timeEl.textContent = window.commitMaxTime.toLocaleString(undefined, {
        dateStyle: 'long',
        timeStyle: 'short',
      });
    } else if (window.commitMaxTime) {
      timeEl.textContent = String(window.commitMaxTime);
    } else {
      timeEl.textContent = '';
    }
  }

  // update filtered commits using the window-scoped value
  filteredCommits = window.commitMaxTime ? commits.filter((d) => d.datetime <= window.commitMaxTime) : commits;

  updateFileDisplay(filteredCommits);
  updateSummaryStats(filteredCommits);

  // refresh plot with filtered data
  if (typeof updateScatterPlot === 'function') updateScatterPlot(data, filteredCommits);

  // Notify other modules if they listen for updates
  window.dispatchEvent(new Event('commit-time-updated'));
}

// attach handler and initialize
if (slider) {
  slider.addEventListener('input', onTimeSliderChange);
  onTimeSliderChange();
}

function updateScatterPlot(data, commits) {
  const svg = window._commitSvg || d3.select('#chart').select('svg');
  const xScale = window.xScale;
  const yScale = window.yScale;
  if (!svg || !xScale || !yScale) return;

  // update x domain to the provided commits
  xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxis = d3.axisBottom(xScale);

  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);
  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

function updateFileDisplay(filteredCommits) {
  // compute flattened lines and group into files from the current filtered commits
  const lines = (filteredCommits || []).flatMap((d) => d.lines || []);
  const files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  // bind by file name; give each container a class for clearer selectors
  const filesContainer = d3
    .select('#files')
    .selectAll('div.file')
    .data(files, (d) => d.name);

  const enter = filesContainer
    .join(
      (enter) =>
        enter
          .append('div')
          .attr('class', 'file')
          .call((div) => {
            div.append('dt').append('code');
            div.append('dd');
          }),
      (update) => update,
      (exit) => exit.remove(),
    );

  // update text: show filename and total lines in the <dt>,
  // and create one `.loc` div per line inside the <dd> (unit visualization)
    filesContainer.select('dt').html((d) => `
          <code>${d.name}</code>
          <small>${d.lines.length} lines</small>
        `);

    // append one div for each line and set color CSS variable from the top-level colors scale
    filesContainer
      .select('dd')
      .selectAll('div')
      .data((d) => d.lines)
      .join('div')
      .attr('class', 'loc')
      .attr('style', (d) => `--color: ${colors(d.type)}`);
}

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		Then I looked over all I had made, and I saw that it was very good.
	`,
  );

function onStepEnter(response) {
  const commit = response.element.__data__;
  if (!commit) return;
  // filter commits up to and including this step's datetime (same behavior as the slider)
  const filtered = commits.filter((d) => d.datetime <= commit.datetime);
  updateFileDisplay(filtered);
  updateSummaryStats(filtered);
  if (typeof updateScatterPlot === 'function') updateScatterPlot(data, filtered);
}

const scroller = scrollama();
scroller
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter(onStepEnter);