/*
 * Socle commun des maquettes de l'ATH : le plateau de démonstration, les glyphes de
 * pièces, la barre d'état et de thème, la mise à l'échelle de l'écran.
 *
 * Le plateau est un décor figé, dessiné en SVG pour situer l'ATH : le vrai rendu est
 * en PixiJS (`packages/board`). Il reprend la projection isométrique, les faces pleines
 * aux arêtes d'os, le brouillard tramé un pixel sur deux et les lueurs d'état.
 *
 * Les positions, portées et coups légaux sont posés à la main pour illustrer : aucune
 * règle n'est recalculée ici.
 */
(function () {
  "use strict";

  var SVG_NS = "http://www.w3.org/2000/svg";

  // ---- Projection --------------------------------------------------------------

  var TILE_WIDTH = 64;
  var TILE_HEIGHT = 32;
  var HEIGHT_UNIT = 16;
  /** Épaisseur du socle sous une case de hauteur 0, en niveaux. */
  var BASE_DEPTH = 0.6;

  function project(x, y, height) {
    return {
      x: ((x - y) * TILE_WIDTH) / 2,
      y: ((x + y) * TILE_HEIGHT) / 2 - height * HEIGHT_UNIT,
    };
  }

  // ---- La carte de démonstration ------------------------------------------------

  /** Hauteur de chaque case, ligne par ligne (y de 0 à 8) ; `null` : pas de case. */
  var HEIGHTS = [
    [2, 2, 1, 0, 0, 0, 1, 2, 2],
    [2, 1, 0, 0, 0, 0, 0, 1, 2],
    [1, 0, 0, 3, 3, 0, 0, 0, 1],
    [0, 0, 0, 3, 0, 0, 2, 0, 0],
    [0, 0, 0, 0, 0, 0, 2, 0, null],
    [0, 1, 0, 0, 0, 0, 0, 0, 0],
    [0, 1, 1, 2, 0, 3, 0, 0, 0],
    [1, 0, 0, 0, 0, 3, 0, 0, 1],
    [2, 1, 0, 0, 0, 0, 0, 1, 2],
  ];
  var MAX_HEIGHT = 3;

  function heightAt(x, y) {
    var row = HEIGHTS[y];
    return row === undefined ? null : row[x] === undefined ? null : row[x];
  }

  /** Les pièces du joueur (camp A) : un pion est déjà tombé. */
  var OWN_PIECES = [
    { kind: "commander", x: 4, y: 8, vision: 2 },
    { kind: "scout", x: 2, y: 6, vision: 4 },
    { kind: "scout", x: 6, y: 5, vision: 4 },
    { kind: "scout", x: 1, y: 7, vision: 4 },
    { kind: "pawn", x: 4, y: 6, vision: 2 },
  ];

  /** Ce que le joueur sait de l'adversaire : deux pièces en vue, un fantôme. */
  var ENEMY_PIECES = [
    { kind: "pawn", x: 5, y: 3 },
    { kind: "scout", x: 1, y: 3 },
    { kind: "pawn", x: 3, y: 1, ghost: true },
  ];

  /** Cases que la portée de vision couvre mais qu'un relief masque. */
  var OCCLUDED = ["3,1", "4,1", "3,0", "4,0", "7,2", "7,1", "8,2", "8,3", "6,2", "5,1"];

  function isVisible(x, y) {
    if (OCCLUDED.indexOf(x + "," + y) !== -1) return false;
    return OWN_PIECES.some(function (piece) {
      var distance = Math.max(Math.abs(piece.x - x), Math.abs(piece.y - y));
      return distance <= piece.vision;
    });
  }

  /**
   * Ce que le plateau montre dans chaque état de la maquette. `selected` est la pièce
   * choisie, `legal`, `climb` et `capture` ses destinations telles que le serveur les
   * transmet, `last` le dernier coup adverse vu.
   */
  var SCENES = {
    yours: {
      selected: [2, 6],
      legal: [
        [2, 5],
        [2, 4],
        [2, 3],
        [1, 5],
        [0, 4],
        [3, 5],
        [4, 4],
        [1, 6],
        [0, 6],
        [2, 7],
        [2, 8],
        [3, 7],
      ],
      climb: [[3, 6]],
      capture: [[5, 3]],
      hover: [4, 4],
    },
    theirs: { last: { from: [6, 7], to: [6, 5] } },
    check: {
      selected: [4, 8],
      check: [4, 8],
      legal: [
        [3, 8],
        [3, 7],
        [5, 8],
      ],
    },
    away: { last: { from: [6, 7], to: [6, 5] } },
    watch: { last: { from: [6, 7], to: [6, 5] } },
    draw: {},
  };

  // ---- Glyphes de pièces --------------------------------------------------------

  /** Glyphes de 9 × 9 pixels, `#` allumé. Provisoires, comme le roster. */
  var GLYPHS = {
    commander: [
      "..#.#.#..",
      "..#####..",
      "...###...",
      "..#####..",
      "...###...",
      "...###...",
      "..#####..",
      ".#######.",
      ".#######.",
    ],
    scout: [
      "....#....",
      "...###...",
      "..##.##..",
      "...###...",
      "....#....",
      "...###...",
      "..#####..",
      ".#######.",
      ".#######.",
    ],
    pawn: [
      ".........",
      ".........",
      "...###...",
      "..#####..",
      "...###...",
      "...###...",
      "..#####..",
      ".#######.",
      ".#######.",
    ],
  };

  function element(name, attributes, parent) {
    var node = document.createElementNS(SVG_NS, name);
    Object.keys(attributes || {}).forEach(function (key) {
      node.setAttribute(key, attributes[key]);
    });
    if (parent) parent.appendChild(node);
    return node;
  }

  /** Dessine un glyphe en pixels de `size` unités, coin haut-gauche en (left, top). */
  function drawGlyph(parent, kind, left, top, size, fill) {
    var group = element("g", { "shape-rendering": "crispEdges", style: "fill: " + fill }, parent);
    GLYPHS[kind].forEach(function (row, rowIndex) {
      row.split("").forEach(function (cell, columnIndex) {
        if (cell !== "#") return;
        element(
          "rect",
          {
            x: left + columnIndex * size,
            y: top + rowIndex * size,
            width: size,
            height: size,
          },
          group,
        );
      });
    });
    return group;
  }

  var CAMP_COLORS = {
    a: "var(--occ-camp-a)",
    b: "var(--occ-camp-b)",
    ghost: "var(--occ-ink-dim)",
    ink: "var(--occ-ink-soft)",
  };

  /** Remplit chaque `<svg class="glyph" data-kind data-camp>` de l'ATH. */
  function fillHudGlyphs(root) {
    root.querySelectorAll("svg.glyph[data-kind]").forEach(function (svg) {
      svg.setAttribute("viewBox", "0 -1 9 11");
      svg.innerHTML = "";
      var color = CAMP_COLORS[svg.dataset.camp || "ink"];
      // Une ombre d'un pixel sous le glyphe, comme le relief des boutons.
      drawGlyph(svg, svg.dataset.kind, 0, 1, 1, "var(--occ-shade)");
      drawGlyph(svg, svg.dataset.kind, 0, 0, 1, color);
    });
  }

  // ---- Le plateau ---------------------------------------------------------------

  function tileTop(x, y, height) {
    return [
      project(x, y, height),
      project(x + 1, y, height),
      project(x + 1, y + 1, height),
      project(x, y + 1, height),
    ];
  }

  function points(list) {
    return list
      .map(function (point) {
        return point.x + "," + point.y;
      })
      .join(" ");
  }

  /** Le dessus s'éclaircit avec la hauteur ; hors de vue, il s'assombrit (8.1). */
  function topColor(height, visible) {
    var lift = Math.round((height / MAX_HEIGHT) * 100);
    var lit = "color-mix(in srgb, var(--occ-matter-peak) " + lift + "%, var(--occ-matter))";
    return visible ? lit : "color-mix(in srgb, var(--occ-shade) 55%, " + lit + ")";
  }

  function defineSharedPaint(svg) {
    var defs = element("defs", {}, svg);

    var weave = element(
      "pattern",
      { id: "fog-weave", width: 2, height: 2, patternUnits: "userSpaceOnUse" },
      defs,
    );
    element("rect", { class: "fog-dot", x: 0, y: 0, width: 1, height: 1 }, weave);
    element("rect", { class: "fog-dot", x: 1, y: 1, width: 1, height: 1 }, weave);

    var column = element(
      "linearGradient",
      { id: "selection-column", x1: 0, y1: 1, x2: 0, y2: 0 },
      defs,
    );
    element(
      "stop",
      { offset: 0, style: "stop-color: var(--occ-selection); stop-opacity: 0.35" },
      column,
    );
    element(
      "stop",
      { offset: 1, style: "stop-color: var(--occ-selection); stop-opacity: 0" },
      column,
    );

    var glow = element("radialGradient", { id: "piece-glow-a" }, defs);
    element("stop", { offset: 0, style: "stop-color: var(--occ-camp-a); stop-opacity: 0.4" }, glow);
    element("stop", { offset: 1, style: "stop-color: var(--occ-camp-a); stop-opacity: 0" }, glow);

    var glowB = element("radialGradient", { id: "piece-glow-b" }, defs);
    element(
      "stop",
      { offset: 0, style: "stop-color: var(--occ-camp-b); stop-opacity: 0.4" },
      glowB,
    );
    element("stop", { offset: 1, style: "stop-color: var(--occ-camp-b); stop-opacity: 0" }, glowB);
  }

  function drawTile(layer, x, y, height) {
    var visible = isVisible(x, y);
    var group = element("g", { class: visible ? "tile" : "tile is-fog" }, layer);
    var top = tileTop(x, y, height);
    var base = tileTop(x, y, -BASE_DEPTH);

    // Seules les deux faces tournées vers la caméra sont tracées.
    element(
      "polygon",
      { class: "tile-side-left", points: points([top[3], top[2], base[2], base[3]]) },
      group,
    );
    element(
      "polygon",
      { class: "tile-side-right", points: points([top[1], top[2], base[2], base[1]]) },
      group,
    );
    element(
      "polygon",
      { class: "tile-top", points: points(top), style: "fill: " + topColor(height, visible) },
      group,
    );
    if (!visible) element("polygon", { class: "fog-weave", points: points(top) }, group);
  }

  function drawOverlay(layer, tile, className) {
    var height = heightAt(tile[0], tile[1]);
    element(
      "polygon",
      { class: "overlay " + className, points: points(tileTop(tile[0], tile[1], height)) },
      layer,
    );
  }

  function tileCenter(x, y) {
    var height = heightAt(x, y);
    var point = project(x + 0.5, y + 0.5, height);
    return { x: point.x, y: point.y };
  }

  function drawPiece(layer, piece, camp, selected) {
    var center = tileCenter(piece.x, piece.y);
    var pixel = 2;
    var lift = selected ? 6 : 0;
    var group = element("g", { class: piece.ghost ? "piece piece--ghost" : "piece" }, layer);

    if (selected) {
      element(
        "rect",
        { class: "selection-column", x: center.x - 10, y: center.y - 70, width: 20, height: 70 },
        group,
      );
    }
    if (!piece.ghost) {
      element(
        "ellipse",
        {
          class: "piece-light",
          cx: center.x,
          cy: center.y,
          rx: 22,
          ry: 11,
          fill: "url(#piece-glow-" + camp + ")",
        },
        group,
      );
    }
    var left = center.x - 4.5 * pixel;
    var top = center.y - 9 * pixel - 2 - lift;
    drawGlyph(group, piece.kind, left, top + pixel, pixel, "var(--occ-shade)");
    drawGlyph(
      group,
      piece.kind,
      left,
      top,
      pixel,
      piece.ghost ? CAMP_COLORS.ghost : CAMP_COLORS[camp],
    );
  }

  function drawTrail(layer, from, to) {
    var start = tileCenter(from[0], from[1]);
    var end = tileCenter(to[0], to[1]);
    var middle = { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - 30 };
    element(
      "path",
      {
        class: "trail",
        d:
          "M" +
          start.x +
          "," +
          start.y +
          " Q" +
          middle.x +
          "," +
          middle.y +
          " " +
          end.x +
          "," +
          end.y,
      },
      layer,
    );
  }

  function sameTile(a, b) {
    return a !== undefined && b !== undefined && a[0] === b[0] && a[1] === b[1];
  }

  function renderBoard(svg, state) {
    var scene = SCENES[state] || SCENES.yours;
    svg.innerHTML = "";
    defineSharedPaint(svg);

    var terrain = element("g", {}, svg);
    var overlays = element("g", {}, svg);
    var pieces = element("g", {}, svg);

    // Ordre du peintre : des cases du fond vers celles de devant.
    var tiles = [];
    HEIGHTS.forEach(function (row, y) {
      row.forEach(function (height, x) {
        if (height !== null) tiles.push({ x: x, y: y, height: height });
      });
    });
    tiles.sort(function (a, b) {
      return a.x + a.y - (b.x + b.y);
    });
    tiles.forEach(function (tile) {
      drawTile(terrain, tile.x, tile.y, tile.height);
    });

    (scene.legal || []).forEach(function (tile) {
      drawOverlay(overlays, tile, "overlay--legal overlay--breathe");
    });
    (scene.climb || []).forEach(function (tile) {
      drawOverlay(overlays, tile, "overlay--climb");
    });
    (scene.capture || []).forEach(function (tile) {
      drawOverlay(overlays, tile, "overlay--capture overlay--breathe");
    });
    if (scene.hover) drawOverlay(overlays, scene.hover, "overlay--hover");
    if (scene.check) drawOverlay(overlays, scene.check, "overlay--check overlay--breathe");
    else if (scene.selected) drawOverlay(overlays, scene.selected, "overlay--selection");
    if (scene.last) {
      drawOverlay(overlays, scene.last.to, "overlay--last");
      drawTrail(overlays, scene.last.from, scene.last.to);
    }

    var all = OWN_PIECES.map(function (piece) {
      return { piece: piece, camp: "a" };
    }).concat(
      ENEMY_PIECES.map(function (piece) {
        return { piece: piece, camp: "b" };
      }),
    );
    all.sort(function (a, b) {
      return a.piece.x + a.piece.y - (b.piece.x + b.piece.y);
    });
    all.forEach(function (entry) {
      var isSelected = sameTile(scene.selected, [entry.piece.x, entry.piece.y]);
      drawPiece(pieces, entry.piece, entry.camp, isSelected);
    });

    fitViewBox(svg);
  }

  /** Cadre le plateau dans le SVG ; `data-shift` décale le centre, en pixels d'écran. */
  function fitViewBox(svg) {
    var corners = [
      project(0, 0, MAX_HEIGHT),
      project(9, 0, 0),
      project(0, 9, 0),
      project(9, 9, -BASE_DEPTH),
    ];
    var left = corners[2].x;
    var right = corners[1].x;
    var top = corners[0].y - 40;
    var bottom = corners[3].y;
    var zoom = Number(svg.dataset.zoom || 1.08);
    var width = (right - left) * zoom;
    var height = (bottom - top) * zoom;
    var centerX = (left + right) / 2;
    var centerY = (top + bottom) / 2;
    svg.setAttribute(
      "viewBox",
      [centerX - width / 2, centerY - height / 2, width, height].join(" "),
    );
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  }

  /**
   * Place les éléments `data-anchor="selected"` au-dessus de la pièce choisie, comme
   * la fiche de pièce actuelle (`piece-info-model.ts`, `placeAbove`).
   */
  function placeAnchors(screen, svg, state) {
    var scene = SCENES[state] || SCENES.yours;
    var scale = screen.getBoundingClientRect().width / screen.offsetWidth;
    screen.querySelectorAll("[data-anchor]").forEach(function (node) {
      if (!scene.selected) return;
      var center = tileCenter(scene.selected[0], scene.selected[1]);
      var point = svg.createSVGPoint();
      point.x = center.x;
      point.y = center.y - 30;
      var onScreen = point.matrixTransform(svg.getScreenCTM());
      var frame = screen.getBoundingClientRect();
      var x = (onScreen.x - frame.left) / scale;
      var y = (onScreen.y - frame.top) / scale;
      var side = node.dataset.anchor === "right" ? 1 : -1;
      node.style.left = (side > 0 ? x + 36 : x - node.offsetWidth - 36) + "px";
      node.style.top = Math.max(16, y - node.offsetHeight / 2) + "px";
    });
  }

  // ---- Barre de la maquette -----------------------------------------------------

  var STATES = [
    ["yours", "À vous"],
    ["theirs", "Adversaire au trait"],
    ["check", "Échec"],
    ["away", "Adversaire déconnecté"],
    ["watch", "Spectateur"],
    ["draw", "Nulle proche"],
  ];
  var THEMES = [
    ["obsidian", "Obsidienne"],
    ["reliquary", "Reliquaire"],
    ["astral", "Astral"],
  ];

  function readHash() {
    var params = new URLSearchParams(location.hash.slice(1));
    return { state: params.get("etat") || "yours", theme: params.get("theme") || "obsidian" };
  }

  function writeHash(current) {
    history.replaceState(null, "", "#etat=" + current.state + "&theme=" + current.theme);
  }

  function buildGroup(label, options, selected, onPick) {
    var group = document.createElement("div");
    group.className = "mock-toolbar__group";
    var caption = document.createElement("span");
    caption.textContent = label;
    group.appendChild(caption);
    options.forEach(function (option) {
      var button = document.createElement("button");
      button.type = "button";
      button.textContent = option[1];
      button.setAttribute("aria-pressed", String(option[0] === selected));
      button.addEventListener("click", function () {
        group.querySelectorAll("button").forEach(function (other) {
          other.setAttribute("aria-pressed", String(other === button));
        });
        onPick(option[0]);
      });
      group.appendChild(button);
    });
    return group;
  }

  // ---- Mise en route ------------------------------------------------------------

  function fitScreen(screen) {
    var holder = screen.parentElement;
    var scale = Math.min(1, holder.clientWidth / screen.offsetWidth);
    screen.style.transform = "scale(" + scale + ")";
    holder.style.height = screen.offsetHeight * scale + "px";
  }

  function start() {
    var screen = document.querySelector(".screen");
    if (!screen) return;
    var svg = screen.querySelector("svg.board");
    var toolbar = document.querySelector(".mock-toolbar");
    var current = readHash();

    function apply() {
      document.documentElement.dataset.theme = current.theme;
      screen.dataset.state = current.state;
      if (svg) renderBoard(svg, current.state);
      fillHudGlyphs(screen);
      fitScreen(screen);
      if (svg) placeAnchors(screen, svg, current.state);
      writeHash(current);
    }

    if (toolbar) {
      toolbar.appendChild(
        buildGroup("État", STATES, current.state, function (state) {
          current.state = state;
          apply();
        }),
      );
      toolbar.appendChild(
        buildGroup("Thème", THEMES, current.theme, function (theme) {
          current.theme = theme;
          apply();
        }),
      );
    }

    window.addEventListener("resize", apply);
    document.fonts.ready.then(apply);
    apply();
  }

  window.Ath = { fillHudGlyphs: fillHudGlyphs };
  document.addEventListener("DOMContentLoaded", start);
})();
