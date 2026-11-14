// The kept page (/kept on the TV server): every favourite as it really is, for reading about a piece,
// seeing it large, or letting it go. Phones and laptops on the LAN; the TV has its own Kept room.
import { WALL_FONTS } from './artFeed';

export function keptPageHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b0a0a">
<title>Kept</title>
<link href="${WALL_FONTS}" rel="stylesheet">
<style>
:root{--ground:#0b0a0a;--paper:#f5f2ed;--mist:rgba(245,242,237,.62);--faint:rgba(245,242,237,.40);--line:rgba(245,242,237,.12);
  --serif:'Newsreader',Georgia,serif;--sans:'Geist',system-ui,-apple-system,sans-serif;color-scheme:dark}
*{margin:0;padding:0;box-sizing:border-box}
html{background:var(--ground)}
body{background:var(--ground);color:var(--paper);font-family:var(--sans);font-weight:400;-webkit-font-smoothing:antialiased;
  padding:clamp(28px,6vw,88px) max(16px,env(safe-area-inset-right)) 96px max(16px,env(safe-area-inset-left))}
header,main{max-width:1440px;margin:0 auto}
@media (min-width:700px){body{padding-left:5vw;padding-right:5vw}}
h1{font-family:var(--serif);font-optical-sizing:auto;font-weight:300;font-size:clamp(44px,7vw,96px);line-height:1;letter-spacing:-.02em}
.count{color:var(--mist);font-size:clamp(14px,1.2vw,16px);margin-top:14px}
main{margin-top:clamp(36px,5vw,64px);columns:300px;column-gap:clamp(20px,3vw,44px)}
figure{break-inside:avoid;margin-bottom:clamp(36px,4vw,56px);transition:opacity .4s}
figure.going{opacity:.35}
.frame{display:block;width:100%;border:0;padding:0;background:none;cursor:zoom-in}
.frame img{display:block;width:100%;height:auto;background:var(--tone,#1b1a19);
  box-shadow:0 1px 3px rgba(0,0,0,.4),0 14px 36px rgba(0,0,0,.35);opacity:0;transition:opacity .6s}
.frame img.in{opacity:1}
figcaption{margin-top:16px}
.t{font-family:var(--serif);font-optical-sizing:auto;font-weight:400;font-size:20px;line-height:1.2;letter-spacing:-.005em}
.a{color:var(--mist);font-size:14px;margin-top:6px}
.m{color:var(--faint);font-size:13px;margin-top:3px;line-height:1.4}
.row{display:flex;flex-wrap:wrap;gap:4px 16px;margin-top:10px;font-size:13px;color:var(--faint)}
.row a,.row button{color:var(--mist);background:none;border:0;font:inherit;cursor:pointer;text-decoration:none;padding:0}
.row a:hover,.row button:hover{color:var(--paper)}
.empty{columns:auto;color:var(--mist);font-family:var(--serif);font-size:22px;line-height:1.4;max-width:30em}
/* Seeing one large, on a wall in its own colours. */
.look{position:fixed;inset:0;z-index:10;display:none;background:
  radial-gradient(90% 70% at 50% -10%,var(--light) 0%,transparent 70%),
  radial-gradient(55% 60% at 12% 92%,var(--poolA) 0%,transparent 72%),
  radial-gradient(50% 55% at 92% 78%,var(--poolB) 0%,transparent 70%),var(--base)}
.look.on{display:block}
.look img{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);max-width:88vw;max-height:72vh;
  box-shadow:0 2px 6px rgba(0,0,0,.35),0 24px 60px rgba(0,0,0,.45),0 60px 140px rgba(0,0,0,.35)}
.look .cap{position:absolute;left:max(16px,4.2vw);right:max(16px,4.2vw);bottom:max(20px,5vh);text-shadow:0 1px 18px rgba(0,0,0,.45)}
.look .t{font-size:clamp(22px,2.4vw,40px);line-height:1.12}
.look .a{font-size:clamp(14px,1.1vw,18px);margin-top:.5em}
.look .close{position:absolute;top:12px;right:12px;width:44px;height:44px;border:0;background:none;color:var(--mist);font:300 28px/1 var(--sans);cursor:pointer}
.look .close:hover{color:var(--paper)}
</style>
</head>
<body>
<header><h1>Kept</h1><p class="count" id="count">&nbsp;</p></header>
<main id="grid"></main>
<div class="look" id="look" role="dialog" aria-modal="true" aria-label="Painting">
  <img id="lookImg" alt="">
  <div class="cap"><div class="t" id="lookT"></div><div class="a" id="lookA"></div><div class="m" id="lookM"></div></div>
  <button class="close" id="lookClose" aria-label="Close">×</button>
</div>
<script>
var pieces = [], open = -1, going = {};
var grid = document.getElementById('grid'), look = document.getElementById('look');
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
function byline(p) { return [p.artist, p.year].filter(Boolean).join(', '); }
function meta(p) { return [p.movement, p.medium, p.collection].filter(Boolean).join(' · '); }
function day(ms) { return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
function museum(p) { return p.collection ? 'At ' + p.collection.replace(/^The /, 'the ') : 'At the museum'; }

function render() {
  var n = pieces.length;
  document.getElementById('count').textContent = n === 0 ? '' : n === 1 ? 'One painting, kept from the wall.' : n + ' paintings, kept from the wall.';
  if (n === 0) {
    grid.className = 'empty';
    grid.innerHTML = 'Nothing kept yet. Hold OK on the remote while a painting is up, and it comes here.';
    return;
  }
  grid.className = '';
  grid.innerHTML = pieces.map(function(p, i) {
    var ratio = p.width && p.height ? ' width="' + p.width + '" height="' + p.height + '"' : '';
    return '<figure data-id="' + esc(p.id) + '"' + (going[p.id] ? ' class="going"' : '') + '>' +
      '<button class="frame" data-i="' + i + '" aria-label="See ' + esc(p.title) + ' large">' +
      '<img loading="lazy" src="' + esc(p.image) + '"' + ratio + ' alt="" style="--tone:' + esc((p.palette || [])[0] || '#1b1a19') + '" onload="this.classList.add(\\'in\\')"></button>' +
      '<figcaption><div class="t">' + esc(p.title) + '</div>' +
      (byline(p) ? '<div class="a">' + esc(byline(p)) + '</div>' : '') +
      (meta(p) ? '<div class="m">' + esc(meta(p)) + '</div>' : '') +
      '<div class="row"><span>Kept ' + esc(day(p.keptAt)) + '</span>' +
      (p.sourceUrl ? '<a href="' + esc(p.sourceUrl) + '" target="_blank" rel="noopener">' + esc(museum(p)) + '</a>' : '') +
      '<button data-remove="' + esc(p.id) + '">' + (going[p.id] ? 'Undo' : 'Remove') + '</button></div>' +
      '</figcaption></figure>';
  }).join('');
}

function load() {
  fetch('/kept.json?walls=1', { cache: 'no-store' }).then(function(r) { return r.json(); }).then(function(d) {
    pieces = d.pieces || [];
    render();
  }).catch(function() { document.getElementById('count').textContent = 'ArtSaver didn’t answer. Try again in a moment.'; });
}

function unkeep(id) {
  delete going[id];
  return fetch('/unkeep?id=' + encodeURIComponent(id), { method: 'POST' });
}

grid.addEventListener('click', function(e) {
  var frame = e.target.closest('.frame');
  if (frame) { show(+frame.dataset.i); return; }
  var rm = e.target.closest('[data-remove]');
  if (!rm) return;
  var id = rm.dataset.remove;
  if (going[id]) { clearTimeout(going[id]); delete going[id]; render(); return; }
  // A few seconds to change your mind, then it goes.
  going[id] = setTimeout(function() {
    unkeep(id).then(function() { pieces = pieces.filter(function(p) { return p.id !== id; }); render(); });
  }, 5000);
  render();
});

window.addEventListener('pagehide', function() {
  Object.keys(going).forEach(function(id) { navigator.sendBeacon('/unkeep?id=' + encodeURIComponent(id)); });
});

function show(i) {
  if (i < 0 || i >= pieces.length) return;
  open = i;
  var p = pieces[i], w = p.wall || {};
  ['base', 'poolA', 'poolB', 'light'].forEach(function(k) { if (w[k]) look.style.setProperty('--' + k, w[k]); });
  var img = document.getElementById('lookImg');
  img.src = p.image;
  img.alt = p.title || '';
  document.getElementById('lookT').textContent = p.title || '';
  document.getElementById('lookA').textContent = byline(p);
  document.getElementById('lookM').textContent = meta(p);
  look.classList.add('on');
  document.body.style.overflow = 'hidden';
}
function hide() { open = -1; look.classList.remove('on'); document.body.style.overflow = ''; }

document.getElementById('lookClose').addEventListener('click', hide);
look.addEventListener('click', function(e) { if (e.target === look) hide(); });
document.addEventListener('keydown', function(e) {
  if (open < 0) return;
  if (e.key === 'Escape') hide();
  else if (e.key === 'ArrowRight') show(open + 1);
  else if (e.key === 'ArrowLeft') show(open - 1);
});
var touchX = null;
look.addEventListener('touchstart', function(e) { touchX = e.touches[0].clientX; }, { passive: true });
look.addEventListener('touchend', function(e) {
  if (touchX == null) return;
  var dx = e.changedTouches[0].clientX - touchX;
  touchX = null;
  if (Math.abs(dx) > 50) show(open + (dx < 0 ? 1 : -1));
});
document.addEventListener('visibilitychange', function() { if (!document.hidden && open < 0) load(); });
load();
</script>
</body>
</html>`;
}
