// Run before the app paints, and again from the entry bundle for cached HTML.
document.documentElement.dataset.daiWindow =
  new URLSearchParams(window.location.search).get('companion') === '1'
    ? 'companion'
    : 'main';
