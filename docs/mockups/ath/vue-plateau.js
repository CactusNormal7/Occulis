/*
 * La maquette de la vue de dessus (vue-plateau.html) : la bascule entre la vue
 * isométrique et la vue en plan, par le bouton de la caméra ou la barre d'espace.
 */
// La bascule de vue : une inclinaison de 0 (isométrique) à 1 (de dessus), animée.
(function () {
  "use strict";

  var DURATION_MS = 480;
  var toggle = document.querySelector("[data-view-toggle]");
  var moves = document.querySelectorAll("[data-camera-move]");
  var chip = document.querySelector(".view-chip");
  var topDown = false;
  var tilt = 0;
  var frame = 0;
  var chipTimer = 0;

  function easeInOut(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function announce(text) {
    chip.textContent = text;
    chip.setAttribute("data-shown", "");
    clearTimeout(chipTimer);
    chipTimer = setTimeout(function () {
      chip.removeAttribute("data-shown");
    }, 1200);
  }

  function switchView() {
    topDown = !topDown;
    toggle.setAttribute("aria-pressed", String(topDown));
    toggle.setAttribute("aria-label", topDown ? "Vue isométrique" : "Vue de dessus");
    moves.forEach(function (button) {
      button.disabled = topDown;
    });
    announce(topDown ? "Vue de dessus" : "Vue isométrique");

    var from = tilt;
    var to = topDown ? 1 : 0;
    var start = performance.now();
    cancelAnimationFrame(frame);
    var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    function step(now) {
      var t = reduced ? 1 : Math.min(1, (now - start) / DURATION_MS);
      tilt = from + (to - from) * easeInOut(t);
      window.Ath.setTilt(tilt);
      if (t < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
  }

  toggle.addEventListener("click", switchView);
  window.addEventListener("keydown", function (event) {
    if (event.code !== "Space" || event.repeat) return;
    event.preventDefault();
    switchView();
  });
})();
