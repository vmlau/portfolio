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
  ? "/"                  // Local server
  : "/website/";         // GitHub Pages repo name
for (let p of pages) {
  let url = p.url;
  url = !url.startsWith('http') ? BASE_PATH + url : url;
  let title = p.title;
  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;
  nav.append(a);
  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
}
  if (a.host !== location.host && a.pathname === location.pathname) {
    a.target = "_blank";
}
}
document.body.insertAdjacentHTML(
  'afterbegin',
  `
	<label class="color-scheme">
		Theme:
		<select>
			<option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="light dark">Automatic</option>
		</select>
	</label>`,
);