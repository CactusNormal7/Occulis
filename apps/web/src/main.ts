import { Application } from "pixi.js";
import { type PlayerId, emptyKnowledge, observe, viewFor } from "@occulis/core";
import { type IsoProjection, lerpAngle } from "./iso.js";
import { SceneRenderer } from "./renderer.js";
import { demoGame } from "./scenario.js";

const QUARTER_TURN = Math.PI / 2;

async function main(): Promise<void> {
  const host = document.getElementById("app");
  if (host === null) throw new Error("élément #app introuvable");

  const app = new Application();
  await app.init({ background: "#0d0f12", resizeTo: window, antialias: true });
  host.appendChild(app.canvas);

  const state = demoGame();
  const renderer = new SceneRenderer();
  app.stage.addChild(renderer.root);

  let viewer: PlayerId = "A";
  let knowledge = observe(emptyKnowledge(viewer), state);

  let targetRotation = 0;
  const projection: IsoProjection = {
    tileWidth: 72,
    tileHeight: 36,
    heightUnit: 22,
    rotation: 0,
    pivot: { x: 4.5, y: 3.5 },
  };
  let current = projection;

  const recentre = (): void => {
    renderer.root.x = app.screen.width / 2;
    renderer.root.y = app.screen.height / 2;
  };
  recentre();
  app.renderer.on("resize", recentre);

  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") targetRotation -= QUARTER_TURN;
    else if (event.key === "ArrowRight") targetRotation += QUARTER_TURN;
    else if (event.key === " ") {
      // Bascule de point de vue : chaque joueur ne voit que sa propre information.
      viewer = viewer === "A" ? "B" : "A";
      knowledge = observe(emptyKnowledge(viewer), state);
    } else return;
    event.preventDefault();
  });

  app.ticker.add((ticker) => {
    const t = Math.min(1, ticker.deltaMS / 120);
    current = { ...current, rotation: lerpAngle(current.rotation, targetRotation, t) };
    renderer.render({ board: state.board, view: viewFor(state, knowledge), projection: current });
  });
}

void main();
