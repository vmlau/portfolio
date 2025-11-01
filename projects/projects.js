import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

const titleElement = document.querySelector('.projects-title');
if (titleElement) titleElement.textContent = `${projects.length} Projects`;

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
export let selectedIndex = -1;
export let selectedYear = null;
let searchQuery = '';

function renderPieChart(projectsGiven = []) {
  const svg = d3.select('#projects-pie-plot');
  const legend = d3.select('.legend');

  svg.selectAll('*').remove();
  legend.selectAll('*').remove();

  if (!projects || projects.length === 0) return;

  const rolledData = d3.rollups(
    projects,
    (v) => v.length,
    (d) => d.year,
  );

  const data = rolledData.map(([year, count]) => ({ value: count, label: year }));
  const sliceGenerator = d3.pie().value((d) => d.value);
  const arcData = sliceGenerator(data);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  arcData.forEach((d, idx) => {
    svg
      .append('path')
      .attr('d', arcGenerator(d))
      .attr('fill', colors(idx))
      .style('cursor', 'pointer')
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;

        selectedYear = selectedIndex === -1 ? null : data[idx].label;

        const filteredBySearch = searchQuery
          ? projects.filter((p) => `${p.title || ''} ${p.description || ''} ${p.year || ''}`.toLowerCase().includes(searchQuery))
          : projects;

        if (selectedIndex === -1) {
          renderProjects(filteredBySearch, projectsContainer, 'h2');
          if (titleElement) titleElement.textContent = `${filteredBySearch.length} Projects`;

          svg.selectAll('path').attr('class', null);
          legend.selectAll('li').attr('class', 'legend-item');
          return;
        }

        const year = data[idx].label;
        selectedYear = year;
        const filtered = filteredBySearch.filter((p) => String(p.year) === String(year));
        renderProjects(filtered, projectsContainer, 'h2');
        if (titleElement) titleElement.textContent = `${filtered.length} Projects`;

        svg.selectAll('path').attr('class', (_, i) => (i === selectedIndex ? 'selected' : null));
        legend.selectAll('li').attr('class', (_, i) => (i === selectedIndex ? 'legend-item selected' : 'legend-item'));
      });
  });

  data.forEach((d, idx) => {
    legend
      .append('li')
      .attr('class', 'legend-item')
      .html(`<span class="swatch" style="--color:${colors(idx)}"></span> ${d.label} <em>(${d.value})</em>`)
      .on('click', () => {
        selectedIndex = selectedIndex === idx ? -1 : idx;
        selectedYear = selectedIndex === -1 ? null : data[idx].label;

        const filteredBySearch = searchQuery
          ? projects.filter((p) => `${p.title || ''} ${p.description || ''} ${p.year || ''}`.toLowerCase().includes(searchQuery))
          : projects;

        if (selectedIndex === -1) {
          renderProjects(filteredBySearch, projectsContainer, 'h2');
          if (titleElement) titleElement.textContent = `${filteredBySearch.length} Projects`;
          svg.selectAll('path').attr('class', null);
          legend.selectAll('li').attr('class', 'legend-item');
          return;
        }

        const year = data[idx].label;
        selectedYear = year;
        const filtered = filteredBySearch.filter((p) => String(p.year) === String(year));
        renderProjects(filtered, projectsContainer, 'h2');
        if (titleElement) titleElement.textContent = `${filtered.length} Projects`;
        svg.selectAll('path').attr('class', (_, i) => (i === selectedIndex ? 'selected' : null));
        legend.selectAll('li').attr('class', (_, i) => (i === selectedIndex ? 'legend-item selected' : 'legend-item'));
      });
  });
  if (selectedYear !== null) {
    const match = data.findIndex(d => String(d.label) === String(selectedYear));
    selectedIndex = match !== -1 ? match : -1;
  } else {
    selectedIndex = -1;
  }

  svg.selectAll('path').attr('class', (_, i) => (i === selectedIndex ? 'selected' : null));
  legend.selectAll('li').attr('class', (_, i) => (i === selectedIndex ? 'legend-item selected' : 'legend-item'));
}

renderPieChart(projects);

let searchInput = document.querySelector('#projects-search, .searchBar');

if (searchInput) {
  function debounce(fn, wait = 150) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  const onInput = debounce((event) => {
    const query = (event.target.value || '').trim().toLowerCase();
    searchQuery = query;

    const filteredProjects = projects.filter((project) => {
      const hay = `${project.title || ''} ${project.description || ''} ${project.year || ''}`.toLowerCase();
      return hay.includes(query);
    });

    renderProjects(filteredProjects, projectsContainer, 'h2');
    if (titleElement) titleElement.textContent = `${filteredProjects.length} Projects`;

    renderPieChart();
  }, 150);

  searchInput.addEventListener('input', onInput);
}

