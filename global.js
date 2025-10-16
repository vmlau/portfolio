console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let navLinks = $$("nav a");
let currentLink = navLinks.find(
  (a) => a.host === location.host && a.pathname === location.pathname,
);
//currentLink.classList.add('current');
if (currentLink) {
  // or if (currentLink !== undefined)
  currentLink.classList.add('current');
}
//currentLink?.classList.add('current');
console.log(currentLink)