const form = document.getElementById('orderForm');
const $ = id => document.getElementById(id);

// Shared defaults from pricing.js, replaced by /api/pricing on load
let PRICING = DEFAULT_PRICING;

const TYPE_NAMES = { pvc: 'PVC banner', mesh: 'Mesh banner', roller: 'Roller banner' };
const FINISH_NAMES = { eyelets: 'Eyelets every 50cm', scaffold: 'Scaffold tube pockets', hemmed: 'Hemmed only' };
const EDGE_NAMES = { topbottom: 'top + bottom', sides: 'left + right', all: 'all edges' };
const RASTER = ['png', 'jpg', 'jpeg'];

const artwork = { file: null, id: null, objectUrl: null, px: null, uploading: false, xhr: null };

function readState() {
  const data = new FormData(form);
  const type = data.get('type');
  const state = {
    type,
    quantity: Math.max(1, Math.min(500, parseInt(data.get('quantity'), 10) || 1)),
    notes: data.get('notes') || ''
  };
  if (type === 'roller') {
    state.size = data.get('size');
    state.stand = data.get('stand');
    [state.widthCm, state.heightCm] = state.size.split('x').map(mm => Number(mm) / 10);
  } else {
    state.widthCm = Number(data.get('widthCm')) || 0;
    state.heightCm = Number(data.get('heightCm')) || 0;
    state.finishing = data.get('finishing');
    state.pocketEdges = data.get('pocketEdges');
    state.cableTies = data.get('cableTies') === 'on';
  }
  return state;
}

function price(s) {
  return priceBanner(PRICING, s);
}

function sizeValid(s) {
  return s.type === 'roller' || (s.widthCm >= 30 && s.widthCm <= 2000 && s.heightCm >= 30 && s.heightCm <= 500);
}

// --- Live preview ---
function renderPreview(s) {
  const stage = $('previewStage');
  const preview = $('preview');
  const finish = $('previewFinish');
  const base = $('rollerBase');
  const pad = 40;
  const maxW = stage.clientWidth - pad, maxH = stage.clientHeight - pad - (s.type === 'roller' ? 12 : 0);
  const ratio = (s.widthCm || 1) / (s.heightCm || 1);
  let w = maxW, h = maxW / ratio;
  if (h > maxH) { h = maxH; w = maxH * ratio; }
  preview.style.width = Math.max(8, w) + 'px';
  preview.style.height = Math.max(8, h) + 'px';

  base.hidden = s.type !== 'roller';
  base.style.width = w + 16 + 'px';
  $('previewArt').classList.toggle('mesh', s.type === 'mesh');

  finish.className = 'preview-finish';
  finish.innerHTML = '';
  if (s.type === 'roller' || !sizeValid(s)) return;

  if (s.finishing === 'hemmed') finish.classList.add('hemmed');

  if (s.finishing === 'eyelets') {
    // One eyelet every 50cm plus corners, thinned out on screen for very large banners
    const per = (len, px) => Math.min(Math.max(1, Math.round(len / 50)), Math.floor(px / 14));
    const nx = per(s.widthCm, w), ny = per(s.heightCm, h);
    const inset = 6;
    const dots = new Set();
    for (let i = 0; i <= nx; i++) {
      const x = inset + (w - 2 * inset) * i / nx;
      dots.add(`${x},${inset}`); dots.add(`${x},${h - inset}`);
    }
    for (let j = 1; j < ny; j++) {
      const y = inset + (h - 2 * inset) * j / ny;
      dots.add(`${inset},${y}`); dots.add(`${w - inset},${y}`);
    }
    finish.innerHTML = [...dots].map(d => {
      const [x, y] = d.split(',');
      return `<span class="eyelet" style="left:${x}px;top:${y}px"></span>`;
    }).join('');
  }

  if (s.finishing === 'scaffold') {
    const bars = [];
    if (s.pocketEdges !== 'sides') bars.push('<span class="pocket h" style="top:-4px"></span>', '<span class="pocket h" style="bottom:-4px"></span>');
    if (s.pocketEdges !== 'topbottom') bars.push('<span class="pocket v" style="left:-4px"></span>', '<span class="pocket v" style="right:-4px"></span>');
    finish.innerHTML = bars.join('');
  }
}

function renderSummary() {
  const s = readState();
  const isRoller = s.type === 'roller';

  document.querySelectorAll('[data-for]').forEach(el => {
    el.hidden = !el.dataset.for.split(' ').includes(s.type);
  });
  $('pocketEdges').hidden = isRoller || s.finishing !== 'scaffold';
  document.querySelectorAll('[data-step-num]').forEach((el, i) => { el.textContent = String((isRoller ? 3 : 4) + i).padStart(2, '0'); });

  const sizeText = `${fmtCm(s.widthCm)} × ${fmtCm(s.heightCm)}`;
  const rows = [
    ['Banner', TYPE_NAMES[s.type]],
    ['Size', sizeValid(s) ? sizeText : 'Check size'],
    isRoller
      ? ['Stand', s.stand === 'premium' ? 'Premium' : 'Standard']
      : ['Finishing', FINISH_NAMES[s.finishing] + (s.finishing === 'scaffold' ? ` (${EDGE_NAMES[s.pocketEdges]})` : '')],
    !isRoller && s.cableTies ? ['Extras', 'Cable ties'] : null,
    ['Artwork', artwork.file ? (artwork.id ? 'Uploaded ✓' : artwork.uploading ? 'Uploading…' : 'Upload failed') : 'Not added yet'],
    ['Quantity', String(s.quantity)]
  ].filter(Boolean);
  $('spec').innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${escapeHtml(v)}</dd>`).join('');

  const p = sizeValid(s) ? price(s) : { unit: 0, subtotal: 0, vat: 0, total: 0 };
  $('unitPrice').textContent = gbp(p.unit);
  $('subtotal').textContent = gbp(p.subtotal);
  $('vat').textContent = gbp(p.vat);
  $('total').textContent = gbp(p.total);

  renderPreview(s);
  renderArtChecks(s);
}

function fmtCm(cm) {
  return cm >= 100 ? `${+(cm / 100).toFixed(2)}m` : `${cm}cm`;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// --- Artwork upload ---
function extOf(name) { return name.split('.').pop().toLowerCase(); }

function setArtwork(file) {
  clearArtwork();
  const ext = extOf(file.name);
  const allowed = ['pdf', 'png', 'jpg', 'jpeg', 'tif', 'tiff', 'ai', 'eps', 'svg'];
  $('uploadStatus').hidden = false;
  $('fileName').textContent = file.name;
  $('fileSize').textContent = (file.size / 1024 / 1024).toFixed(1) + ' MB';
  $('fileBadge').textContent = ext.toUpperCase();

  if (!allowed.includes(ext)) {
    $('artChecks').innerHTML = '<li class="bad">We can\'t print this file type. Use PDF, AI, EPS, SVG, TIFF, PNG or JPG.</li>';
    return;
  }
  if (file.size > 250 * 1024 * 1024) {
    $('artChecks').innerHTML = '<li class="bad">This file is over 250 MB. Email us and we\'ll send a transfer link.</li>';
    return;
  }

  artwork.file = file;
  if (RASTER.includes(ext) || ext === 'svg') {
    artwork.objectUrl = URL.createObjectURL(file);
    const art = $('previewArt');
    art.style.backgroundImage = `url("${artwork.objectUrl}")`;
    art.classList.add('has-image');
    if (RASTER.includes(ext)) {
      const img = new Image();
      img.onload = () => { artwork.px = { w: img.naturalWidth, h: img.naturalHeight }; renderSummary(); };
      img.src = artwork.objectUrl;
    }
  }
  upload(file);
  renderSummary();
}

function upload(file) {
  const xhr = new XMLHttpRequest();
  artwork.xhr = xhr;
  artwork.uploading = true;
  xhr.open('POST', '/api/artwork');
  xhr.setRequestHeader('X-Filename', encodeURIComponent(file.name));
  xhr.upload.onprogress = e => {
    if (e.lengthComputable) $('progressBar').style.width = (e.loaded / e.total * 100) + '%';
  };
  xhr.onload = () => {
    artwork.uploading = false;
    const res = safeJson(xhr.responseText);
    if (xhr.status === 201) {
      artwork.id = res.id;
      $('progressBar').style.width = '100%';
    } else {
      artwork.error = res.error || 'Upload failed. Please try again.';
    }
    renderSummary();
  };
  xhr.onerror = () => {
    artwork.uploading = false;
    artwork.error = 'Upload failed. Check your connection and try again.';
    renderSummary();
  };
  xhr.send(file);
}

function safeJson(text) {
  try { return JSON.parse(text); } catch { return {}; }
}

function clearArtwork() {
  if (artwork.xhr && artwork.uploading) artwork.xhr.abort();
  if (artwork.objectUrl) URL.revokeObjectURL(artwork.objectUrl);
  Object.assign(artwork, { file: null, id: null, objectUrl: null, px: null, uploading: false, xhr: null, error: null });
  const art = $('previewArt');
  art.style.backgroundImage = '';
  art.classList.remove('has-image');
  $('uploadStatus').hidden = true;
  $('progressBar').style.width = '0';
  $('artChecks').innerHTML = '';
  $('artworkInput').value = '';
}

// Quick pre-flight on the file so customers spot problems before we do
function renderArtChecks(s) {
  if (!artwork.file) return;
  const items = [];
  if (artwork.error) items.push(['bad', artwork.error]);
  else if (artwork.id) items.push(['ok', 'Uploaded safely']);

  const ext = extOf(artwork.file.name);
  if (['pdf', 'ai', 'eps', 'svg'].includes(ext)) {
    items.push(['ok', 'Vector or print-ready format, great for sharp edges']);
  }

  if (artwork.px && sizeValid(s)) {
    const dpi = Math.round(artwork.px.w / (s.widthCm / 2.54));
    const target = s.type === 'roller' ? 100 : 50;
    if (dpi >= target) items.push(['ok', `About ${dpi} DPI at full size, looks good`]);
    else if (dpi >= target / 2) items.push(['warn', `About ${dpi} DPI at full size. Fine from a distance, may look soft up close`]);
    else items.push(['bad', `Only about ${dpi} DPI at full size. It will look pixelated, so send a larger file if you can`]);

    const artRatio = artwork.px.w / artwork.px.h;
    const bannerRatio = s.widthCm / s.heightCm;
    if (Math.abs(artRatio / bannerRatio - 1) > 0.05) {
      items.push(['warn', `Artwork shape (${artRatio.toFixed(2)}:1) differs from the banner (${bannerRatio.toFixed(2)}:1). We'll crop to fit unless you tell us otherwise`]);
    }
  }
  if (s.type !== 'roller' && s.finishing !== 'hemmed') {
    items.push(['warn', 'Keep text 5cm from the edges, clear of eyelets and pockets']);
  }
  $('artChecks').innerHTML = items.map(([c, t]) => `<li class="${c}">${escapeHtml(t)}</li>`).join('');
}

// --- Events ---
form.addEventListener('input', renderSummary);
form.addEventListener('change', renderSummary);

document.getElementById('sizePresets').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (!chip) return;
  form.widthCm.value = chip.dataset.w;
  form.heightCm.value = chip.dataset.h;
  renderSummary();
});

document.querySelectorAll('.qty-btn').forEach(btn => btn.addEventListener('click', () => {
  form.quantity.value = Math.max(1, Math.min(500, (parseInt(form.quantity.value, 10) || 1) + Number(btn.dataset.qty)));
  renderSummary();
}));

document.querySelectorAll('[data-pick]').forEach(btn => btn.addEventListener('click', () => {
  form.querySelector(`input[name=type][value=${btn.dataset.pick}]`).checked = true;
  renderSummary();
  $('order').scrollIntoView({ behavior: 'smooth' });
}));

const dropzone = $('dropzone');
$('artworkInput').addEventListener('change', e => { if (e.target.files[0]) setArtwork(e.target.files[0]); });
['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.add('drag'); }));
['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, e => { e.preventDefault(); dropzone.classList.remove('drag'); }));
dropzone.addEventListener('drop', e => { if (e.dataTransfer.files[0]) setArtwork(e.dataTransfer.files[0]); });
$('removeFile').addEventListener('click', () => { clearArtwork(); renderSummary(); });

form.addEventListener('submit', async e => {
  e.preventDefault();
  const s = readState();
  const err = $('formError');
  const fail = msg => { err.textContent = msg; err.hidden = false; };
  err.hidden = true;

  if (!sizeValid(s)) return fail('Please enter a size between 30cm and 20m wide, up to 5m tall.');
  if (artwork.uploading) return fail('Hang on, your artwork is still uploading.');
  if (!artwork.id) return fail('Please upload your artwork.');
  if (!form.customerName.value.trim()) return fail('Please enter your name.');
  if (!form.email.checkValidity() || !form.email.value) return fail('Please enter a valid email address.');

  const btn = $('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Placing order…';
  try {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...s,
        artworkId: artwork.id,
        customer: { name: form.customerName.value, email: form.email.value, phone: form.phone.value }
      })
    });
    const order = await res.json();
    if (!res.ok) throw new Error(order.error || 'Something went wrong');
    $('orderId').textContent = order.id;
    $('orderEmail').textContent = order.customer.email;
    form.hidden = true;
    $('success').hidden = false;
    $('order').scrollIntoView({ behavior: 'smooth' });
  } catch (ex) {
    fail(ex.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Place order';
  }
});

$('newOrder').addEventListener('click', () => {
  form.reset();
  clearArtwork();
  form.hidden = false;
  $('success').hidden = true;
  renderSummary();
});

const menuBtn = $('menuBtn');
menuBtn.addEventListener('click', () => {
  const open = $('navLinks').classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
  menuBtn.textContent = open ? 'Close' : 'Menu';
});
$('navLinks').addEventListener('click', e => {
  if (e.target.closest('a') && $('navLinks').classList.contains('open')) menuBtn.click();
});

// Arriving from the products page: ?type=&w=&h=&finishing=&art= prefill the form
const params = new URLSearchParams(location.search);
['type', 'size', 'stand', 'finishing', 'pocketEdges'].forEach(name => {
  const value = params.get(name);
  const input = value && form.querySelector(`input[name=${name}][value="${CSS.escape(value)}"]`);
  if (input) input.checked = true;
});
['widthCm', 'heightCm'].forEach((name, i) => {
  const value = Number(params.get(i ? 'h' : 'w'));
  if (value > 0) form[name].value = value;
});
if (params.get('art')) restoreArtwork(params.get('art'));

// Show a file that was already uploaded on the products page
async function restoreArtwork(id) {
  const res = await fetch(`/api/artwork/${encodeURIComponent(id)}`).catch(() => null);
  if (!res || !res.ok) return;
  const meta = await res.json();
  clearArtwork();
  artwork.file = { name: meta.name, size: meta.size };
  artwork.id = meta.id;
  $('uploadStatus').hidden = false;
  $('fileName').textContent = meta.name;
  $('fileSize').textContent = (meta.size / 1024 / 1024).toFixed(1) + ' MB';
  $('fileBadge').textContent = extOf(meta.name).toUpperCase();
  $('progressBar').style.width = '100%';
  if (RASTER.includes(extOf(meta.name))) {
    const url = `/api/artwork/${meta.id}/preview`;
    const art = $('previewArt');
    art.style.backgroundImage = `url("${url}")`;
    art.classList.add('has-image');
    const img = new Image();
    img.onload = () => { artwork.px = { w: img.naturalWidth, h: img.naturalHeight }; renderSummary(); };
    img.src = url;
  }
  renderSummary();
}

window.addEventListener('resize', renderSummary);
$('year').textContent = new Date().getFullYear();

fetch('/api/pricing').then(r => r.ok ? r.json() : null).then(p => {
  if (!p) return;
  PRICING = p;
  document.querySelector('[data-price=premiumStand]').textContent = '+£' + p.roller.premiumStand;
  document.querySelector('[data-price=scaffold]').textContent = '£' + p.finishing.scaffold + '/m';
  document.querySelector('[data-price=cableTies]').textContent = '£' + p.cableTies + ' per 10';
  renderSummary();
}).catch(() => {});

renderSummary();

// --- Scroll stopper: draw the printer video frame that matches scroll position ---
(function scrollScrub() {
  const section = $('scrub');
  const canvas = $('scrubCanvas');
  if (!section || !canvas) return;
  const ctx = canvas.getContext('2d');
  const FRAME_COUNT = 141;
  const frameUrl = i => `media/printer/${String(i).padStart(3, '0')}.webp`;
  const frames = new Array(FRAME_COUNT);
  const stages = section.querySelectorAll('.scrub-stages li');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = -1;
  let ticking = false;

  function load(i) {
    if (frames[i]) return frames[i];
    const img = new Image();
    img.decoding = 'async';
    img.src = frameUrl(i);
    img.onload = () => { if (i === targetFrame()) draw(i); };
    return (frames[i] = img);
  }

  // Nearest frame that has finished loading, so fast scrolling never shows a blank canvas
  function nearestLoaded(i) {
    for (let d = 0; d < FRAME_COUNT; d++) {
      const a = frames[i - d], b = frames[i + d];
      if (a && a.complete && a.naturalWidth) return a;
      if (b && b.complete && b.naturalWidth) return b;
    }
    return null;
  }

  function progress() {
    const rect = section.getBoundingClientRect();
    const travel = section.offsetHeight - window.innerHeight;
    return travel > 0 ? Math.min(1, Math.max(0, -rect.top / travel)) : 0;
  }

  function targetFrame() {
    return reduceMotion ? Math.round(FRAME_COUNT * 0.5) : Math.round(progress() * (FRAME_COUNT - 1));
  }

  function draw(i) {
    const img = nearestLoaded(i);
    if (img) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  function update() {
    ticking = false;
    const p = progress();
    const i = targetFrame();
    $('scrubBar').style.width = (p * 100) + '%';
    $('scrubHint').style.opacity = p > 0.9 ? 0 : 1;
    const stage = Math.min(stages.length - 1, Math.floor(p * stages.length));
    stages.forEach((li, n) => li.classList.toggle('active', n === stage));
    if (i !== current) {
      current = i;
      load(i);
      draw(i);
    }
  }

  function onScroll() {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }

  // Load the opening frame straight away, the rest once the section is close
  load(0).onload = () => draw(targetFrame());
  new IntersectionObserver((entries, obs) => {
    if (!entries[0].isIntersecting) return;
    for (let i = 0; i < FRAME_COUNT; i++) load(i);
    obs.disconnect();
  }, { rootMargin: '600px 0px' }).observe(section);

  if (!reduceMotion) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
  }
  update();
})();
