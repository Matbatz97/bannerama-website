// Products page: per-product price panels, artwork upload and the price list
let PRICING = DEFAULT_PRICING;

const ALLOWED = ['pdf', 'png', 'jpg', 'jpeg', 'tif', 'tiff', 'ai', 'eps', 'svg'];
const MAX_BYTES = 250 * 1024 * 1024;
const fmtSqm = n => n.toFixed(2) + ' m²';
const fmtM = cm => `${+(cm / 100).toFixed(2)}m`;
const extOf = name => name.split('.').pop().toLowerCase();

function rows(list) {
  return list.map(([k, v, cls]) => `<div${cls ? ` class="${cls}"` : ''}><dt>${k}</dt><dd>${v}</dd></div>`).join('');
}

// --- One panel per product ---
function setupPanel(panel) {
  const type = panel.dataset.type;
  const q = sel => panel.querySelector(sel);
  const upload = { id: null, xhr: null, busy: false };

  function readState() {
    const data = new FormData(panel);
    const s = { type, quantity: 1 };
    if (type === 'roller') {
      s.size = data.get('size');
      s.stand = data.get('stand');
    } else {
      s.widthCm = Number(data.get('widthCm')) || 0;
      s.heightCm = Number(data.get('heightCm')) || 0;
      s.finishing = data.get('finishing');
      s.pocketEdges = 'topbottom';
    }
    return s;
  }

  function sizeValid(s) {
    return type === 'roller' || (s.widthCm >= 30 && s.widthCm <= 2000 && s.heightCm >= 30 && s.heightCm <= 500);
  }

  function render() {
    const s = readState();
    if (!sizeValid(s)) {
      q('[data-breakdown]').innerHTML = rows([['Size', 'Enter 30cm to 20m wide, up to 5m tall']]);
      q('[data-total]').textContent = '–';
      updateContinue(s);
      return;
    }
    const p = priceBanner(PRICING, s);
    q('[data-rate]').textContent = gbp(p.rate);

    const list = [];
    if (type === 'roller') {
      const [w, h] = s.size.split('x').map(mm => mm / 10);
      list.push(['Banner + standard stand', `${w} × ${h}cm`]);
      list.push(['Price', gbp(p.print)]);
      list.push(['Area', fmtSqm(p.area)]);
      if (p.stand) list.push(['Premium stand', '+' + gbp(p.stand)]);
    } else {
      list.push(['Area', `${fmtM(s.widthCm)} × ${fmtM(s.heightCm)} = ${fmtSqm(p.area)}`]);
      list.push(['Print', `${fmtSqm(p.area)} × ${gbp(p.rate)} = ${gbp(p.area * p.rate)}`]);
      if (p.minApplied) list.push(['Minimum order', gbp(p.print), 'note']);
      if (s.finishing === 'scaffold') {
        list.push(['Scaffold pockets', `${pocketMetres(s).toFixed(2)}m × ${gbp(PRICING.finishing.scaffold)} = ${gbp(p.finishing)}`]);
      } else {
        list.push([s.finishing === 'eyelets' ? 'Eyelets' : 'Hemmed edges', 'Free']);
      }
    }
    list.push(['Subtotal ex VAT', gbp(p.subtotal), 'strong']);
    list.push(['VAT 20%', gbp(p.vat)]);
    q('[data-breakdown]').innerHTML = rows(list);
    q('[data-total]').textContent = gbp(p.total);
    updateContinue(s);
  }

  // The continue button carries everything chosen here into the order form
  function updateContinue(s) {
    const params = new URLSearchParams({ type });
    if (type === 'roller') {
      params.set('size', s.size);
      params.set('stand', s.stand);
    } else {
      params.set('w', s.widthCm);
      params.set('h', s.heightCm);
      params.set('finishing', s.finishing);
      if (s.finishing === 'scaffold') params.set('pocketEdges', s.pocketEdges);
    }
    if (upload.id) params.set('art', upload.id);
    const btn = q('[data-continue]');
    btn.href = `/?${params}#order`;
    btn.textContent = upload.id ? 'Continue with this artwork' : 'Continue to order';
    btn.classList.toggle('is-busy', upload.busy);
    btn.setAttribute('aria-disabled', upload.busy);
  }

  function showFile(file, status) {
    q('[data-file]').hidden = false;
    q('[data-badge]').textContent = extOf(file.name).toUpperCase();
    q('[data-name]').textContent = file.name;
    q('[data-status]').textContent = status;
  }

  function setStatus(text, cls) {
    const el = q('[data-status]');
    el.textContent = text;
    el.className = cls || '';
  }

  function clearFile() {
    if (upload.xhr && upload.busy) upload.xhr.abort();
    Object.assign(upload, { id: null, xhr: null, busy: false });
    q('[data-file]').hidden = true;
    q('[data-progress]').style.width = '0';
    q('input[type=file]').value = '';
    render();
  }

  function startUpload(file) {
    clearFile();
    const ext = extOf(file.name);
    showFile(file, (file.size / 1024 / 1024).toFixed(1) + ' MB');
    if (!ALLOWED.includes(ext)) return setStatus('We can\'t print this file type. Use PDF, AI, EPS, SVG, TIFF, PNG or JPG.', 'bad');
    if (file.size > MAX_BYTES) return setStatus('Over 250 MB. Email us and we\'ll send a transfer link.', 'bad');

    const xhr = new XMLHttpRequest();
    Object.assign(upload, { xhr, busy: true });
    render();
    xhr.open('POST', '/api/artwork');
    xhr.setRequestHeader('X-Filename', encodeURIComponent(file.name));
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) q('[data-progress]').style.width = (e.loaded / e.total * 100) + '%';
    };
    xhr.onload = () => {
      upload.busy = false;
      let res = {};
      try { res = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status === 201) {
        upload.id = res.id;
        q('[data-progress]').style.width = '100%';
        setStatus('Uploaded ✓ We\'ll check it before printing', 'ok');
      } else {
        setStatus(res.error || 'Upload failed. Please try again.', 'bad');
      }
      render();
    };
    xhr.onerror = () => {
      upload.busy = false;
      setStatus('Upload failed. Check your connection and try again.', 'bad');
      render();
    };
    xhr.send(file);
  }

  panel.addEventListener('input', render);
  panel.addEventListener('change', e => {
    if (e.target.type === 'file') { if (e.target.files[0]) startUpload(e.target.files[0]); return; }
    render();
  });
  const presets = q('[data-presets]');
  if (presets) presets.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    panel.widthCm.value = chip.dataset.w;
    panel.heightCm.value = chip.dataset.h;
    render();
  });

  const dz = q('.dropzone');
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', e => { if (e.dataTransfer.files[0]) startUpload(e.dataTransfer.files[0]); });
  q('[data-remove]').addEventListener('click', clearFile);
  q('[data-continue]').addEventListener('click', e => { if (upload.busy) e.preventDefault(); });
  panel.addEventListener('submit', e => e.preventDefault());

  return render;
}

// --- Price list tables ---
function renderPriceList() {
  const P = PRICING;
  const set = (sel, html) => { document.querySelector(sel).innerHTML = html; };
  const tr = cells => `<tr>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;

  set('[data-rates]', [
    tr(['PVC banner', `<b>${gbp(P.pvc.perSqm)}</b>`, gbp(P.pvc.minCharge)]),
    tr(['Mesh banner', `<b>${gbp(P.mesh.perSqm)}</b>`, gbp(P.mesh.minCharge)])
  ].join(''));

  set('[data-extras]', [
    tr(['Eyelets every 50cm', '<b>Free</b>']),
    tr(['Hemmed edges', '<b>Free</b>']),
    tr(['Scaffold tube pockets', `<b>${gbp(P.finishing.scaffold)}</b> per metre of pocket`]),
    tr(['Cable ties', `<b>${gbp(P.cableTies)}</b> per 10`])
  ].join(''));

  const sizes = [[200, 100], [300, 100], [400, 100], [300, 150], [600, 200], [1000, 200]];
  set('[data-examples]', sizes.map(([w, h]) => {
    const pvc = priceBanner(P, { type: 'pvc', widthCm: w, heightCm: h, finishing: 'eyelets' });
    const mesh = priceBanner(P, { type: 'mesh', widthCm: w, heightCm: h, finishing: 'eyelets' });
    return tr([`${fmtM(w)} × ${fmtM(h)}`, fmtSqm(pvc.area), `<b>${gbp(pvc.unit)}</b>`, `<b>${gbp(mesh.unit)}</b>`]);
  }).join(''));

  set('[data-rollers]', Object.keys(P.roller.sizes).map(size => {
    const r = priceBanner(P, { type: 'roller', size, stand: 'standard' });
    const [w, h] = size.split('x').map(mm => mm / 10);
    return tr([`${w} × ${h}cm`, `<b>${gbp(r.unit)}</b>`, `${gbp(r.rate)} per m²`]);
  }).join(''));
}

const renderers = [...document.querySelectorAll('.quick')].map(setupPanel);
function renderAll() {
  renderers.forEach(fn => fn());
  renderPriceList();
}

// Live prices from the server
fetch('/api/pricing').then(r => r.ok ? r.json() : null).then(p => {
  if (p) { PRICING = p; renderAll(); }
}).catch(() => {});

// Mobile menu and footer year
const menuBtn = document.getElementById('menuBtn');
const navLinks = document.getElementById('navLinks');
menuBtn.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
  menuBtn.textContent = open ? 'Close' : 'Menu';
});
document.getElementById('year').textContent = new Date().getFullYear();

renderAll();
