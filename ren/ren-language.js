/*
  Ren visual language (draft 1): the vocabulary a signature is built from.

  Edge types, one per Principle. Every side of every figure takes one of them.
    S  Truth            straight
    W  Change           sine, one full period
    V  Differentiation  concave arc (bows inward)
    X  Influence        convex arc (bows outward)

  Layer     one closed figure: a polygon with 3 to 10 sides, or a star with 3 to 6 points
            (a star has twice as many sides as points). Each side takes an edge type.
  Polarity  one or two layers stacked on one center.
  Schema    where six polarities sit, set by the Motive Object. Slot 0 is the Motive polarity.
  Texture   the outline repeated around the Motive polarity once per Rank, and the one boundary around everything.
            Tranquil circle, Volatile hexagon, Rampant six-point star with convex sides.
  Circulation  marks on the links between polarity centers. Collision puts an arrowhead on each side of the middle,
            Harmonization a short line on either side, Separation two short lines through the link.
            Spacing between polarities is fixed at one distance for every style.

  Nothing here is random. The same spec always draws the same figure.
  Tokens only: needs ithasen-tokens.css.
*/
(function () {
  'use strict';
  var TAU = Math.PI * 2;
  var EDGE_NAMES = { S: 'Truth', W: 'Change', V: 'Differentiation', X: 'Influence' };

  function f(n) { return Math.round(n * 100) / 100; }

  // Path fragment from a to b (the pen is already at a). c is the figure's center, which decides "outward".
  function edgeSeg(a, b, t, c, k) {
    k = k || 1;
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    if (t === 'S' || L < 1e-6) return 'L' + f(b[0]) + ' ' + f(b[1]);
    var nx = -dy / L, ny = dx / L, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if (nx * (mx - c[0]) + ny * (my - c[1]) < 0) { nx = -nx; ny = -ny; }
    if (t === 'X' || t === 'V') {
      var s = (t === 'X' ? 1 : -1) * 0.34 * L * k;
      return 'Q' + f(mx + nx * s) + ' ' + f(my + ny * s) + ' ' + f(b[0]) + ' ' + f(b[1]);
    }
    var out = '', N = 24, amp = 0.13 * L;
    for (var i = 1; i <= N; i++) {
      var u = i / N, o = i === N ? 0 : amp * Math.sin(TAU * u);
      out += 'L' + f(a[0] + dx * u + nx * o) + ' ' + f(a[1] + dy * u + ny * o);
    }
    return out;
  }

  // Vertices of a layer, apex up. A star alternates outer and inner vertices.
  function shapePts(shape, n, r, innerRatio) {
    var pts = [], i, m = shape === 'star' ? 2 * n : n, inner = innerRatio || (n === 3 ? 0.45 : 0.5);
    for (i = 0; i < m; i++) {
      var rad = shape === 'star' && i % 2 ? r * inner : r;
      var ang = -Math.PI / 2 + TAU * i / m;
      pts.push([rad * Math.cos(ang), rad * Math.sin(ang)]);
    }
    return pts;
  }

  function layerPath(layer, r) {
    var pts = shapePts(layer.shape, layer.n, r), m = pts.length, e = layer.edges, d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    // Arcs bow less as sides multiply, so a convex pentagon keeps its corners instead of reading as a circle.
    var k = Math.max(0.35, 3 / m);
    for (var i = 0; i < m; i++) d += edgeSeg(pts[i], pts[(i + 1) % m], e.charAt(i % e.length), [0, 0], k);
    return d + 'Z';
  }

  // A polarity is { layers: [ {shape, n, edges, rot} ] }. Returns SVG markup centered on 0,0.
  // Stacked layers are the same size so they cross. They are told apart by line weight and color: the first is the
  // heaviest, the second lighter, the third lightest.
  var LAYER_SCALE = [1, 1, 1], LAYER_WEIGHT = [1.3, 0.9, 0.6];
  function figure(spec, r, o) {
    o = o || {};
    var out = '', multi = spec.layers.length > 1;
    spec.layers.forEach(function (l, i) {
      var col = i === 0 ? 'var(--ink)' : i === 1 ? 'var(--accent)' : 'var(--ink2)';
      var k = multi ? i : 0;
      out += '<path d="' + layerPath(l, r * LAYER_SCALE[k]) + '" transform="rotate(' + (l.rot || 0) + ')" fill="none" stroke="' + col +
        '" stroke-width="' + f((o.w || 2) * LAYER_WEIGHT[k]) + '" stroke-linejoin="round"/>';
    });
    return out;
  }

  // Written form of a figure: each layer is its repeating edge pattern and its number of points or sides,
  // for example SV10 | S5. A star counts its points and takes a star mark, for example XV6★.
  function notation(spec) {
    return spec.layers.map(function (l) {
      var e = l.edges, k = 1;
      while (k < e.length && !(e.length % k === 0 && e === Array(e.length / k + 1).join(e.slice(0, k)))) k++;
      return e.slice(0, k) + l.n + (l.shape === 'star' ? '★' : '');
    }).join(' | ');
  }

  function tri(edges, rot) { return { layers: [{ shape: 'poly', n: 3, edges: edges, rot: rot || 0 }] }; }
  function pent(edges) { return { layers: [{ shape: 'poly', n: 5, edges: edges }] }; }

  // The four Principles: triangles, one edge type each.
  var PRINCIPLES = [
    { name: 'Truth', edges: 'S', spec: tri('SSS') },
    { name: 'Change', edges: 'W', spec: tri('WWW') },
    { name: 'Differentiation', edges: 'V', spec: tri('VVV') },
    { name: 'Influence', edges: 'X', spec: tri('XXX') }
  ];

  // The ten Operations. Addition, Subtraction, Multiplication, and Division are pentagons with one edge type each.
  // Creation, Destruction, Formation, and Ruination derive from them in that order: the parent's pentagon over a decagon
  // turned 18 degrees, written pentagon|decagon. Rotation and Piercing are an octagon over two 4-point stars (the second
  // turned 45 degrees), written octagon|star|star.
  function ex(s, n) { var o = ''; for (var i = 0; i < n; i++) o += s.charAt(i % s.length); return o; }
  function op3(code) {
    var c = code.split('|');
    return { layers: [{ shape: 'poly', n: 8, edges: ex(c[0], 8), rot: 22.5 }, { shape: 'star', n: 4, edges: ex(c[1], 8) }, { shape: 'star', n: 4, edges: ex(c[2], 8), rot: 45 }] };
  }
  function opDerived(code) {
    var c = code.split('|');
    return { layers: [{ shape: 'poly', n: 5, edges: ex(c[0], 5) }, { shape: 'poly', n: 10, edges: ex(c[1], 10), rot: 18 }] };
  }
  var OPERATIONS = [
    { name: 'Addition', edges: 'X', spec: pent('XXXXX') }, { name: 'Subtraction', edges: 'V', spec: pent('VVVVV') },
    { name: 'Multiplication', edges: 'W', spec: pent('WWWWW') }, { name: 'Division', edges: 'S', spec: pent('SSSSS') },
    { name: 'Rotation', edges: 'W|WX|XW', spec: op3('W|WX|XW') }, { name: 'Piercing', edges: 'S|SV|VS', spec: op3('S|SV|VS') },
    { name: 'Creation', edges: 'X|S', spec: opDerived('X|S') }, { name: 'Destruction', edges: 'V|S', spec: opDerived('V|S') },
    { name: 'Formation', edges: 'W|X', spec: opDerived('W|X') }, { name: 'Ruination', edges: 'S|V', spec: opDerived('S|V') }
  ];

  // Schemas. Units are one node spacing. Slot 0 is the Motive polarity.
  function hexPts(R, start, k) {
    var p = [];
    for (var i = 0; i < k; i++) { var a = (start + 360 / k * i) * Math.PI / 180; p.push([R * Math.cos(a), R * Math.sin(a)]); }
    return p;
  }
  var h = Math.sqrt(3) / 2;
  var SCHEMAS = {
    Self: { nodes: [[0, 0]], edges: [], note: 'One node. The ring is the Motive polarity.' },
    Truth: { nodes: [[0, -2.5], [0, -1.5], [0, -0.5], [0, 0.5], [0, 1.5], [0, 2.5]], edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]], note: 'A vertical line. The Motive polarity is the top.' },
    God: { nodes: hexPts(0.8, 90, 3).concat(hexPts(1.7, 90, 3)), edges: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3]], note: 'A triangle wrapped in a triangle, both pointing down. The Motive polarity is the down point of the smaller one.' },
    Justice: { nodes: [[0, -0.55], [-1.1, -2.0], [1.1, -2.0], [0, 0.55], [-1.1, 2.0], [1.1, 2.0]], edges: [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3]], note: 'Two triangles with their points facing each other. The Motive polarity is the down point of the upper one.' },
    Freedom: { nodes: hexPts(1.3, -90, 6), edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]], note: 'A hexagon. The Motive polarity is the top.' },
    Order: { nodes: [[0, -h], [-0.5, 0], [0.5, 0], [-1, h], [0, h], [1, h]], edges: [[0, 1], [0, 2], [1, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 4], [4, 5]], note: 'A pool rack with six points. The Motive polarity is the top.' },
    Peace: { nodes: [[0, -0.5], [-1, -0.5], [1, -0.5], [-1, 0.5], [0, 0.5], [1, 0.5]], edges: [[1, 0], [0, 2], [3, 4], [4, 5], [1, 3], [0, 4], [2, 5]], note: 'Two rows of three. The Motive polarity is the top middle. This layout is my reading of the sketch.' },
    Balance: { nodes: [[0, -1.2], [-1.5, 0], [-0.5, 0], [0.5, 0], [1.5, 0], [0, 1.2]], edges: [[1, 2], [2, 3], [3, 4], [0, 2], [0, 3], [5, 2], [5, 3]], note: 'A row of four, one above and one below. The extra two sit over the gap, so neither lines up with any of the four. The Motive polarity is the one above.' },
    Bonds: { nodes: [[0, -1.5], [0, -0.5], [0, 0.5], [0, 1.5], [-1.2, 0], [1.2, 0]], edges: [[0, 1], [1, 2], [2, 3], [4, 1], [4, 2], [5, 1], [5, 2]], note: 'A column of four, one on each side. The extra two sit beside the gap. The Motive polarity is the top of the column.' },
    Vengeance: { nodes: [[0, 0.5], [0, -1.5], [0, -0.5], [0, 1.5], [-1.2, 0.5], [1.2, 0.5]], edges: [[1, 2], [2, 0], [0, 3], [4, 0], [5, 0]], note: 'A column of four, one on each side, level with the third from the top. That third is the Motive polarity.' }
  };
  var OBJECT_ORDER = ['Justice', 'Vengeance', 'Freedom', 'Bonds', 'Order', 'Peace', 'Balance', 'Truth', 'God', 'Self'];

  // Polarities always sit at the Separation spacing. Circulation changes the marks on the links instead.
  var U = 150;
  var STAR_BULGE = 0.4, STAR_INNER = 0.64;

  // Unit outline of a Texture as a sampled polygon (null for the circle).
  function texturePoly(texture) {
    if (texture === 'Tranquil') return null;
    if (texture === 'Volatile') return shapePts('poly', 6, 1);
    // Rampant: a six-point star whose twelve sides all bow outward (Influence edges).
    var v = shapePts('star', 6, 1, STAR_INNER), out = [];
    v.forEach(function (a, i) {
      var b = v[(i + 1) % v.length], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      var nx = -dy / L, ny = dx / L, mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
      var s = 0.34 * L * STAR_BULGE;
      for (var t = 0; t < 10; t++) {
        var u = t / 10, w = 1 - u;
        out.push([w * w * a[0] + 2 * w * u * (mx + nx * s) + u * u * b[0], w * w * a[1] + 2 * w * u * (my + ny * s) + u * u * b[1]]);
      }
    });
    return out;
  }
  function inPoly(pt, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  // Smallest scale of the Texture outline that contains every point (points are relative to its center).
  function fitTexture(texture, pts) {
    var bp = texturePoly(texture), lo = 10, hi = 1e6, mid;
    for (var it = 0; it < 40; it++) {
      mid = (lo + hi) / 2;
      var ok = pts.every(function (q) { return bp ? inPoly([q[0] / mid, q[1] / mid], bp) : Math.hypot(q[0], q[1]) <= mid; });
      if (ok) hi = mid; else lo = mid;
    }
    return hi;
  }
  // Like fitTexture, but also moves the outline's center to wherever it encloses the points most tightly.
  function fitCentered(texture, pts) {
    var best = { S: fitTexture(texture, pts), dx: 0, dy: 0 }, step = best.S / 4, it, i, j;
    for (it = 0; it < 7; it++) {
      var cur = best;
      for (i = -1; i <= 1; i++) for (j = -1; j <= 1; j++) {
        if (!i && !j) continue;
        var dx = cur.dx + i * step, dy = cur.dy + j * step;
        var S = fitTexture(texture, pts.map(function (q) { return [q[0] - dx, q[1] - dy]; }));
        if (S < best.S - 1e-6) best = { S: S, dx: dx, dy: dy };
      }
      step /= 2;
    }
    return best;
  }
  function textureMarkup(texture, cx, cy, S, stroke, w) {
    var attrs = ' fill="none" stroke="' + stroke + '" stroke-width="' + w + '" stroke-linejoin="round"';
    if (texture === 'Tranquil') return '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(S) + '"' + attrs + '/>';
    if (texture === 'Volatile') {
      return '<path d="M' + shapePts('poly', 6, S).map(function (q) { return f(cx + q[0]) + ' ' + f(cy + q[1]); }).join('L') + 'Z"' + attrs + '/>';
    }
    var v = shapePts('star', 6, S, STAR_INNER).map(function (q) { return [cx + q[0], cy + q[1]]; }), d = 'M' + f(v[0][0]) + ' ' + f(v[0][1]);
    for (var i = 0; i < v.length; i++) d += edgeSeg(v[i], v[(i + 1) % v.length], 'X', [cx, cy], STAR_BULGE);
    return '<path d="' + d + 'Z"' + attrs + '/>';
  }

  // Marks on a link between two polarity centers. The style is the Circulation Style.
  function linkMarks(a, b, style) {
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, out = '';
    var st = ' fill="none" stroke="var(--ink)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
    function P(x, y) { return f(x) + ' ' + f(y); }
    if (style === 'Collision') {
      // an arrowhead on each side of the middle, pointing at each other
      [-1, 1].forEach(function (s) {
        var tx = mx + s * 3 * ux, ty = my + s * 3 * uy, bx = tx + s * 10 * ux, by = ty + s * 10 * uy;
        out += '<path d="M' + P(bx + nx * 6, by + ny * 6) + 'L' + P(tx, ty) + 'L' + P(bx - nx * 6, by - ny * 6) + '"' + st + '/>';
      });
    } else if (style === 'Harmonization') {
      // a short parallel line on either side of the link
      [-1, 1].forEach(function (s) {
        out += '<path d="M' + P(mx + s * 7 * nx - 12 * ux, my + s * 7 * ny - 12 * uy) + 'L' + P(mx + s * 7 * nx + 12 * ux, my + s * 7 * ny + 12 * uy) + '"' + st + '/>';
      });
    } else if (style === 'Separation') {
      // two short lines through the link
      [-1, 1].forEach(function (s) {
        var px = mx + s * 8 * ux, py = my + s * 8 * uy;
        out += '<path d="M' + P(px - 8 * nx, py - 8 * ny) + 'L' + P(px + 8 * nx, py + 8 * ny) + '"' + st + '/>';
      });
    }
    return out;
  }

  // Centralization marks, drawn on a ring of radius R. Angles are measured from the top, clockwise.
  function centralMarks(kind, cx, cy, R) {
    var st = ' fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
    function pt(deg, rad) { var a = (deg - 90) * Math.PI / 180; return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)]; }
    function P(q) { return f(q[0]) + ' ' + f(q[1]); }
    function arc(c, span, rad) {
      var a = pt(c - span / 2, rad), b = pt(c + span / 2, rad);
      return 'M' + P(a) + 'A' + f(rad) + ' ' + f(rad) + ' 0 0 1 ' + P(b);
    }
    var out = '', k, reach = 0;
    if (kind === 'Filtration') {
      // three arcs at the top, lower right, and lower left, each end jutting out along the radius
      [0, 120, 240].forEach(function (c) {
        var a = pt(c - 32, R), b = pt(c + 32, R), a2 = pt(c - 32, R + 12), b2 = pt(c + 32, R + 12);
        out += '<path d="' + arc(c, 64, R) + 'M' + P(a) + 'L' + P(a2) + 'M' + P(b) + 'L' + P(b2) + '"' + st + '/>';
      });
      reach = 12;
    } else if (kind === 'Condensation') {
      // six chevrons pointing inward
      for (k = 0; k < 6; k++) {
        var c = k * 60, tip = pt(c, R), l = pt(c - 7, R + 14), r2 = pt(c + 7, R + 14);
        out += '<path d="M' + P(l) + 'L' + P(tip) + 'L' + P(r2) + '"' + st + '/>';
      }
      reach = 14;
    } else if (kind === 'Gathering') {
      // twelve short spiral arms, each turning clockwise as it moves in toward the center
      for (k = 0; k < 12; k++) {
        var d = '';
        for (var t = 0; t <= 10; t++) {
          var q = pt(k * 30 - 16 + 32 * t / 10, R + 26 - 20 * t / 10);
          d += (t ? 'L' : 'M') + P(q);
        }
        out += '<path d="' + d + '"' + st + '/>';
      }
      reach = 26;
    }
    return { svg: out, reach: reach };
  }

  /*
    signature(o) returns an SVG string.
      o.schema     Object name (a key of SCHEMAS)
      o.figures    up to six polarity specs, slot 0 first
      o.style      Collision | Harmonization | Separation, the marks on the links (omit for plain links)
      o.texture    Tranquil | Volatile | Rampant. It shapes the Motive rings, and the outer boundary unless o.noBoundary
      o.r          figure radius, default 46
      o.centralization  Filtration | Condensation | Gathering, drawn outside the Texture boundary
      o.rank       rings around the Motive polarity, one per Rank, default 1
      o.label      text alternative
  */
  // Wrap markup in a group at the given opacity (1 or undefined leaves it alone, 0 drops it).
  function fade(str, v) {
    if (v === undefined || v >= 0.999) return str;
    if (v <= 0.001 || !str) return '';
    return '<g opacity="' + f(v) + '">' + str + '</g>';
  }

  function unit(o) {
    var sc = SCHEMAS[o.schema], r = o.r || 46, tex = o.texture || 'Tranquil';
    var nodes = sc.nodes.map(function (p) { return [p[0] * U, p[1] * U]; });
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    nodes.forEach(function (p) {
      minx = Math.min(minx, p[0] - r); maxx = Math.max(maxx, p[0] + r);
      miny = Math.min(miny, p[1] - r); maxy = Math.max(maxy, p[1] + r);
    });
    var cx = (minx + maxx) / 2, cy = (miny + maxy) / 2, g = '', gl = '', gm = '', gr = '', gb = '', gc = '', rv = o.reveal || {};
    // links, with Circulation marks
    sc.edges.forEach(function (e) {
      gl += '<line x1="' + f(nodes[e[0]][0]) + '" y1="' + f(nodes[e[0]][1]) + '" x2="' + f(nodes[e[1]][0]) + '" y2="' + f(nodes[e[1]][1]) +
        '" stroke="var(--ink2)" stroke-width="1.2" stroke-dasharray="2 5" stroke-linecap="round"/>';
      if (o.style) gm += linkMarks(nodes[e[0]], nodes[e[1]], o.style);
    });
    // figures
    nodes.forEach(function (p, i) {
      var spec = o.figures && o.figures[i % o.figures.length];
      g += '<g transform="translate(' + f(p[0]) + ' ' + f(p[1]) + ')">' + (spec ? figure(spec, r) : '') +
        '<circle r="3.2" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.5"/></g>';
    });
    // Motive rings: the Texture outline repeated once per Rank
    var rank = o.rank || 1, ringOut = 0;
    for (var k = 0; k < rank; k++) {
      var rr = r + 10 + k * 16, ringPts = [];
      for (var a = 0; a < 24; a++) ringPts.push([rr * Math.cos(TAU * a / 24), rr * Math.sin(TAU * a / 24)]);
      var RS = fitTexture(tex, ringPts);
      ringOut = Math.max(ringOut, RS);
      gr += textureMarkup(tex, nodes[0][0], nodes[0][1], RS, 'var(--ochre)', 1.8);
    }
    // outer boundary
    var half = Math.max(maxx - minx, maxy - miny) / 2 + 20;
    if (o.texture && !o.noBoundary) {
      var pts = [];
      nodes.forEach(function (p, i) {
        var rad = i === 0 ? ringOut + 4 : r + 12, n = i === 0 ? 48 : 16;
        for (var a = 0; a < n; a++) pts.push([p[0] - cx + rad * Math.cos(TAU * a / n), p[1] - cy + rad * Math.sin(TAU * a / n)]);
      });
      var fc = fitCentered(tex, pts), S = fc.S;
      cx += fc.dx; cy += fc.dy;
      gb += textureMarkup(tex, cx, cy, S, 'var(--ink2)', 1.8);
      half = S + 8;
    } else {
      half = Math.max(half, Math.max(Math.abs(nodes[0][0] - cx), Math.abs(nodes[0][1] - cy)) + ringOut + 12);
    }
    // Centralization: marks outside the Texture boundary, arranged around the whole signature
    if (o.centralization) {
      var R0 = half - 8 + 16, cm = centralMarks(o.centralization, cx, cy, R0);
      gc += cm.svg; half = R0 + cm.reach + 8;
    }
    g = fade(gl, rv.links) + fade(gm, rv.marks) + g + fade(gr, rv.rings) + fade(gb, rv.bound) + fade(gc, rv.cent);
    return { g: g, cx: cx, cy: cy, half: half };
  }

  // The shape drawn on each link between copies at the Realization and Expansion levels.
  var LEVEL_SHAPES = {
    Focused: ['star', 3, 0], Projected: ['poly', 3, 0], Suppressed: ['poly', 6, 0],
    Replicating: ['poly', 4, 45], Connection: ['star', 4, 0], Pressurizing: ['poly', 8, 22.5]
  };
  function shapeMark(kind, x, y, r) {
    var d = LEVEL_SHAPES[kind], pts = shapePts(d[0], d[1], r, d[0] === 'star' ? (d[1] === 3 ? 0.3 : 0.45) : 0), a = d[2] * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a);
    return '<path d="M' + pts.map(function (q) { return f(x + q[0] * c - q[1] * sn) + ' ' + f(y + q[0] * sn + q[1] * c); }).join('L') +
      'Z" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.8" stroke-linejoin="round"/>';
  }

  // Copy a unit once at each node of the schema, and put the level's shape on each link between copies.
  function wrapLevel(u, kind, o, rev) {
    rev = rev === undefined ? 1 : rev;
    var sc = SCHEMAS[o.schema], dmin = 1e9, i, j;
    for (i = 0; i < sc.nodes.length; i++) for (j = i + 1; j < sc.nodes.length; j++) {
      dmin = Math.min(dmin, Math.hypot(sc.nodes[i][0] - sc.nodes[j][0], sc.nodes[i][1] - sc.nodes[j][1]));
    }
    var U2 = 2 * u.half * 1.3 / dmin, nodes = sc.nodes.map(function (p) { return [p[0] * U2, p[1] * U2]; });
    var minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9, g = '';
    nodes.forEach(function (p) {
      minx = Math.min(minx, p[0]); maxx = Math.max(maxx, p[0]); miny = Math.min(miny, p[1]); maxy = Math.max(maxy, p[1]);
    });
    var gk = '';
    sc.edges.forEach(function (e) {
      var a = nodes[e[0]], b = nodes[e[1]], L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
      var gap = u.half * 0.7;
      if (L > 2 * gap) gk += '<line x1="' + f(a[0] + ux * gap) + '" y1="' + f(a[1] + uy * gap) + '" x2="' + f(b[0] - ux * gap) + '" y2="' + f(b[1] - uy * gap) +
        '" stroke="var(--ink2)" stroke-width="1.2" stroke-dasharray="2 5" stroke-linecap="round"/>';
    });
    var gcp = '', gsh = '';
    nodes.forEach(function (p, i) {
      var cp = '<g transform="translate(' + f(p[0] - u.cx) + ' ' + f(p[1] - u.cy) + ')">' + u.g + '</g>';
      if (i === 0) g += cp; else gcp += cp;
    });
    sc.edges.forEach(function (e) {
      var a = nodes[e[0]], b = nodes[e[1]];
      if (Math.hypot(b[0] - a[0], b[1] - a[1]) > 2 * u.half * 0.7 + 20) gsh += shapeMark(kind, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.max(16, u.half * 0.2));
    });
    g = fade(gk, rev) + g + fade(gcp, rev) + fade(gsh, rev);
    var gb = '', gc = '';
    var cx = (minx + maxx) / 2, cy = (miny + maxy) / 2, half = Math.max(maxx - minx, maxy - miny) / 2 + u.half + 8;
    // the Texture boundary and Centralization marks repeat around the whole level
    if (o.texture) {
      var pts = [];
      nodes.forEach(function (p) {
        for (var a = 0; a < 32; a++) pts.push([p[0] - cx + (u.half * 2.1 + 8) * Math.cos(TAU * a / 32), p[1] - cy + (u.half * 2.1 + 8) * Math.sin(TAU * a / 32)]);
      });
      var fc = fitCentered(o.texture, pts), S = fc.S;
      cx += fc.dx; cy += fc.dy;
      gb += textureMarkup(o.texture, cx, cy, S, 'var(--ink2)', 1.8);
      half = S + 8;
    }
    if (o.centralization) {
      var R0 = half - 8 + 16, cm = centralMarks(o.centralization, cx, cy, R0);
      gc += cm.svg; half = R0 + cm.reach + 8;
    }
    g += fade(gb, rev) + fade(gc, rev);
    return { g: g, cx: cx, cy: cy, half: half, focus: { x: nodes[0][0], y: nodes[0][1], half: u.half } };
  }

  /*
    signature(o) returns an SVG string. Realization (Focused, Projected, Suppressed) copies the unit once per schema node
    with a triangle, 3-point star, or hexagon on each link. Expansion (Replicating, Connection, Pressurizing) does the same to
    that result with a square, 4-point star, or octagon. Everything else is as for unit above.
  */
  function signature(o) {
    var u = unit(o);
    if (o.realization) u = wrapLevel(u, o.realization, o);
    if (o.realization && o.expansion) u = wrapLevel(u, o.expansion, o);
    var pad = o.realization && o.expansion ? 1.06 : 1, hh = u.half * pad;
    var vb = [f(u.cx - hh), f(u.cy - hh), f(hh * 2), f(hh * 2)].join(' ');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" role="img" aria-label="' + (o.label || 'Ren signature schematic') +
      '"><style>*{vector-effect:non-scaling-stroke}</style>' + u.g + '</svg>';
  }


  // ---- Realm-aware rendering from a character's polarities ----
  var polIndex = null;
  function polaritySpec(name) {
    if (!polIndex) {
      polIndex = {};
      var d = window.RENPOLARITIES;
      if (d) d.polarities.forEach(function (p) {
        polIndex[p.name] = { layers: p.layers.map(function (l) { return { shape: l.shape, n: l.n, edges: l.edges, rot: l.rot || 0 }; }) };
      });
    }
    return polIndex[name] || null;
  }
  function ramp(x, a, b) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  /*
    render(st) draws a character's signature at a Realm from 0 to 5 (fractions allowed) and returns an SVG string.
      st.polarities   up to six polarity names (they must be in ren-polarities-data.js)
      st.motive       { polarity, object, rank }, which sets the schema, slot 0, and the rings
      st.identity     { polarity, polarity2 }, slots 1 and 2
      st.style, st.texture, st.centralization, st.realization, st.expansion   as for signature
    Realm steps: 0 the polarities alone, 1 links and the Motive rings, 2 Circulation marks, 3 the Texture boundary and
    Centralization (the Star), 4 the Star copied once per schema node (Realization), 5 that copied again (Expansion).
    Between 3 and 5 the view zooms out from the first copy to the whole.
  */
  function render(st) {
    var realm = Math.max(0, Math.min(5, st.realm || 0)), names = [];
    [st.motive && st.motive.polarity, st.identity && st.identity.polarity, st.identity && st.identity.polarity2].concat(st.polarities || []).forEach(function (n) {
      if (n && names.indexOf(n) < 0) names.push(n);
    });
    var figs = names.slice(0, 6).map(polaritySpec).filter(Boolean);
    var o = { schema: st.motive.object, figures: figs, style: st.style, texture: st.texture || 'Tranquil', rank: st.motive.rank, centralization: st.centralization };
    var full = unit(o), view, body;
    if (realm < 3) {
      var u0 = unit(Object.assign({}, o, { reveal: { links: ramp(realm, 0, 1), rings: ramp(realm, 0.5, 1.5), marks: ramp(realm, 1, 2), bound: 1, cent: ramp(realm, 2.4, 3) } }));
      body = u0.g; view = { x: full.cx, y: full.cy, half: full.half };
    } else if (realm <= 4) {
      var t1 = ramp(realm, 3, 4), l1 = wrapLevel(full, st.realization || 'Focused', o, t1);
      body = l1.g; view = lerpView(l1.focus, { x: l1.cx, y: l1.cy, half: l1.half }, t1);
    } else {
      var l1b = wrapLevel(full, st.realization || 'Focused', o, 1), t2 = ramp(realm, 4, 5), l2 = wrapLevel(l1b, st.expansion || 'Replicating', o, t2);
      body = l2.g; view = lerpView(l2.focus, { x: l2.cx, y: l2.cy, half: l2.half }, t2);
    }
    var hh = view.half * (1.1 + 0.06 * ramp(realm, 4, 5));
    var label = 'Schematic of a Ren signature: ' + names.join(', ') + '. Motive ' + st.motive.polarity + ' of ' + st.motive.object + ', Realm ' + (Math.round(realm * 10) / 10) + '.';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + [f(view.x - hh), f(view.y - hh), f(hh * 2), f(hh * 2)].join(' ') + '" role="img" aria-label="' + label + '">' +
      '<title>' + label + '</title><style>*{vector-effect:non-scaling-stroke}</style>' + body + '</svg>';
  }
  function lerpView(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, half: Math.exp(Math.log(a.half) + (Math.log(b.half) - Math.log(a.half)) * t) };
  }

  // One straight-line demo of an edge type between two dots.
  function edgeDemo(t) {
    var a = [-60, 0], b = [60, 0];
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-80 -40 160 80" role="img" aria-label="' + EDGE_NAMES[t] + ' edge">' +
      '<path d="M' + a[0] + ' ' + a[1] + edgeSeg(a, b, t, [0, 40]) + '" fill="none" stroke="var(--ink)" stroke-width="2.4"/>' +
      '<circle cx="-60" r="4" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.6"/><circle cx="60" r="4" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.6"/></svg>';
  }

  function figureSvg(spec, r) {
    r = r || 46;
    var s = r + 8;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + -s + ' ' + -s + ' ' + 2 * s + ' ' + 2 * s + '" role="img">' + figure(spec, r) + '</svg>';
  }

  window.RenLanguage = {
    EDGE_NAMES: EDGE_NAMES, PRINCIPLES: PRINCIPLES, OPERATIONS: OPERATIONS, SCHEMAS: SCHEMAS, OBJECT_ORDER: OBJECT_ORDER,
    figure: figure, figureSvg: figureSvg, notation: notation, render: render, polaritySpec: polaritySpec, signature: signature, edgeDemo: edgeDemo
  };
})();
