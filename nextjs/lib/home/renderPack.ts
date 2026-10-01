/**
 * The Starter Pack as a 3D foil bag (01.10.2026, Ansage: „ein 3D-Modell, das
 * sich leicht bewegt"). A small WebGL renderer, no library: one grid per side,
 * bulged into a pillow — flat at the crimped seals top and bottom, rounded
 * between the side folds — printed with the pack art on the front and plain
 * foil on the back. The colours stay those of the picture; light only
 * shades the bulge a little where the foil turns away. Earlier passes with
 * reflections, crinkles and highlights read as glow and glitter.
 */

export interface PackPose {
  /** radians */
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  /** world units, up is positive */
  lift: number;
}

export interface PackRenderer {
  /** Canvas size in device pixels, and how wide the pack should appear in
   *  those pixels when facing the camera. */
  resize(width: number, height: number, packWidth: number): void;
  draw(pose: PackPose): void;
  dispose(): void;
}

const COLS = 48;
const ROWS = 74;
const FOV = (30 * Math.PI) / 180;
const DISTANCE = 3.2;
/** Pack art 1008 × 1560: width 1, height in proportion. */
const HEIGHT = 1560 / 1008;
const BULGE = 0.075;

const VERTEX = `
attribute vec2 aUv;
attribute float aSide;
uniform mat4 uProj;
uniform mat4 uModel;
varying vec2 vUv;
varying vec3 vNormal;
varying float vSide;

float thick(vec2 uv) {
  float across = pow(max(sin(3.14159 * uv.x), 0.0), 0.55);
  float along = smoothstep(0.03, 0.16, uv.y) * smoothstep(0.03, 0.16, 1.0 - uv.y);
  return ${BULGE.toFixed(3)} * across * along;
}
vec3 surface(vec2 uv, float side) {
  return vec3(uv.x - 0.5, (0.5 - uv.y) * ${HEIGHT.toFixed(4)}, side * thick(uv));
}
void main() {
  float e = 0.004;
  vec3 du = surface(aUv + vec2(e, 0.0), aSide) - surface(aUv - vec2(e, 0.0), aSide);
  vec3 dv = surface(aUv + vec2(0.0, e), aSide) - surface(aUv - vec2(0.0, e), aSide);
  // Front faces the camera (+z), back faces away.
  vec3 normal = -normalize(cross(du, dv)) * aSide;
  vec4 world = uModel * vec4(surface(aUv, aSide), 1.0);
  vNormal = mat3(uModel) * normal;
  vUv = aUv;
  vSide = aSide;
  gl_Position = uProj * world;
}`;

const FRAGMENT = `
precision mediump float;
uniform sampler2D uArt;
varying vec2 vUv;
varying vec3 vNormal;
varying float vSide;

void main() {
  vec4 art = texture2D(uArt, vUv);
  if (art.a < 0.5) discard;
  // The pack keeps the colours of its picture (Ansage 01.10.2026: „bei der
  // Farbe bleiben, die das Starter Pack hat", white foil, no glitter) — the
  // light only lets the bulge read: a little darker where the foil turns
  // away, never brighter than the print.
  vec3 base = vSide > 0.0 ? art.rgb : vec3(0.86, 0.86, 0.85);
  vec3 n = normalize(vNormal);
  float facing = max(dot(n, normalize(vec3(-0.3, 0.45, 1.0))), 0.0);
  gl_FragColor = vec4(base * (0.86 + 0.14 * facing), 1.0);
}`;

type Mat4 = Float32Array;

function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = sum;
    }
  return out;
}

function perspective(aspect: number): Mat4 {
  const f = 1 / Math.tan(FOV / 2);
  const near = 0.1;
  const far = 20;
  // prettier-ignore
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) / (near - far), -1,
    0, 0, (2 * far * near) / (near - far), 0,
  ]);
}

/** Translate · rotateY · rotateX · rotateZ · scale, column-major. */
export function packModel(pose: PackPose, scale: number): Mat4 {
  const [sx, cx] = [Math.sin(pose.rotateX), Math.cos(pose.rotateX)];
  const [sy, cy] = [Math.sin(pose.rotateY), Math.cos(pose.rotateY)];
  const [sz, cz] = [Math.sin(pose.rotateZ), Math.cos(pose.rotateZ)];
  // prettier-ignore
  const ry = new Float32Array([cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1]);
  // prettier-ignore
  const rx = new Float32Array([1, 0, 0, 0, 0, cx, sx, 0, 0, -sx, cx, 0, 0, 0, 0, 1]);
  // prettier-ignore
  const rz = new Float32Array([cz, sz, 0, 0, -sz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  // prettier-ignore
  const ts = new Float32Array([
    scale, 0, 0, 0,
    0, scale, 0, 0,
    0, 0, scale, 0,
    0, pose.lift, -DISTANCE, 1,
  ]);
  return multiply(multiply(ts, ry), multiply(rx, rz));
}

/** How wide one world unit appears, in pixels, at the pack's distance. */
function pixelsPerUnit(canvasHeight: number): number {
  return canvasHeight / (2 * DISTANCE * Math.tan(FOV / 2));
}

export function renderPack(canvas: HTMLCanvasElement, art: TexImageSource): PackRenderer | null {
  const gl = canvas.getContext('webgl', {
    alpha: true,
    antialias: true,
    premultipliedAlpha: true,
    powerPreference: 'low-power',
  });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram()!;
  const uvBuffer = gl.createBuffer()!;
  const sideBuffer = gl.createBuffer()!;
  const indexBuffer = gl.createBuffer()!;
  const texture = gl.createTexture()!;
  const dispose = () => {
    gl.deleteBuffer(uvBuffer);
    gl.deleteBuffer(sideBuffer);
    gl.deleteBuffer(indexBuffer);
    gl.deleteTexture(texture);
    gl.deleteProgram(program);
    shaders.forEach((s) => gl.deleteShader(s));
  };
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type)!;
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('pack shader');
    return shader;
  };
  try {
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('pack program');
    gl.useProgram(program);

    // Two grids, front (+1) and back (−1), sharing the same uv layout.
    const perSide = (COLS + 1) * (ROWS + 1);
    const uvs = new Float32Array(perSide * 2 * 2);
    const sides = new Float32Array(perSide * 2);
    const indices: number[] = [];
    for (let side = 0; side < 2; side++) {
      for (let y = 0; y <= ROWS; y++)
        for (let x = 0; x <= COLS; x++) {
          const i = side * perSide + y * (COLS + 1) + x;
          uvs[i * 2] = x / COLS;
          uvs[i * 2 + 1] = y / ROWS;
          sides[i] = side === 0 ? 1 : -1;
          if (x < COLS && y < ROWS) {
            indices.push(i, i + 1, i + COLS + 1, i + 1, i + COLS + 2, i + COLS + 1);
          }
        }
    }
    const bind = (buffer: WebGLBuffer, data: Float32Array, name: string, size: number) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
    };
    bind(uvBuffer, uvs, 'aUv', 2);
    bind(sideBuffer, sides, 'aSide', 1);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, art);

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    const projLocation = gl.getUniformLocation(program, 'uProj');
    const modelLocation = gl.getUniformLocation(program, 'uModel');
    let scale = 1;

    return {
      resize(width, height, packWidth) {
        canvas.width = Math.max(1, Math.round(width));
        canvas.height = Math.max(1, Math.round(height));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniformMatrix4fv(projLocation, false, perspective(canvas.width / canvas.height));
        scale = packWidth / pixelsPerUnit(canvas.height);
      },
      draw(pose) {
        gl.uniformMatrix4fv(modelLocation, false, packModel(pose, scale));
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      },
      dispose,
    };
  } catch {
    dispose();
    return null;
  }
}

/** The idle sway at `seconds`: a slow turn left and right, a little nod and
 *  roll, floating up and down — never so far that the back shows. */
export function idlePose(seconds: number): PackPose {
  return {
    rotateY: 0.3 * Math.sin(seconds * 0.55),
    rotateX: 0.09 * Math.sin(seconds * 0.37 + 1.3),
    rotateZ: 0.035 * Math.sin(seconds * 0.29 + 0.7),
    lift: 0.035 * Math.sin(seconds * 0.8),
  };
}
