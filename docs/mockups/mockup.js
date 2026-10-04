/*
 * Tracé isométrique filaire partagé par les maquettes de docs/mockups/.
 *
 * Script classique et non un module ES : les pages doivent s'ouvrir par
 * double-clic depuis le disque, et un module chargé en file:// est bloqué par
 * le navigateur.
 *
 * Ce fichier reproduit la projection de `apps/web/src/iso.ts` et les tokens de
 * `apps/web/src/theme.ts` sans en dépendre. Il ne participe pas au build.
 */

(function (global) {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  var PALETTE = {
    background: "#0D0F12",
    geometry: "#FFFFFF",
    campA: "#74D3C4",
    campB: "#E0785F",
    selection: "#F5D76E",
    legalMove: "#6AA9FF",
    climb: "#9B8CF0",
    threat: "#E0785F",
  };

  var METRICS = { tileWidth: 72, tileHeight: 36, heightUnit: 22 };

  /** Terrain de démonstration : un massif haut au nord-ouest, un ressaut au sud-est. */
  var DEMO_TERRAIN = {
    heights: [
      [2, 2, 1, 0, 0, 0, 0],
      [2, 1, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 1, 1, 0],
      [0, 0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ],
    fog: ["5,0", "6,0", "5,1", "6,1", "6,2"],
  };

  var FLAT_TERRAIN = {
    heights: [
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ],
    fog: [],
  };

  function el(name, attrs) {
    var node = document.createElementNS(SVG_NS, name);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (attrs[key] !== null && attrs[key] !== undefined) {
          node.setAttribute(key, String(attrs[key]));
        }
      });
    }
    return node;
  }

  /** Suite reproductible : la dispersion des particules ne doit pas bouger d'un chargement à l'autre. */
  function seeded(seed) {
    var state = seed;
    return function () {
      state = (state * 16807) % 2147483647;
      return state / 2147483647;
    };
  }

  function heightAt(terrain, gx, gy) {
    var row = terrain.heights[gy];
    return row && row[gx] ? row[gx] : 0;
  }

  function isFogged(terrain, gx, gy) {
    return terrain.fog.indexOf(gx + "," + gy) !== -1;
  }

  function project(gx, gy, height) {
    var bx = (gx - gy) * (METRICS.tileWidth / 2);
    var by = (gx + gy) * (METRICS.tileHeight / 2);
    return { bx: bx, by: by, ty: by - (height || 0) * METRICS.heightUnit };
  }

  function projectOn(terrain, gx, gy) {
    return project(gx, gy, heightAt(terrain, gx, gy));
  }

  function diamond(cx, cy, rx, ry) {
    return [
      cx + "," + (cy - ry),
      cx + rx + "," + cy,
      cx + "," + (cy + ry),
      cx - rx + "," + cy,
    ].join(" ");
  }

  function tilePoints(terrain, gx, gy) {
    var p = projectOn(terrain, gx, gy);
    return diamond(p.bx, p.ty, METRICS.tileWidth / 2, METRICS.tileHeight / 2);
  }

  /**
   * Ordre du peintre : une case ou une pièce de `gx + gy` plus grand est plus
   * proche de la caméra et se trace donc après. Sans ce tri, une pièce
   * lointaine se dessine par-dessus une pièce proche.
   */
  function byDepth(cells) {
    return cells.slice().sort(function (a, b) {
      return a.gx + a.gy - (b.gx + b.gy);
    });
  }

  function allCells(terrain) {
    var cells = [];
    for (var gy = 0; gy < terrain.heights.length; gy++) {
      for (var gx = 0; gx < terrain.heights[gy].length; gx++) {
        cells.push({ gx: gx, gy: gy });
      }
    }
    return cells;
  }

  /*
   * Le relief est public : hors LOS il est estompé, jamais masqué
   * (implementation-notes #10). Seules les pièces disparaissent.
   */
  function drawTerrain(svg, terrain, options) {
    var opts = options || {};
    var halfW = METRICS.tileWidth / 2;
    var halfH = METRICS.tileHeight / 2;

    byDepth(allCells(terrain)).forEach(function (cell) {
      var gx = cell.gx;
      var gy = cell.gy;
      var h = heightAt(terrain, gx, gy);
      var p = projectOn(terrain, gx, gy);
      var alpha = isFogged(terrain, gx, gy) ? opts.foggedAlpha || 0.15 : opts.visibleAlpha || 0.6;

      svg.appendChild(
        el("polygon", {
          points: tilePoints(terrain, gx, gy),
          fill: "none",
          stroke: PALETTE.geometry,
          "stroke-width": 1,
          "stroke-opacity": alpha,
        })
      );

      if (h === 0) return;

      // Falaises : seules les arêtes face caméra sont tracées, le volume se lit au silhouettage.
      [
        [p.bx - halfW, p.ty, p.bx - halfW, p.by, 0.7],
        [p.bx, p.ty + halfH, p.bx, p.by + halfH, 0.7],
        [p.bx + halfW, p.ty, p.bx + halfW, p.by, 0.7],
        [p.bx - halfW, p.by, p.bx, p.by + halfH, 0.5],
        [p.bx, p.by + halfH, p.bx + halfW, p.by, 0.5],
      ].forEach(function (e) {
        svg.appendChild(
          el("line", {
            x1: e[0],
            y1: e[1],
            x2: e[2],
            y2: e[3],
            stroke: PALETTE.geometry,
            "stroke-width": 1,
            "stroke-opacity": alpha * e[4],
          })
        );
      });
    });
  }

  function drawTileOverlay(svg, terrain, gx, gy, options) {
    var opts = options || {};
    var node = el("polygon", {
      points: tilePoints(terrain, gx, gy),
      fill: opts.fill || "none",
      "fill-opacity": opts.fillOpacity === undefined ? 0 : opts.fillOpacity,
      stroke: opts.stroke || PALETTE.geometry,
      "stroke-width": opts.strokeWidth || 1.5,
      "stroke-opacity": opts.strokeOpacity === undefined ? 1 : opts.strokeOpacity,
      "stroke-dasharray": opts.dash || null,
    });
    if (opts.className) node.setAttribute("class", opts.className);
    if (opts.delay) node.style.animationDelay = opts.delay + "s";
    svg.appendChild(node);
    return node;
  }

  /*
   * Silhouette des pièces : le type se lit à la forme, jamais à la taille.
   * Aucune pièce n'a de robustesse à exprimer (design.md pilier 2), la
   * verticalité n'encode donc que le rôle.
   *
   *   roi         mât haut, contreforts, anneau ouvert en couronne
   *   commandant  mât moyen barré d'une traverse, chevron plein au sommet
   *   eclaireur   mât court penché, chevron ouvert — la plus légère
   *
   * Proposition de DA non actée : voir docs/mockups/README.md.
   *
   * Les hauteurs sont plafonnées : deux cases voisines de la même colonne
   * isométrique ne sont séparées que de `tileHeight` à l'écran, soit 36 px. Un
   * glyphe plus haut que ça emmêle ses traits avec ceux de la pièce derrière.
   */
  var ICON_VIEW_BOX = "-22 -44 44 56";

  function glyphParts(type, bx, ty) {
    var parts = [
      { kind: "polygon", points: diamond(bx, ty, 18, 9), fillOpacity: 0.12, width: 1.2 },
    ];

    if (type === "roi") {
      parts.push({ kind: "line", x1: bx, y1: ty, x2: bx, y2: ty - 26, width: 1.6 });
      parts.push({ kind: "line", x1: bx - 9, y1: ty + 3, x2: bx, y2: ty - 12, width: 1 });
      parts.push({ kind: "line", x1: bx + 9, y1: ty + 3, x2: bx, y2: ty - 12, width: 1 });
      parts.push({ kind: "circle", cx: bx, cy: ty - 32, r: 6.5, fillOpacity: 0.1, width: 1.6 });
    } else if (type === "commandant") {
      parts.push({ kind: "line", x1: bx, y1: ty, x2: bx, y2: ty - 20, width: 1.6 });
      parts.push({ kind: "polygon", points: diamond(bx, ty - 13, 11, 3.5), fillOpacity: 0.1, width: 1.2 });
      parts.push({
        kind: "polygon",
        points: [bx + "," + (ty - 29), bx + 5.5 + "," + (ty - 20), bx - 5.5 + "," + (ty - 20)].join(" "),
        fillOpacity: 0.22,
        width: 1.5,
      });
    } else {
      parts.push({ kind: "line", x1: bx, y1: ty, x2: bx + 4, y2: ty - 15, width: 1.5 });
      parts.push({
        kind: "polyline",
        points: [bx - 3 + "," + (ty - 16), bx + 4 + "," + (ty - 22), bx + 11 + "," + (ty - 16)].join(" "),
        width: 1.6,
      });
    }

    return parts;
  }

  function glyphShape(part, stroke, width, strokeOpacity, fill, fillOpacity) {
    var shared = {
      stroke: stroke,
      "stroke-opacity": strokeOpacity,
      "stroke-width": width,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      fill: fill,
      "fill-opacity": fill === "none" ? null : fillOpacity,
    };

    if (part.kind === "line") {
      return el("line", Object.assign({ x1: part.x1, y1: part.y1, x2: part.x2, y2: part.y2 }, shared));
    }
    if (part.kind === "polyline") {
      return el("polyline", Object.assign({ points: part.points }, shared, { fill: "none", "fill-opacity": null }));
    }
    if (part.kind === "circle") {
      return el("circle", Object.assign({ cx: part.cx, cy: part.cy, r: part.r }, shared));
    }
    return el("polygon", Object.assign({ points: part.points }, shared));
  }

  function drawGlyph(parent, type, bx, ty, options) {
    var opts = options || {};
    var color = opts.color || PALETTE.campA;
    var alpha = opts.alpha === undefined ? 1 : opts.alpha;
    var fillScale = opts.fillScale === undefined ? 1 : opts.fillScale;
    var group = el("g", { class: opts.className || null });
    var parts = glyphParts(type, bx, ty);

    /*
     * Détourage : le rendu est filaire, donc aucune face opaque ne sépare deux
     * pièces qui se chevauchent. Une passe au ton du fond, plus large et sans
     * remplissage, creuse ce liseré sans masquer la surbrillance de la case.
     */
    if (opts.knockout !== false) {
      parts.forEach(function (part) {
        group.appendChild(glyphShape(part, PALETTE.background, part.width + 3.5, alpha, "none", 0));
      });
    }

    parts.forEach(function (part) {
      group.appendChild(
        glyphShape(part, color, part.width, alpha, color, (part.fillOpacity || 0) * fillScale)
      );
    });

    parent.appendChild(group);
    return group;
  }

  function drawPiece(svg, terrain, piece) {
    var p = projectOn(terrain, piece.gx, piece.gy);
    var color = piece.color || (piece.camp === "B" ? PALETTE.campB : PALETTE.campA);
    // Fantôme : pièce mémorisée mais actuellement hors LOS (design.md 5.4).
    var ghost = Boolean(piece.ghost);

    return drawGlyph(svg, piece.type, p.bx, p.ty, {
      color: color,
      alpha: ghost ? 0.3 : piece.alpha === undefined ? 1 : piece.alpha,
      fillScale: ghost ? 0.04 : 1,
      className: piece.className,
    });
  }

  /** Trace un lot de pièces dans l'ordre du peintre. À préférer à `drawPiece` en boucle. */
  function drawPieces(svg, terrain, pieces) {
    return byDepth(pieces).map(function (piece) {
      return drawPiece(svg, terrain, piece);
    });
  }

  /**
   * Glyphe isolé dans un <svg> de panneau. Le viewBox commun est posé ici :
   * les trois types partagent le même cadre, ce qui laisse la hiérarchie de
   * hauteur se lire telle quelle dans une liste.
   */
  function drawGlyphIcon(svgElement, type, options) {
    svgElement.setAttribute("viewBox", ICON_VIEW_BOX);
    drawGlyph(svgElement, type, 0, 0, Object.assign({ knockout: false }, options));
    return svgElement;
  }

  function scatter(svg, options) {
    var opts = options || {};
    var rand = seeded(opts.seed || 1337);
    var count = opts.count || 20;
    var box = opts.box;
    var group = el("g");

    for (var i = 0; i < count; i++) {
      var node = el("circle", {
        class: opts.className || "occ-drift",
        cx: Math.round(box.x + rand() * box.width),
        cy: Math.round(box.y + rand() * box.height),
        r: (opts.minRadius || 0.7) + rand() * (opts.radiusSpread || 1.1),
        fill: opts.color || PALETTE.geometry,
      });
      node.style.animationDuration = (opts.minDuration || 9) + rand() * (opts.durationSpread || 8) + "s";
      // Délai négatif : les particules sont déjà en vol au premier rendu.
      node.style.animationDelay = -rand() * (opts.delaySpread || 16) + "s";
      if (opts.peakOpacity) node.style.setProperty("--occ-peak", opts.peakOpacity);
      group.appendChild(node);
    }

    svg.appendChild(group);
    return group;
  }

  /** Particules concentrées autour d'un point, en disque aplati par la projection. */
  function emitAround(svg, origin, options) {
    var opts = options || {};
    var rand = seeded(opts.seed || 99);
    var count = opts.count || 8;
    var group = el("g");

    for (var i = 0; i < count; i++) {
      var angle = rand() * Math.PI * 2;
      var spread = (opts.innerRatio || 0.35) + rand() * (opts.outerRatio || 0.65);
      var node = el("circle", {
        class: opts.className || "occ-lift",
        cx: (origin.x + Math.cos(angle) * (opts.radiusX || 8) * spread).toFixed(1),
        cy: (origin.y + Math.sin(angle) * (opts.radiusY || 4) * spread).toFixed(1),
        r: (opts.minRadius || 0.8) + rand() * (opts.radiusSpread || 1),
        fill: opts.color || PALETTE.selection,
      });
      node.style.animationDuration = (opts.minDuration || 2.6) + rand() * (opts.durationSpread || 1.8) + "s";
      node.style.animationDelay = -rand() * (opts.delaySpread || 4) + "s";
      group.appendChild(node);
    }

    svg.appendChild(group);
    return group;
  }

  /** Trace du dernier coup joué, en pointillés animés. */
  function drawMoveTrail(svg, terrain, from, to) {
    var a = projectOn(terrain, from[0], from[1]);
    var b = projectOn(terrain, to[0], to[1]);

    svg.appendChild(
      el("polyline", {
        class: "occ-march",
        points: a.bx + "," + a.ty + " " + b.bx + "," + b.ty,
        fill: "none",
        stroke: PALETTE.geometry,
        "stroke-opacity": 0.3,
        "stroke-width": 1.5,
        "stroke-dasharray": "4 4",
      })
    );
    svg.appendChild(
      el("circle", {
        cx: a.bx,
        cy: a.ty,
        r: 2.5,
        fill: "none",
        stroke: PALETTE.geometry,
        "stroke-opacity": 0.25,
        "stroke-width": 1,
      })
    );
  }

  global.Occulis = {
    SVG_NS: SVG_NS,
    PALETTE: PALETTE,
    METRICS: METRICS,
    ICON_VIEW_BOX: ICON_VIEW_BOX,
    DEMO_TERRAIN: DEMO_TERRAIN,
    FLAT_TERRAIN: FLAT_TERRAIN,
    el: el,
    seeded: seeded,
    project: project,
    projectOn: projectOn,
    diamond: diamond,
    tilePoints: tilePoints,
    heightAt: heightAt,
    isFogged: isFogged,
    drawTerrain: drawTerrain,
    drawTileOverlay: drawTileOverlay,
    glyphParts: glyphParts,
    drawGlyph: drawGlyph,
    drawGlyphIcon: drawGlyphIcon,
    drawPiece: drawPiece,
    drawPieces: drawPieces,
    scatter: scatter,
    emitAround: emitAround,
    drawMoveTrail: drawMoveTrail,
  };
})(window);
