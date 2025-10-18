console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// let navLinks = $$("nav a");
// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname,
// );
// //currentLink.classList.add('current');s
// if (currentLink) {
//   // or if (currentLink !== undefined)
//   currentLink.classList.add('current');
// }
// //currentLink?.classList.add('current');
// console.log(currentLink)

let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'https://github.com/vmlau', title: 'GitHub' },
];
let nav = document.createElement('nav');
document.body.prepend(nav);
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  
  : "https://vmlau.github.io/portfolio/";         
for (let p of pages) {
  let url = p.url;
  if (!url.startsWith('http')) {
  url = BASE_PATH + url;
}
  let title = p.title;
  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;
  nav.append(a);
  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }
  // Set target="_blank" for external links
  if (a.host !== location.host) {
    a.target = "_blank";
    a.rel = "noopener noreferrer";
  }
}
document.body.insertAdjacentHTML(
  'afterbegin',
  `
	<label class="color-scheme">
		Theme:
		<select>
            <option value="light dark">Automatic</option>
			<option value="light">Light</option>
            <option value="dark">Dark</option>
		</select>
	</label>`,
);

const themeSelect = document.querySelector('.color-scheme select');
if (themeSelect) {
  if ("colorScheme" in localStorage) {
    themeSelect.value = localStorage.colorScheme;
    document.documentElement.style.setProperty('color-scheme', localStorage.colorScheme);
  }
  themeSelect.addEventListener('input', function (event) {
    console.log('color scheme changed to', event.target.value);
    document.documentElement.style.setProperty('color-scheme', event.target.value);
    localStorage.colorScheme = event.target.value;
  });
}

const form = document.querySelector('form');
form?.addEventListener('submit', function(event) {
  event.preventDefault();

  const data = new FormData(form);
  let params = [];
  for (let [name, value] of data) {
    params.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
    console.log(name, encodeURIComponent(value));
  }
  const url = form.action + '?' + params.join('&');
  location.href = url;
});