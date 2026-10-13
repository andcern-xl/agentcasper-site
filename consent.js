// Cookie consent for agentcasper.work. Google Analytics does not load, and sets no cookies,
// until a visitor accepts. The choice is kept in this browser (localStorage "ac_consent").
(function () {
  var ID = "G-2M4GX5N3X6", KEY = "ac_consent";
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };

  function get() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function set(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function loadGA() {
    window["ga-disable-" + ID] = false;
    if (window.__acga) return;
    window.__acga = true;
    var s = document.createElement("script");
    s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + ID;
    document.head.appendChild(s);
    window.gtag("js", new Date());
    window.gtag("config", ID);
  }
  function stopGA() {
    window["ga-disable-" + ID] = true;
    var host = location.hostname.replace(/^www\./, "");
    document.cookie.split(";").forEach(function (c) {
      var n = c.split("=")[0].trim();
      if (n === "_ga" || n.indexOf("_ga_") === 0) {
        var gone = "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        document.cookie = n + gone;
        document.cookie = n + gone + "; domain=." + host;
        document.cookie = n + gone + "; domain=" + host;
      }
    });
  }

  var css = ".ac-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:50;max-width:560px;margin:0 auto;background:#fff;border:1px solid rgba(215,230,245,.9);border-radius:18px;padding:18px 20px;box-shadow:rgba(16,55,132,.12) 0 17px 37px,rgba(16,55,132,.08) 0 4px 12px;font:400 14.5px/1.5 Manrope,ui-sans-serif,system-ui,sans-serif;letter-spacing:-.01em;color:#070709}" +
    ".ac-consent p{margin:0 0 14px}.ac-consent a{color:#070709;text-decoration:underline;text-decoration-color:#2597d0;text-underline-offset:3px}" +
    ".ac-consent .row{display:flex;gap:10px;flex-wrap:wrap}" +
    ".ac-consent button{font:500 14px Manrope,ui-sans-serif,system-ui,sans-serif;border-radius:100px;padding:10px 20px;cursor:pointer;border:1px solid #070709;background:#070709;color:#fff}" +
    ".ac-consent button.no{background:transparent;color:#070709}";
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  var box = null;
  function close() { if (box) { box.remove(); box = null; } }
  function choose(v) { set(v); close(); if (v === "yes") loadGA(); else stopGA(); }
  function show() {
    if (box) return;
    box = document.createElement("div");
    box.className = "ac-consent"; box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Cookies");
    var p = document.createElement("p");
    p.appendChild(document.createTextNode("We would like to use Google Analytics to see which pages get read. It sets cookies, and only if you say yes. "));
    var a = document.createElement("a"); a.href = "privacy.html"; a.textContent = "Privacy"; p.appendChild(a);
    var row = document.createElement("div"); row.className = "row";
    var yes = document.createElement("button"); yes.type = "button"; yes.textContent = "Accept"; yes.onclick = function () { choose("yes"); };
    var no = document.createElement("button"); no.type = "button"; no.className = "no"; no.textContent = "No thanks"; no.onclick = function () { choose("no"); };
    row.appendChild(yes); row.appendChild(no); box.appendChild(p); box.appendChild(row);
    document.body.appendChild(box);
  }

  function init() {
    var c = get();
    if (c === "yes") loadGA(); else if (c !== "no") show();
    [].forEach.call(document.querySelectorAll("[data-cookie-settings]"), function (el) {
      el.addEventListener("click", function (e) { e.preventDefault(); show(); });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
