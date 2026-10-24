(function () {
  var KEY = '__scrapepassMapsLeads';
  var VERSION = '1.0.0';
  if (window[KEY]) window[KEY].close();

  var onMaps = /(^|\.)google\.[a-z.]+$/.test(location.hostname) && location.pathname.indexOf('/maps') === 0;
  if (!onMaps || !document.querySelector('div[role="feed"]')) {
    alert('Open Google Maps and search for a kind of business, for example "dentist in Chicago". When the list of places shows on the left, click this bookmark again.');
    return;
  }

  var HOME = 'https://scrapepass.com/';
  var UTM = '?utm_source=bookmarklet&utm_medium=tool&utm_campaign=google-maps-leads';
  var GITHUB = 'https://github.com/ScrapePass/google-maps-scraper-one-click';
  var YOUTUBE = 'https://www.youtube.com/@scrapepass';
  var COLS = ['name', 'category', 'rating', 'reviews', 'phone', 'website', 'address', 'hours', 'latitude', 'longitude', 'maps_url'];

  var rows = [];
  var seen = {};
  var running = false;
  var idle = 0;
  var timer = 0;
  var queue = [];
  var current = null;
  var shown = 0;
  var lightTimer = 0;
  var doneMsg = '';

  function el(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
  }
  function text(root, sel) {
    var e = root.querySelector(sel);
    return e ? e.textContent.replace(/\s+/g, ' ').trim() : '';
  }
  function parts(line) {
    return line ? line.textContent.split('·').map(function (s) { return s.replace(/\s+/g, ' ').trim(); }).filter(Boolean) : [];
  }

  function readCard(card) {
    var link = card.querySelector('a.hfpxzc');
    if (!link || !link.href) return null;
    var url = link.href.split('?')[0];
    var lines = card.querySelectorAll('.W4Efsd .W4Efsd');
    var info = parts(lines[0]);
    var phone = text(card, '.UsdlK');
    var hours = parts(lines[1]).filter(function (p) { return p !== phone; }).join(' · ');
    var site = card.querySelector('a.lcr4fd') || card.querySelector('a[data-value="Website"]');
    var ll = /!3d(-?[\d.]+)!4d(-?[\d.]+)/.exec(url);
    return {
      name: link.getAttribute('aria-label') || text(card, '.qBF1Pd'),
      category: info.length ? info[0] : '',
      rating: text(card, '.MW4etd').replace(',', '.'),
      reviews: text(card, '.UY7F9').replace(/\D/g, ''),
      phone: phone,
      website: site ? site.href : '',
      address: info.length > 1 ? info[info.length - 1] : '',
      hours: hours,
      latitude: ll ? ll[1] : '',
      longitude: ll ? ll[2] : '',
      maps_url: url
    };
  }

  var marked = [];
  function enqueue(card) {
    if (card.hasAttribute('data-scrapepass')) return;
    card.setAttribute('data-scrapepass', '');
    marked.push(card);
    queue.push(card);
  }
  function paint(card) {
    card.style.outline = '2px solid #4f46e5';
    card.style.outlineOffset = '-2px';
    card.style.background = 'rgba(79,70,229,.12)';
  }
  function plain(card) {
    card.style.outline = '';
    card.style.outlineOffset = '';
    card.style.background = '';
  }
  function unmark() {
    marked.forEach(function (card) {
      card.removeAttribute('data-scrapepass');
      plain(card);
    });
    marked = [];
  }

  function collect() {
    var cards = document.querySelectorAll('div[role="feed"] .Nv2PK');
    var added = 0;
    for (var i = 0; i < cards.length; i++) {
      var r = readCard(cards[i]);
      if (r) enqueue(cards[i]);
      if (r && !seen[r.maps_url]) {
        seen[r.maps_url] = true;
        rows.push(r);
        added++;
      }
    }
    return added;
  }

  var search = /\/maps\/search\/([^/@?]+)/.exec(location.pathname);
  var words = search ? decodeURIComponent(search[1].replace(/\+/g, ' ')).replace(/[\\/:*?"<>|\s]+/g, ' ').trim().slice(0, 60) : '';
  var file = 'ScrapePass Google Maps Leads' + (words ? ' - ' + words : '') + '.csv';

  function cell(v) {
    v = String(v == null ? '' : v);
    if (/^[=@\t\r]/.test(v) || /^[+-]/.test(v) && /[^\d\s().+-]/.test(v)) v = "'" + v;
    return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function table() {
    return [COLS.join(',')].concat(rows.map(function (r) {
      return COLS.map(function (c) { return cell(r[c]); }).join(',');
    })).join('\r\n');
  }

  function svg(tag, attrs, parent) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function logo(size) {
    var root = svg('svg', { viewBox: '0 0 128 128', width: size, height: size, 'aria-hidden': 'true' });
    var grad = svg('linearGradient', { id: 'scrapepass-maps-logo', x1: 0, y1: 0, x2: 1, y2: 1 }, svg('defs', {}, root));
    svg('stop', { offset: 0, 'stop-color': '#7c3aed' }, grad);
    svg('stop', { offset: 1, 'stop-color': '#4f46e5' }, grad);
    svg('rect', { width: 128, height: 128, rx: 28, fill: 'url(#scrapepass-maps-logo)' }, root);
    svg('rect', { x: 20, y: 26, width: 70, height: 18, rx: 9, fill: '#fff' }, root);
    svg('rect', { x: 20, y: 55, width: 70, height: 18, rx: 9, fill: '#fff' }, root);
    svg('rect', { x: 20, y: 84, width: 46, height: 18, rx: 9, fill: '#fff' }, root);
    svg('path', { d: 'M70 66 112 92l-17 4 9.5 18.5-10 4.8-9.5-18.5-13 12z', fill: '#fde68a', stroke: '#4c1d95', 'stroke-width': 5, 'stroke-linejoin': 'round' }, root);
    root.style.cssText = 'flex:none;display:block;';
    return root;
  }

  var GITHUB_LOGO = 'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12';
  var YOUTUBE_LOGO = 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z';
  function brandIcon(d, color) {
    var root = svg('svg', { viewBox: '0 0 24 24', width: 14, height: 14, 'aria-hidden': 'true' });
    svg('path', { d: d, fill: color }, root);
    root.style.cssText = 'display:inline-block;vertical-align:-2px;margin-right:4px;';
    return root;
  }

  var PURPLE = '#4f46e5';
  function link(label, href, css, icon) {
    var a = el('a', 'color:' + PURPLE + ';font-weight:600;white-space:nowrap;' + (css || ''));
    if (icon) a.appendChild(icon);
    a.appendChild(document.createTextNode(label));
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    return a;
  }
  var box = el('div', 'position:fixed;top:72px;right:16px;z-index:2147483647;width:340px;background:#fff;color:#1f2328;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.25);font:15px/1.45 Roboto,Arial,sans-serif;padding:18px;');
  var head = el('div', 'display:flex;align-items:center;gap:10px;margin-bottom:12px;');
  head.appendChild(logo(36));
  var titles = el('div', 'flex:1;min-width:0;');
  titles.appendChild(el('div', 'font-size:18px;font-weight:700;line-height:1.2;', 'Google Maps Leads'));
  var by = el('div', 'font-size:13px;color:#57606a;', 'by ');
  by.appendChild(link('ScrapePass', HOME + UTM, 'text-decoration:none;'));
  by.appendChild(document.createTextNode(' · v' + VERSION));
  titles.appendChild(by);
  head.appendChild(titles);
  var x = el('button', 'border:0;background:none;font-size:24px;line-height:1;cursor:pointer;color:#57606a;padding:0 4px;align-self:flex-start;', '×');
  x.title = 'Close';
  head.appendChild(x);
  var dial = el('div', 'position:relative;width:128px;height:128px;margin:4px auto 10px;');
  var ring = el('div', 'position:absolute;inset:0;box-sizing:border-box;border-radius:50%;border:8px solid rgba(79,70,229,.15);');
  var spin = null;
  var middle = el('div', 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;');
  var ready = el('div', 'font-size:26px;font-weight:700;color:' + PURPLE + ';', 'Ready?');
  var count = el('div', 'display:none;font-size:38px;font-weight:700;line-height:1;', '0');
  var unit = el('div', 'display:none;font-size:13px;color:#57606a;margin-top:4px;', 'leads');
  middle.appendChild(ready);
  middle.appendChild(count);
  middle.appendChild(unit);
  dial.appendChild(ring);
  dial.appendChild(middle);
  var place = el('div', 'height:20px;margin-bottom:2px;font-size:14px;font-weight:600;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;');
  var status = el('div', 'font-size:15px;color:#57606a;text-align:center;margin-bottom:14px;', 'Press Go to collect the places in this list.');
  var BTN = 'display:block;width:100%;border:1px solid ' + PURPLE + ';background:' + PURPLE + ';color:#fff;border-radius:8px;padding:11px 12px;font:600 15px Roboto,Arial,sans-serif;cursor:pointer;';
  var go = el('button', BTN, 'Go');
  var csv = el('button', BTN + 'display:none;', 'Download CSV');
  var buttons = el('div');
  buttons.appendChild(go);
  buttons.appendChild(csv);
  var foot = el('div', 'margin-top:14px;padding-top:12px;border-top:1px solid #eaeef2;font-size:13px;color:#57606a;');
  foot.appendChild(document.createTextNode('Need details of every place? '));
  foot.appendChild(link('Try the ScrapePass extension, the free web scraper', HOME + UTM));
  var help = el('div', 'margin-top:8px;');
  help.appendChild(document.createTextNode('Something not working? '));
  help.appendChild(link('Report a problem', HOME + 'contact' + UTM + '&utm_content=v' + VERSION));
  foot.appendChild(help);
  var more = el('div', 'margin-top:8px;');
  more.appendChild(link('How to use', HOME + 'tools/google-maps-scraper' + UTM));
  more.appendChild(document.createTextNode(' · '));
  more.appendChild(link('More free tools', HOME + 'free-tools' + UTM));
  foot.appendChild(more);
  var social = el('div', 'margin-top:8px;');
  social.appendChild(link('GitHub', GITHUB, '', brandIcon(GITHUB_LOGO, '#1f2328')));
  social.appendChild(document.createTextNode(' · '));
  social.appendChild(link('Tutorials on YouTube', YOUTUBE, '', brandIcon(YOUTUBE_LOGO, '#FF0000')));
  foot.appendChild(social);
  [head, dial, place, status, buttons, foot].forEach(function (n) { box.appendChild(n); });
  document.body.appendChild(box);

  function light() {
    var card = queue.shift();
    if (card) {
      if (current) plain(current);
      paint(card);
      current = card;
      card.scrollIntoView({ block: 'start' });
      var name = card.querySelector('a.hfpxzc');
      place.textContent = name ? name.getAttribute('aria-label') || '' : '';
      shown++;
      count.textContent = String(Math.min(shown, rows.length));
    }
    if (card || running) lightTimer = setTimeout(light, 90);
    else finish();
  }
  function stop(msg) {
    running = false;
    clearTimeout(timer);
    doneMsg = msg;
  }
  function finish() {
    if (current) plain(current);
    current = null;
    place.textContent = '';
    if (spin) spin.cancel();
    ring.style.borderColor = PURPLE;
    count.textContent = String(rows.length);
    status.textContent = doneMsg;
  }

  function scroll() {
    if (!running) return;
    var feed = document.querySelector('div[role="feed"]');
    if (!feed) return stop('The list closed.');
    var added = collect();
    if (!queue.length) {
      idle = added ? 0 : idle + 1;
      var end = feed.querySelector('.HlvSq');
      if (end && end.offsetParent !== null && !added) return stop('Done. Download your CSV.');
      if (idle >= 25) return stop('Google Maps stopped loading more places. Download your CSV.');
      feed.scrollTop = idle % 2 ? feed.scrollHeight - feed.clientHeight - 400 : feed.scrollHeight;
      status.textContent = idle > 2 ? 'Waiting for Google Maps to load more…' : 'Scrolling the list…';
    }
    timer = setTimeout(scroll, 1200);
  }

  function close() {
    running = false;
    clearTimeout(timer);
    clearTimeout(lightTimer);
    unmark();
    box.remove();
    delete window[KEY];
  }

  x.onclick = close;
  go.onclick = function () {
    go.style.display = 'none';
    csv.style.display = 'block';
    ready.style.display = 'none';
    count.style.display = 'block';
    unit.style.display = 'block';
    ring.style.borderTopColor = PURPLE;
    if (ring.animate) spin = ring.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 1000, iterations: Infinity });
    status.textContent = 'Scrolling the list…';
    running = true;
    scroll();
    light();
  };
  csv.onclick = function () {
    collect();
    var blob = new Blob([String.fromCharCode(0xfeff) + table()], { type: 'text/csv;charset=utf-8' });
    var a = el('a');
    a.href = URL.createObjectURL(blob);
    a.download = file;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
  };
  window[KEY] = { close: close };
})();
