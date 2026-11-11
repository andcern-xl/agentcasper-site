/* Shop: reads /shop/products.json and /shop/size-chart.json. No server.
   Text from those files is always set with textContent, never as HTML. */
(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function get(url) { return fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }
  function money(n, cur) { try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(n) + ' ' + cur; } catch (e) { return cur + ' ' + n; } }
  /* p.buy is one link for every size (text), or one link per size ({"S": "...", "M": "..."}) as create_stripe_links.py writes it */
  function linkFor(p, size) { var b = p.buy; if (!b) return null; if (typeof b === 'string') return /^https:\/\/buy\.stripe\.com\//.test(b) ? b : null; var u = b[size]; return typeof u === 'string' && /^https:\/\/buy\.stripe\.com\//.test(u) ? u : null; }
  /* [text](url) in a description becomes a link; only site paths and https links are allowed, everything else stays text */
  function addText(node, t) {
    var parts = t.split(/\*([^*]+)\*/);
    parts.forEach(function (x, i) { if (!x) return; if (i % 2) node.appendChild(el('em', null, x)); else node.appendChild(document.createTextNode(x)); });
  }
  function linkify(node, text) {
    var re = /\[([^\]]+)\]\((\/[^)\s]*|https:\/\/[^)\s]+)\)/g, last = 0, m;
    while ((m = re.exec(text))) {
      addText(node, text.slice(last, m.index));
      var a = el('a', null, m[1]); a.href = m[2]; if (m[2].charAt(0) !== '/') { a.target = '_blank'; a.rel = 'noopener'; } node.appendChild(a);
      last = re.lastIndex;
    }
    addText(node, text.slice(last));
  }
  /* Description layout: first paragraph is the lead, a paragraph whose first line ends in ":" gets a label and its "- " lines become a list, the last of three or more paragraphs is the closing line */
  function describe(text) {
    var box = el('div', 'desc'), blocks = text.split(/\n\s*\n/);
    blocks.forEach(function (b, i) {
      var lines = b.split('\n').filter(function (l) { return l.trim(); }), items = lines.filter(function (l) { return /^\s*-\s/.test(l); });
      if (items.length) {
        var head = lines.filter(function (l) { return !/^\s*-\s/.test(l); });
        if (head.length) { var lb = el('p', 'desc-label'); linkify(lb, head.join(' ')); box.appendChild(lb); }
        var ul = el('ul'); items.forEach(function (l) { var li = el('li'); linkify(li, l.replace(/^\s*-\s/, '')); ul.appendChild(li); }); box.appendChild(ul);
        return;
      }
      var cls = i === 0 ? 'desc-lead' : (i === blocks.length - 1 && blocks.length > 2 ? 'desc-closing' : 'desc-body');
      var p = el('p', cls);
      lines.forEach(function (l, n) { if (n) p.appendChild(document.createElement('br')); linkify(p, l); });
      if (cls !== 'desc-closing') { p.textContent = ''; linkify(p, lines.join(' ')); }
      box.appendChild(p);
    });
    return box;
  }
  function safeId(s) { return String(s).replace(/[^A-Za-z0-9_-]/g, ''); }

  Promise.all([get('/shop/products.json'), get('/shop/size-chart.json').catch(function () { return null; })]).then(function (d) {
    var cat = d[0], chart = d[1], cur = cat.currency || 'USD', sizes = cat.sizes || ['S', 'M', 'L', 'XL', 'XXL'];
    var list = (cat.products || []).filter(function (p) { return p && p.id && p.name && !p.hidden; });
    if ($('#grid')) renderGrid(list, cur);
    if ($('#product')) renderProduct(list, cur, sizes, chart, cat.deliveryNote);
  }).catch(function () {
    var t = $('#grid') || $('#product'); if (t) { t.textContent = ''; t.appendChild(el('p', 'empty', 'The shop could not load. Please try again in a moment.')); }
  });

  function renderGrid(list, cur) {
    var g = $('#grid'); g.textContent = '';
    if (!list.length) { g.appendChild(el('p', 'empty', 'The catalog is on its way. Check back soon.')); return; }
    list.forEach(function (p) {
      var a = el('a', 'tile'); a.href = '/shop/?p=' + encodeURIComponent(p.id);
      var im = el('div', 'tile-img');
      if (p.images && p.images[0]) { var i = el('img'); i.src = p.images[0]; i.alt = p.name; i.loading = 'lazy'; im.appendChild(i); }
      a.appendChild(im); a.appendChild(el('h3', null, p.name)); a.appendChild(el('p', 'price', money(p.price, cur)));
      g.appendChild(a);
    });
  }

  function renderProduct(list, cur, allSizes, chart, deliveryNote) {
    var root = $('#product'); root.textContent = '';
    var id = new URLSearchParams(location.search).get('p');
    /* soldOut: true = the whole product is sold out; an array = only those sizes. /shop/ opens on the first product still for sale */
    var p = list.filter(function (x) { return x.id === id; })[0] || (id ? null : (list.filter(function (x) { return x.soldOut !== true; })[0] || list[0]));
    if (!list.length) { root.appendChild(el('p', 'empty', 'The catalog is on its way. Check back soon.')); return; }
    if (!p) { root.appendChild(el('p', 'empty', 'We could not find that product.')); var b = el('a', 'btn ghost', 'Back to the shop'); b.href = '/shop/'; root.appendChild(b); return; }
    document.title = (list.length > 1 ? 'Shop' : p.name) + ' | Agent Casper';
    var gone = p.soldOut === true;
    var sizes = p.sizes || allSizes, out = gone ? sizes.slice() : (Array.isArray(p.soldOut) ? p.soldOut : []), chosen = null;

    var left = el('div', 'gallery'), main = el('div', 'main-img'), mi = el('img');
    var imgs = p.images || [];
    var pic = 0;   /* which photo is showing (not `cur`: that is the currency) */
    if (imgs[0]) {
      mi.src = imgs[0]; mi.alt = p.name; main.appendChild(mi);
      /* Click the photo to open it full screen and zoom into the details */
      main.tabIndex = 0; main.setAttribute('role', 'button'); main.setAttribute('aria-label', 'Zoom into ' + p.name + ' photo');
      var ico = el('span', 'zoom-ico'); ico.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      main.appendChild(ico);
      main.addEventListener('click', function () { openZoom(p, pic); });
      main.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openZoom(p, pic); } });
    }
    left.appendChild(main);
    if (imgs.length > 1) {
      var th = el('div', 'thumbs');
      imgs.forEach(function (u, n) { var t = el('button', n ? '' : 'on'); t.type = 'button'; t.setAttribute('aria-label', 'Photo ' + (n + 1)); var ti = el('img'); ti.src = u; ti.alt = ''; t.appendChild(ti);
        t.addEventListener('click', function () { mi.src = u; pic = n; [].forEach.call(th.children, function (c) { c.classList.remove('on'); }); t.classList.add('on'); }); th.appendChild(t); });
      left.appendChild(th);
    }

    var right = el('div', 'info');
    /* One storefront: pick the shirt here, the page swaps to it without leaving /shop/ */
    if (list.length > 1) {
      right.appendChild(el('div', 'size-head')).appendChild(el('strong', null, 'Shirt'));
      var picks = el('div', 'picks'); picks.setAttribute('role', 'radiogroup'); picks.setAttribute('aria-label', 'Shirt');
      list.forEach(function (q) {
        var b = el('button', 'pick' + (q === p ? ' on' : '')); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', q === p ? 'true' : 'false');
        if (q.images && q.images[0]) { var qi = el('img'); qi.src = q.images[0]; qi.alt = ''; b.appendChild(qi); }
        var t = el('span', null, q.short || q.name); t.appendChild(el('small', null, q.soldOut === true ? 'Sold out' : money(q.price, cur))); b.appendChild(t);
        b.addEventListener('click', function () {
          if (q === p) return;
          history.replaceState(null, '', location.pathname + '?p=' + encodeURIComponent(q.id));
          renderProduct(list, cur, allSizes, chart, deliveryNote);
        });
        picks.appendChild(b);
      });
      right.appendChild(picks);
    }
    right.appendChild(el('h2', 'pname', p.name));
    right.appendChild(el('p', 'price big', money(p.price, cur)));

    var head = el('div', 'size-head'); head.appendChild(el('strong', null, 'Size'));
    var pc = p.chart || (p.noChart ? null : chart), hasChart = pc && pc.rows && pc.rows.length;
    if (hasChart) { var cb = el('button', 'link', 'Size chart'); cb.type = 'button'; cb.addEventListener('click', function () { openChart(pc); }); head.appendChild(cb); }
    right.appendChild(head);
    var row = el('div', 'sizes'); row.setAttribute('role', 'radiogroup'); row.setAttribute('aria-label', 'Size');
    var msg = el('p', 'note', 'Choose a size to continue.');
    var buy = el('button', 'btn primary buy', 'Buy'); buy.type = 'button'; buy.disabled = true;
    sizes.forEach(function (s) {
      var b = el('button', 'size', s); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
      if (out.indexOf(s) > -1) { b.disabled = true; b.title = 'Sold out'; b.classList.add('out'); }
      b.addEventListener('click', function () {
        chosen = s; [].forEach.call(row.children, function (c) { c.classList.remove('on'); c.setAttribute('aria-checked', 'false'); });
        b.classList.add('on'); b.setAttribute('aria-checked', 'true');
        if (linkFor(p, s)) { buy.disabled = false; msg.textContent = 'Size ' + s + ' selected.'; } else { buy.disabled = true; msg.textContent = 'Size ' + s + ' selected. Buying opens soon.'; }
      });
      row.appendChild(b);
    });
    right.appendChild(row);
    if (!p.buy) buy.textContent = 'Not available yet';
    if (gone) { buy.textContent = 'Sold out'; buy.disabled = true; msg.textContent = ''; }
    buy.addEventListener('click', function () {
      var u = chosen && linkFor(p, chosen); if (!u) return;
      /* Stripe Payment Link; the product and size also travel as client_reference_id (letters, numbers, - and _ only) */
      location.href = u + (u.indexOf('?') > -1 ? '&' : '?') + 'client_reference_id=' + encodeURIComponent(safeId(p.id) + '_' + safeId(chosen));
    });
    var br = el('div', 'buyrow'); br.appendChild(buy); br.appendChild(msg); right.appendChild(br);
    if (deliveryNote) right.appendChild(el('p', 'note delivery', deliveryNote));
    /* Description after Buy, so shirt, size and Buy stay on screen (standard shop order) */
    if (p.description) { var dsc = describe(p.description); dsc.classList.add('after'); right.appendChild(dsc); }

    var wrap = el('div', 'product-grid'); wrap.appendChild(left); wrap.appendChild(right); root.appendChild(wrap);
  }

  /* Zoom view: full screen, click or tap to magnify 2.5x at that point, move (or drag) to look around.
     p.zoom holds optional larger files, same order as p.images. */
  var Z = { list: [], i: 0, on: false, down: false, moved: 0 };
  function zoomShow() {
    var d = $('#zoom'), im = $('#zoom-img');
    d.classList.remove('zoomed'); Z.on = false;
    im.src = Z.list[Z.i]; Z.ox = Z.oy = 50; im.style.transformOrigin = '50% 50%';
    $('#zoom-prev').hidden = $('#zoom-next').hidden = Z.list.length < 2;
    $('#zoom-count').textContent = Z.list.length > 1 ? (Z.i + 1) + ' / ' + Z.list.length : '';
  }
  function openZoom(p, i) {
    var d = $('#zoom'); if (!d) return;
    var imgs = p.images || [], big = p.zoom || [];
    Z.list = imgs.map(function (u, n) { return big[n] || u; }); Z.i = i || 0;
    $('#zoom-img').alt = p.name;
    zoomShow();
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }
  function zoomStep(k) { if (Z.list.length < 2) return; Z.i = (Z.i + k + Z.list.length) % Z.list.length; zoomShow(); }
  (function () {
    var d = $('#zoom'); if (!d) return;
    var im = $('#zoom-img');
    var SCALE = 2.5, stage = $('#zoom-stage');
    function clamp(v) { return Math.min(100, Math.max(0, v)); }
    /* Position in the UNscaled image: the scaled box would only move the view part of the way */
    function box() { var w = im.offsetWidth, h = im.offsetHeight; return { l: (stage.clientWidth - w) / 2, t: (stage.clientHeight - h) / 2, w: w, h: h }; }
    function setOrigin(x, y) { Z.ox = clamp(x); Z.oy = clamp(y); im.style.transformOrigin = Z.ox + '% ' + Z.oy + '%'; }
    function aim(e) { var b = box(); setOrigin((e.clientX - b.l) / b.w * 100, (e.clientY - b.t) / b.h * 100); }
    /* Touch: the picture follows the finger, like a photo app */
    function drag(e) { var b = box(); setOrigin(Z.sx - (e.clientX - Z.x) / b.w * 100 / (SCALE - 1), Z.sy - (e.clientY - Z.y) / b.h * 100 / (SCALE - 1)); }
    im.addEventListener('pointerdown', function (e) { Z.down = true; Z.moved = 0; Z.x = e.clientX; Z.y = e.clientY; Z.sx = Z.ox == null ? 50 : Z.ox; Z.sy = Z.oy == null ? 50 : Z.oy; });
    im.addEventListener('pointermove', function (e) {
      if (Z.down) Z.moved = Math.max(Z.moved, Math.abs(e.clientX - Z.x) + Math.abs(e.clientY - Z.y));
      if (!Z.on) return;
      if (e.pointerType === 'mouse') aim(e); else if (Z.down) drag(e);
    });
    im.addEventListener('pointerup', function (e) {
      Z.down = false;
      if (Z.moved > 8) return;                      /* a drag looks around, it does not toggle */
      if (!Z.on) aim(e);
      Z.on = !Z.on; d.classList.toggle('zoomed', Z.on);   /* zooming out keeps the same point, so it shrinks in place */
    });
    im.addEventListener('pointercancel', function () { Z.down = false; });
    window.addEventListener('pointerup', function () { Z.down = false; });   /* released outside the picture */
    $('#zoom-prev').addEventListener('click', function () { zoomStep(-1); });
    $('#zoom-next').addEventListener('click', function () { zoomStep(1); });
    $('#zoom-x').addEventListener('click', function () { d.close(); });
    d.addEventListener('click', function (e) { if (e.target === d || e.target.id === 'zoom-stage') d.close(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') zoomStep(-1); if (e.key === 'ArrowRight') zoomStep(1); });
  })();

  function openChart(c) {
    var d = $('#chart'); if (!d) return; var box = $('#chart-body'); box.textContent = '';
    box.appendChild(el('h2', null, c.title || 'Size chart'));
    if (c.note) box.appendChild(el('p', 'note', c.note));
    var t = el('table'), tr = el('tr');
    (c.columns || []).forEach(function (h) { tr.appendChild(el('th', null, h)); });
    var th = el('thead'); th.appendChild(tr); t.appendChild(th);
    var tb = el('tbody'); (c.rows || []).forEach(function (r) { var x = el('tr'); r.forEach(function (v) { x.appendChild(el('td', null, v)); }); tb.appendChild(x); }); t.appendChild(tb);
    var sc = el('div', 'tscroll'); sc.appendChild(t); box.appendChild(sc);
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
  }
  var dlg = $('#chart'); if (dlg) { dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.closest('.x')) dlg.close(); }); }
})();
