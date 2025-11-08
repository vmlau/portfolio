import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

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
  dl.append('dd').text(commits.length);

  // Add more stats as needed...
  dl.append('dt').text('Files');
  dl.append('dd').text(d3.group(data, d => d.file).size);

  // Add total LOC
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('Max Depth');
  dl.append('dd').text(d3.max(data, d => d.depth));

  dl.append('dt').text('Longest Line');
  dl.append('dd').text(d3.max(data, d => d.length));

  dl.append('dt').text('Max Lines');
  dl.append('dd').text(d3.max(commits, d => d.totalLines));
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
    .call(xAxis);

  // Add Y axis
  svg
    .append('g')
    .attr('transform', `translate(${usableArea.left}, 0)`)
    .call(yAxis);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3
    .scaleSqrt() // Change only this line
    .domain([minLines, maxLines])
    .range([2, 30]);
  // Draw circles using the sorted list so smaller dots are on top
  dots
    .selectAll('circle')
    .data(sortedCommits)
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
//console.log(commits);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);

