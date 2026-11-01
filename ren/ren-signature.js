// The Ren signature page (src/pages/world/ren-signature.astro). Draws with ren-language.js from the polarity tables.
(function () {
  var L = window.RenLanguage, D = window.RENPOLARITIES, REALMS = ['Void', 'Spark', 'Flame', 'Star', 'Constellation', 'Galaxy'];
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = {
    polarities: ['Truth', 'Blade/Sword', 'Bonds', 'Heat', 'Redemption', 'Anger'],
    motive: { polarity: 'Truth', object: 'God', rank: 1 }, identity: { polarity: 'Blade/Sword', polarity2: 'Heat' },
    style: 'Separation', texture: 'Tranquil', cent: 'Filtration', real: 'Focused', expa: 'Replicating', realm: 0
  };
  var fig = document.getElementById('fig'), bar = document.getElementById('bar');
  var steps = Array.prototype.slice.call(document.querySelectorAll('.step'));
  var cats = [];
  D.polarities.forEach(function (p) { if (cats.indexOf(p.category) < 0) cats.push(p.category); });

  // ---- toolbar ----
  var pols = document.getElementById('pols'), polsum = document.getElementById('polsum');
  function buildPols() {
    pols.innerHTML = '';
    for (var i = 0; i < 6; i++) {
      var sel = document.createElement('select');
      sel.setAttribute('aria-label', 'Polarity ' + (i + 1));
      cats.forEach(function (c) {
        var og = document.createElement('optgroup'); og.label = c;
        D.polarities.forEach(function (p) { if (p.category === c) { var o = document.createElement('option'); o.value = p.name; o.textContent = p.name; og.appendChild(o); } });
        sel.appendChild(og);
      });
      sel.value = state.polarities[i];
      sel.dataset.i = i;
      sel.addEventListener('change', function (e) { state.polarities[+e.target.dataset.i] = e.target.value; fillRoles(); draw(true); });
      pols.appendChild(sel);
    }
    polsum.textContent = state.polarities.length + ' chosen';
    fillRoles();
  }
  var mpol = document.getElementById('mpol'), ipol = document.getElementById('ipol'), ipol2 = document.getElementById('ipol2'), mobj = document.getElementById('mobj'), mrank = document.getElementById('mrank');
  function fillRoles() {
    [mpol, ipol, ipol2].forEach(function (sel) {
      sel.innerHTML = '';
      state.polarities.forEach(function (nm) { var o = document.createElement('option'); o.value = nm; o.textContent = nm; sel.appendChild(o); });
    });
    if (state.polarities.indexOf(state.motive.polarity) < 0) state.motive.polarity = state.polarities[0];
    if (state.polarities.indexOf(state.identity.polarity) < 0) state.identity.polarity = state.polarities[1] || state.polarities[0];
    if (state.polarities.indexOf(state.identity.polarity2) < 0 || state.identity.polarity2 === state.identity.polarity) state.identity.polarity2 = state.polarities.filter(function (x) { return x !== state.identity.polarity; })[0];
    mpol.value = state.motive.polarity; ipol.value = state.identity.polarity; ipol2.value = state.identity.polarity2;
  }
  L.OBJECT_ORDER.forEach(function (o) { var op = document.createElement('option'); op.value = o; op.textContent = o; mobj.appendChild(op); });
  mobj.value = state.motive.object; mrank.value = state.motive.rank;
  mpol.addEventListener('change', function () { state.motive.polarity = mpol.value; draw(true); });
  ipol.addEventListener('change', function () { state.identity.polarity = ipol.value; fillRoles(); draw(true); });
  ipol2.addEventListener('change', function () { state.identity.polarity2 = ipol2.value; draw(true); });
  mobj.addEventListener('change', function () { state.motive.object = mobj.value; draw(true); });
  mrank.addEventListener('input', function () { state.motive.rank = Math.max(0, Math.min(8, +mrank.value || 0)); draw(true); });
  document.getElementById('rand').addEventListener('click', function () {
    var pick = [];
    while (pick.length < 6) { var c = D.polarities[Math.floor(Math.random() * D.polarities.length)].name; if (pick.indexOf(c) < 0) pick.push(c); }
    state.polarities = pick; buildPols(); draw(true);
  });
  function bindRadio(name, key) {
    Array.prototype.forEach.call(document.querySelectorAll('input[name=' + name + ']'), function (r) {
      r.addEventListener('change', function () { state[key] = r.value; draw(true); });
    });
  }
  bindRadio('style', 'style'); bindRadio('texture', 'texture'); bindRadio('cent', 'cent'); bindRadio('real', 'real'); bindRadio('expa', 'expa');
  // ---- the reader's own characters (saved in this browser, handed over by the page as the ren-characters event) ----
  var charWrap = document.getElementById('charwrap'), charSel = document.getElementById('char'), chars = [];
  function match(list, name) {
    var w = String(name || '').trim().toLowerCase(), k;
    for (k = 0; k < list.length; k++) if (String(list[k]).toLowerCase() === w) return list[k];
    return null;
  }
  var known = D.polarities.map(function (p) { return p.name; });
  function useCharacter(id) {
    var c = chars.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    var pick = [];
    c.polarities.concat([c.motive.polarity, c.identity.polarity, c.identity.polarity2]).forEach(function (n) {
      var m = match(known, n);
      if (m && pick.indexOf(m) < 0) pick.push(m);
    });
    // A character still being made may have fewer than six polarities. The rest are filled so the schema has six nodes.
    known.forEach(function (n) { if (pick.length < 6 && pick.indexOf(n) < 0) pick.push(n); });
    state.polarities = pick.slice(0, 6);
    state.motive.polarity = match(pick, c.motive.polarity) || pick[0];
    state.motive.object = match(L.OBJECT_ORDER, c.motive.object) || state.motive.object;
    state.motive.rank = Math.max(0, Math.min(8, c.motive.rank));
    state.identity.polarity = match(pick, c.identity.polarity) || pick[1];
    state.identity.polarity2 = match(pick, c.identity.polarity2) || pick.filter(function (n) { return n !== state.identity.polarity; })[0];
    var tex = match(['Tranquil', 'Volatile', 'Rampant'], c.texture);
    if (tex) {
      state.texture = tex;
      Array.prototype.forEach.call(document.querySelectorAll('input[name=texture]'), function (r) { r.checked = r.value === tex; });
    }
    mobj.value = state.motive.object; mrank.value = state.motive.rank;
    buildPols(); draw(true);
  }
  function listCharacters(list) {
    chars = list || [];
    var keep = charSel.value;
    charSel.innerHTML = '<option value="">Choose one</option>';
    chars.forEach(function (c) { var o = document.createElement('option'); o.value = c.id; o.textContent = c.name; charSel.appendChild(o); });
    charSel.value = chars.some(function (c) { return c.id === keep; }) ? keep : '';
    charWrap.hidden = !chars.length;
    // Keep the drawing in step when the chosen character changes in another tab or on the sheet.
    if (charSel.value) useCharacter(charSel.value);
  }
  charSel.addEventListener('change', function () { if (charSel.value) useCharacter(charSel.value); });
  window.addEventListener('ren-characters', function (e) { listCharacters(e.detail); });

  // The toolbar wraps, so the layout measures it. Starlight's header sits above it.
  var header = document.querySelector('header.header');
  function navHeight() { return header ? header.offsetHeight : 0; }
  function measureBar() { document.documentElement.style.setProperty('--barh', bar.offsetHeight + 'px'); }

  // ---- Realm track ----
  var track = document.getElementById('track'), meter = document.getElementById('meter');
  REALMS.forEach(function (nm, i) {
    var b = document.createElement('button');
    b.type = 'button'; b.innerHTML = '<small>Realm ' + i + '</small>' + nm;
    b.addEventListener('click', function () { scrollToRealm(i); });
    track.appendChild(b);
  });
  var stageEl = document.querySelector('.stage');
  // Viewport line where a step counts as centered: the middle of the area the stage does not cover.
  function readLine() {
    var mobile = window.matchMedia('(max-width: 860px)').matches;
    var top = mobile ? stageEl.getBoundingClientRect().bottom : navHeight() + bar.offsetHeight;
    return top + (window.innerHeight - top) / 2;
  }
  function centers() {
    return steps.map(function (s) { var r = s.getBoundingClientRect(); return r.top + window.scrollY + r.height / 2; });
  }
  function scrollToRealm(r) {
    var c = centers(), k = Math.min(5, Math.floor(r)), f = r - k;
    var y = c[k] + (k < 5 ? (c[k + 1] - c[k]) * f : 0);
    window.scrollTo({ top: y - readLine(), behavior: reduce ? 'auto' : 'smooth' });
  }
  function realmFromScroll() {
    var c = centers(), vc = window.scrollY + readLine();
    if (vc <= c[0]) return 0;
    if (vc >= c[5]) return 5;
    for (var k = 0; k < 5; k++) if (vc < c[k + 1]) return k + (vc - c[k]) / (c[k + 1] - c[k]);
    return 5;
  }

  // ---- captions that follow the toolbar ----
  var dyn = {
    style: {
      Collision: 'Collision: an arrowhead on each side of the middle of a link, each pointing at the other.',
      Harmonization: 'Harmonization: a short line on either side of each link.',
      Separation: 'Separation: two short lines through each link.'
    },
    tex: {
      Tranquil: 'Tranquil: the boundary is a circle.',
      Volatile: 'Volatile: the boundary is a hexagon.',
      Rampant: 'Rampant: the boundary is a six-point star with convex sides.'
    },
    cent: {
      Filtration: 'Filtration: three arcs outside the boundary, with their ends jutting outward, at the top, lower right, and lower left.',
      Condensation: 'Condensation: six chevrons around the signature, each pointing inward.',
      Gathering: 'Gathering: twelve short arcs around the signature, each spiraling inward.'
    },
    real: {
      Focused: 'Focused: the Realization grants Focused as a permanent secondary awareness state. A 3-point star sits on each link between copies.',
      Projected: 'Projected: the Realization grants Projected as a permanent secondary awareness state. A triangle sits on each link between copies.',
      Suppressed: 'Suppressed: the Realization grants Suppressed as a permanent secondary awareness state. A hexagon sits on each link between copies.'
    },
    expa: {
      Replicating: 'Replicating: one produces more constellations to create their galaxy. A square sits on each link between copies.',
      Connection: 'Connection: the constellation interacts with the connections one has. A 4-point star sits on each link between copies.',
      Pressurizing: 'Pressurizing: one pulls their constellation in. An octagon sits on each link between copies.'
    }
  };

  buildPols();
  var dirty = true;
  function draw(force) {
    var r = realmFromScroll();
    if (!force && !dirty && Math.abs(r - state.realm) < 0.001) return;
    dirty = false; state.realm = r;
    measureBar();
    fig.innerHTML = L.render({ polarities: state.polarities, motive: state.motive, identity: state.identity, style: state.style, texture: state.texture,
      centralization: state.cent, realization: state.real, expansion: state.expa, realm: r });
    var near = Math.round(r);
    steps.forEach(function (s, i) { s.classList.toggle('on', i === near); });
    Array.prototype.forEach.call(track.querySelectorAll('button'), function (b, i) { b.setAttribute('aria-current', i === near ? 'true' : 'false'); });
    meter.style.width = (r / 5 * 100) + '%';
    document.getElementById('dyn-layout').textContent = state.motive.object + ': ' + L.SCHEMAS[state.motive.object].note;
    document.getElementById('dyn-rank').textContent = 'Rank ' + state.motive.rank + ': ' + state.motive.rank + (state.motive.rank === 1 ? ' ring' : ' rings') + ' around ' + state.motive.polarity + '.';
    document.getElementById('dyn-style').textContent = dyn.style[state.style];
    document.getElementById('dyn-tex').textContent = dyn.tex[state.texture];
    document.getElementById('dyn-cent').textContent = dyn.cent[state.cent];
    document.getElementById('dyn-real').textContent = dyn.real[state.real];
    document.getElementById('dyn-expa').textContent = dyn.expa[state.expa];
  }
  window.addEventListener('scroll', function () { dirty = true; requestAnimationFrame(function () { draw(); }); }, { passive: true });
  window.addEventListener('resize', function () { draw(true); });
  draw(true);
  window.__setRealm = function (r) { scrollToRealm(r); };
})();
