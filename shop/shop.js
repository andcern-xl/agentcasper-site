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
      var a = el('a', 'tile'); a.href = '/shop/product/?p=' + encodeURIComponent(p.id);
      var im = el('div', 'tile-img');
      if (p.images && p.images[0]) { var i = el('img'); i.src = p.images[0]; i.alt = p.name; i.loading = 'lazy'; im.appendChild(i); }
      a.appendChild(im); a.appendChild(el('h3', null, p.name)); a.appendChild(el('p', 'price', money(p.price, cur)));
      g.appendChild(a);
    });
  }

  function renderProduct(list, cur, allSizes, chart, deliveryNote) {
    var root = $('#product'); root.textContent = '';
    var id = new URLSearchParams(location.search).get('p');
    var p = list.filter(function (x) { return x.id === id; })[0];
    if (!p) { root.appendChild(el('p', 'empty', 'We could not find that product.')); var b = el('a', 'btn ghost', 'Back to the shop'); b.href = '/shop/'; root.appendChild(b); return; }
    document.title = p.name + ' | Agent Casper Shop';
    var sizes = p.sizes || allSizes, out = p.soldOut || [], chosen = null;

    var left = el('div', 'gallery'), main = el('div', 'main-img'), mi = el('img');
    var imgs = p.images || [];
    if (imgs[0]) { mi.src = imgs[0]; mi.alt = p.name; main.appendChild(mi); }
    left.appendChild(main);
    if (imgs.length > 1) {
      var th = el('div', 'thumbs');
      imgs.forEach(function (u, n) { var t = el('button', n ? '' : 'on'); t.type = 'button'; t.setAttribute('aria-label', 'Photo ' + (n + 1)); var ti = el('img'); ti.src = u; ti.alt = ''; t.appendChild(ti);
        t.addEventListener('click', function () { mi.src = u; [].forEach.call(th.children, function (c) { c.classList.remove('on'); }); t.classList.add('on'); }); th.appendChild(t); });
      left.appendChild(th);
    }

    var right = el('div', 'info');
    right.appendChild(el('h1', null, p.name));
    right.appendChild(el('p', 'price big', money(p.price, cur)));
    if (p.description) right.appendChild(describe(p.description));

    var head = el('div', 'size-head'); head.appendChild(el('strong', null, 'Size'));
    var hasChart = chart && chart.rows && chart.rows.length;
    if (hasChart) { var cb = el('button', 'link', 'Size chart'); cb.type = 'button'; cb.addEventListener('click', function () { openChart(chart); }); head.appendChild(cb); }
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
    buy.addEventListener('click', function () {
      var u = chosen && linkFor(p, chosen); if (!u) return;
      /* Stripe Payment Link; the product and size also travel as client_reference_id (letters, numbers, - and _ only) */
      location.href = u + (u.indexOf('?') > -1 ? '&' : '?') + 'client_reference_id=' + encodeURIComponent(safeId(p.id) + '_' + safeId(chosen));
    });
    right.appendChild(msg); right.appendChild(buy);
    if (deliveryNote) right.appendChild(el('p', 'note delivery', deliveryNote));

    var wrap = el('div', 'product-grid'); wrap.appendChild(left); wrap.appendChild(right); root.appendChild(wrap);
  }

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
