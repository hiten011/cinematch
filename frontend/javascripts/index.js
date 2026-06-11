document.body.style.display = "block";


document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('backToTop');
  if (!btn) return; // not every page has a back-to-top button

  window.addEventListener('scroll', () => {
    // Show button if page is scrolled down 200px
    btn.style.display = window.scrollY > 200 ? 'block' : 'none';
  });

  btn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
});
