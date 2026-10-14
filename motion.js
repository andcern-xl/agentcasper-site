/* Motion, after Material 3 (m3.material.io/styles/motion): emphasized easing,
   short durations, staggered fade-through reveals, state layers and ripples on
   buttons, elevation on hover and scroll. Respects "reduce motion", except when
   the address has ?motion=1 (kept for the session) so it can be previewed. */
(function () {
  var q = /[?&]motion=1/.test(location.search);
  try { if (q) sessionStorage.setItem('ac_motion', '1'); } catch (e) {}
  var forced = q; try { forced = forced || sessionStorage.getItem('ac_motion') === '1'; } catch (e) {}
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches && !forced;
  if (reduce) return;

  var css = ':root{--m3-emph:cubic-bezier(.2,0,0,1);--m3-emph-dec:cubic-bezier(.05,.7,.1,1);--m3-std:cubic-bezier(.2,0,0,1);--m3-short:200ms;--m3-med:400ms;--m3-long:600ms}' +
    '@view-transition{navigation:auto}' +
    '::view-transition-old(root){animation:m3out 150ms var(--m3-std) both}' +
    '::view-transition-new(root){animation:m3in 300ms var(--m3-emph-dec) 90ms both}' +
    '@keyframes m3out{to{opacity:0}}@keyframes m3in{from{opacity:0;transform:translateY(12px)}}' +
    /* scroll reveal: fade + rise, staggered */
    'html.mo .mo-i{opacity:0;transform:translateY(28px);transition:opacity var(--m3-med) var(--m3-std),transform var(--m3-long) var(--m3-emph-dec);transition-delay:var(--d,0ms);will-change:opacity,transform}' +
    'html.mo .mo-i.in{opacity:1;transform:none}' +
    'html.mo .mo-img img{transform:scale(1.06);transition:transform 900ms var(--m3-emph-dec)}' +
    'html.mo .mo-img.in img{transform:none}' +
    /* buttons: state layer + ripple */
    '.btn{position:relative;overflow:hidden;isolation:isolate;transition:box-shadow var(--m3-short) var(--m3-std),transform var(--m3-short) var(--m3-std)}' +
    '.btn:hover{opacity:1}' +
    '.btn::before{content:"";position:absolute;inset:0;background:currentColor;opacity:0;transition:opacity var(--m3-short) var(--m3-std);z-index:-1;border-radius:inherit}' +
    '.btn:hover::before{opacity:.08}.btn:focus-visible::before{opacity:.1}.btn:active::before{opacity:.12}' +
    '.btn:active{transform:scale(.97)}' +
    '.btn.primary:hover{box-shadow:rgba(36,36,40,.18) 0 4px 10px,rgba(36,36,40,.1) 0 10px 18px}' +
    '.mo-rip{position:absolute;border-radius:50%;background:currentColor;opacity:.18;transform:scale(0);pointer-events:none;z-index:-1;animation:m3rip 600ms var(--m3-emph) forwards}' +
    '@keyframes m3rip{to{transform:scale(1);opacity:0}}' +
    /* cards: lift on hover */
    '.card{transition:transform var(--m3-med) var(--m3-emph),box-shadow var(--m3-med) var(--m3-emph)}' +
    '.card:hover{transform:translateY(-4px);box-shadow:rgba(16,55,132,.10) 0 14px 32px}' +
    'html.mo .card.mo-i.in:hover{transform:translateY(-4px)}' +
    /* header: elevation once scrolled, nav underline that grows from the left */
    'header{transition:box-shadow var(--m3-med) var(--m3-std)}header.mo-s{box-shadow:0 4px 18px rgba(7,7,9,.08)}' +
    'nav.links a{position:relative}' +
    'nav.links a::after{content:"";position:absolute;left:0;right:0;bottom:-6px;height:2px;border-radius:2px;background:currentColor;transform:scaleX(0);transform-origin:left;transition:transform var(--m3-med) var(--m3-emph)}' +
    'nav.links a:hover::after{transform:scaleX(1)}' +
    '.ghost-logo{transition:transform var(--m3-med) var(--m3-emph)}.brand:hover .ghost-logo{animation:m3bob 1.6s var(--m3-std) infinite}' +
    '@keyframes m3bob{50%{transform:translateY(-3px) rotate(-4deg)}}' +
    /* hamburger dropdown glides in */
    '@media(max-width:1000px){nav.links a::after{display:none}header.open nav.links{animation:m3menu var(--m3-med) var(--m3-emph-dec)}}' +
    '@keyframes m3menu{from{opacity:0;transform:translateY(-8px)}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  document.documentElement.classList.add('mo');

  function ready(f) { document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', f) : f(); }
  ready(function () {
    var sel = '.hero .pill,.hero h1,.hero .lede,.hero .sub,.hero p,.hero .actions,.block h2,.block .sub,.card,.story figure .frame,.story figcaption,.story .next,.form,form,footer .wrap';
    var seen = [], els = [].slice.call(document.querySelectorAll(sel)).filter(function (e) {
      if (seen.indexOf(e) > -1) return false; seen.push(e); return !e.closest('.mo-i') || e.classList.contains('card');
    });
    els.forEach(function (e) { e.classList.add('mo-i'); if (e.classList.contains('frame')) e.classList.add('mo-img'); });
    var batch = 0, t;
    var io = 'IntersectionObserver' in window && new IntersectionObserver(function (en) {
      en.filter(function (x) { return x.isIntersecting; }).forEach(function (x, i) {
        x.target.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms'); x.target.classList.add('in'); io.unobserve(x.target);
      });
    }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { io ? io.observe(e) : e.classList.add('in'); });

    /* ripple from the press point */
    document.addEventListener('pointerdown', function (ev) {
      var b = ev.target.closest && ev.target.closest('.btn'); if (!b) return;
      var r = b.getBoundingClientRect(), s = Math.max(r.width, r.height) * 2, d = document.createElement('span');
      d.className = 'mo-rip'; d.style.cssText = 'width:' + s + 'px;height:' + s + 'px;left:' + (ev.clientX - r.left - s / 2) + 'px;top:' + (ev.clientY - r.top - s / 2) + 'px';
      b.appendChild(d); setTimeout(function () { d.remove(); }, 650);
    });

    var h = document.querySelector('header');
    function sc() { h && h.classList.toggle('mo-s', window.scrollY > 4); }
    addEventListener('scroll', sc, { passive: true }); sc();
  });
})();
