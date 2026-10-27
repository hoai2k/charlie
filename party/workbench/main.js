// Workbench boot: draw full-quality frames unless the URL picks a quality
// (?quality=optimized shows what most players see), then start the app. The
// engine reads ?quality when it loads, so this runs before importing it.
const url = new URL(location.href);
if (!url.searchParams.has('quality')) {
  url.searchParams.set('quality', 'full');
  history.replaceState(history.state, '', url);
}
import('./app.js').catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('afterbegin', `<p style="padding:12px;color:#c92a4a">The workbench failed to start: ${String(e && e.message || e)}</p>`);
});
