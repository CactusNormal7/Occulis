import type { IsoProjection } from "./paper.js";

/**
 * Le dessin de l'inversion « papier » : un shader WebGL sur un canevas posé par-dessus la
 * zone. Il ne reçoit à chaque image que quelques nombres (le front, la part dissoute) — rien
 * n'est recalculé par case en JavaScript, et rien ne touche la mise en page.
 *
 * C'est aussi la forme que prendrait l'effet sur le plateau : le même fragment, en filtre
 * PixiJS, lisant la même texture de zone.
 */

const VERTEX = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;
uniform vec2 uSize;
uniform float uDpr;
uniform int uMode;
uniform vec2 uOrigin;
uniform float uFront;
uniform float uDissolve;
uniform float uGrid;
uniform float uDot;
uniform vec3 uPaper;
uniform vec3 uDotColor;
uniform float uInvert;
uniform sampler2D uZone;
uniform vec2 uZoneSize;
uniform vec4 uIso;

// La matrice de Bayer 4 x 4 sans opérations binaires (GLSL ES 1.0) : l'ordre dans lequel
// une trame s'éteint, celui du voile tramé.
float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2.0 + a.y * a.y * 0.75); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y * uDpr - gl_FragCoord.y) / uDpr;
  float inside = 0.0;
  float edge = 0.0;
  vec2 cell;
  bool dot;

  if (uMode == 0) {
    // Un cercle, quantifié à la case du quadrillage : le front avance case par case, comme
    // la ligne de vue.
    cell = floor(p / uGrid);
    float d = length((cell + 0.5) * uGrid - uOrigin);
    inside = step(d, uFront);
    edge = step(uFront, d) * step(d, uFront + uGrid * 1.5);
    vec2 m = mod(p, uGrid);
    dot = m.x < uDot && m.y < uDot;
  } else {
    // Une zone du plateau : chaque case éclot en losange depuis son centre, dans l'ordre de
    // sa distance au départ, mesurée dans la zone.
    vec2 q = p - uIso.xy;
    float u = q.x / (uIso.z * 0.5);
    float v = q.y / (uIso.w * 0.5);
    vec2 t = vec2(u + v, v - u) * 0.5;
    vec2 ti = floor(t + 0.5);
    if (ti.x < 0.0 || ti.y < 0.0 || ti.x >= uZoneSize.x || ti.y >= uZoneSize.y) discard;
    vec4 z = texture2D(uZone, (ti + 0.5) / uZoneSize);
    if (z.r < 0.5) discard;
    vec2 local = t - ti;
    float f = clamp(uFront - z.g * 255.0, 0.0, 1.0);
    inside = step(abs(local.x) + abs(local.y), f);
    // Le quadrillage reste celui de l'écran, comme une feuille posée sur le plateau : aligné
    // sur les axes isométriques, ses points tombent entre deux pixels et le pas vertical
    // n'est plus que la moitié de l'horizontal — une trame serrée et irrégulière.
    cell = floor(p / uGrid);
    vec2 m = mod(p, uGrid);
    dot = m.x < uDot && m.y < uDot;
  }

  if (uDissolve > 0.0 && bayer4(cell) < uDissolve) inside = 0.0;

  if (inside < 0.5) {
    // Au-delà du front, une bande tramée un pixel sur deux : le bord du papier est un voile,
    // pas une arête.
    float checker = mod(floor(p.x) + floor(p.y), 2.0);
    if (edge > 0.5 && checker < 0.5 && uDissolve == 0.0) gl_FragColor = vec4(uPaper, 1.0);
    else discard;
    return;
  }
  if (dot) {
    // En inversion, le point laisse voir le fond d'origine ; posé, il prend la couleur du vide.
    if (uInvert > 0.5) discard;
    gl_FragColor = vec4(uDotColor, 1.0);
    return;
  }
  gl_FragColor = vec4(uPaper, 1.0);
}
`;

export interface PaperDraw {
  readonly mode: "circle" | "zone";
  readonly origin: { readonly x: number; readonly y: number };
  readonly front: number;
  readonly dissolve: number;
  readonly grid: number;
  readonly dot: number;
  readonly paper: readonly [number, number, number];
  readonly dotColor: readonly [number, number, number];
  readonly invert: boolean;
  readonly iso?: IsoProjection | undefined;
  readonly zoneSize?: readonly [number, number] | undefined;
}

export interface PaperRenderer {
  resize(width: number, height: number, dpr: number): void;
  setZone(texels: Uint8Array, width: number, height: number): void;
  draw(frame: PaperDraw): void;
  clear(): void;
  dispose(): void;
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (shader === null) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("[paper] shader:", gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

/**
 * Le moteur de dessin sur `canvas`, ou `null` sans WebGL : l'effet est décoratif, son
 * absence ne retire rien à la page.
 */
export function createPaperRenderer(canvas: HTMLCanvasElement): PaperRenderer | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
  });
  if (gl === null) return null;
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (vertex === null || fragment === null || program === null) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  // Un seul triangle qui déborde l'écran : pas de diagonale, pas de couture.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

  const at = (name: string) => gl.getUniformLocation(program, name);
  const uniforms = {
    size: at("uSize"),
    dpr: at("uDpr"),
    mode: at("uMode"),
    origin: at("uOrigin"),
    front: at("uFront"),
    dissolve: at("uDissolve"),
    grid: at("uGrid"),
    dot: at("uDot"),
    paper: at("uPaper"),
    dotColor: at("uDotColor"),
    invert: at("uInvert"),
    zone: at("uZone"),
    zoneSize: at("uZoneSize"),
    iso: at("uIso"),
  };
  gl.uniform1i(uniforms.zone, 0);
  let size = { width: 0, height: 0, dpr: 1 };

  return {
    resize(width, height, dpr) {
      size = { width, height, dpr };
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    },
    setZone(texels, width, height) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, texels);
    },
    draw(frame) {
      gl.uniform2f(uniforms.size, size.width, size.height);
      gl.uniform1f(uniforms.dpr, size.dpr);
      gl.uniform1i(uniforms.mode, frame.mode === "circle" ? 0 : 1);
      gl.uniform2f(uniforms.origin, frame.origin.x, frame.origin.y);
      gl.uniform1f(uniforms.front, frame.front);
      gl.uniform1f(uniforms.dissolve, frame.dissolve);
      gl.uniform1f(uniforms.grid, frame.grid);
      gl.uniform1f(uniforms.dot, frame.dot);
      gl.uniform3f(uniforms.paper, ...frame.paper);
      gl.uniform3f(uniforms.dotColor, ...frame.dotColor);
      gl.uniform1f(uniforms.invert, frame.invert ? 1 : 0);
      gl.uniform2f(uniforms.zoneSize, frame.zoneSize?.[0] ?? 1, frame.zoneSize?.[1] ?? 1);
      const iso = frame.iso;
      gl.uniform4f(
        uniforms.iso,
        iso?.originX ?? 0,
        iso?.originY ?? 0,
        iso?.tileWidth ?? 1,
        iso?.tileHeight ?? 1,
      );
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    clear() {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    },
    dispose() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    },
  };
}
