(function () {
  try {
    var t = localStorage.getItem('theme');
    var root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (t === 'light' || t === 'dark') {
      root.classList.add(t);
      root.style.colorScheme = t;
    }
  } catch (e) {}
})();
