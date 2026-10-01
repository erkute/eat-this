import { lookPose } from './remyLook';

/** Welches Gesicht gezeichnet wird: neutral, Mund offen (redet), lacht. */
export type RemyFace = 0 | 1 | 2;

/** Die drei Bilder liegen nicht deckungsgleich (gemessen an den Gläsern im
 *  1024er-Bild): der offene Mund 9px tiefer, das Lachen 11px höher. Beim
 *  Abtasten verschoben, damit der Kopf beim Wechsel nicht springt. */
const FACE_SHIFT: Record<RemyFace, number> = { 0: 0, 1: 9 / 1024, 2: -11 / 1024 };

/**
 * Remys Büste als Gitter-Mesh (WebGL), verformt nach seinem Blick
 * (lib/home/remyLook.ts). Dasselbe Verfahren wie die Beine im Vorhang
 * (renderRemy.ts): ein zusammenhängendes Texturgitter, jedes Pixel hat
 * genau eine Quelle — die Haut dehnt sich, nichts reisst auf.
 */
export function renderRemyLook(
  canvas: HTMLCanvasElement,
  faces: [HTMLImageElement, HTMLImageElement, HTMLImageElement]
) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  const shader = (type: number, code: string) => {
    const result = gl.createShader(type)!;
    shaders.push(result);
    gl.shaderSource(result, code);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error('Remy look shader');
    return result;
  };
  const program = gl.createProgram()!;
  const buffer = gl.createBuffer()!;
  const indices = gl.createBuffer()!;
  const textures = faces.map(() => gl.createTexture()!);
  const dispose = () => {
    gl.deleteBuffer(buffer);
    gl.deleteBuffer(indices);
    textures.forEach((t) => gl.deleteTexture(t));
    gl.deleteProgram(program);
    shaders.forEach((s) => gl.deleteShader(s));
  };
  try {
    gl.attachShader(
      program,
      shader(
        gl.VERTEX_SHADER,
        `attribute vec4 point;
        varying vec2 uv;
        void main() {
          gl_Position = vec4(point.x / 1024.0 * 2.0 - 1.0, 1.0 - point.y / 1024.0 * 2.0, 0.0, 1.0);
          uv = point.zw;
        }`
      )
    );
    gl.attachShader(
      program,
      shader(
        gl.FRAGMENT_SHADER,
        `precision mediump float;
        varying vec2 uv;
        uniform sampler2D drawing;
        uniform float shift;
        void main() { gl_FragColor = texture2D(drawing, uv + vec2(0.0, shift)); }`
      )
    );
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Remy look link');
    gl.useProgram(program);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    faces.forEach((image, i) => {
      gl.bindTexture(gl.TEXTURE_2D, textures[i]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    });
    const shiftAt = gl.getUniformLocation(program, 'shift');

    // Dicht nur, wo sich etwas bewegt: das Gesicht liegt in der oberen
    // Bildhälfte, die Schultern verformen sich nicht.
    const cols = 48;
    const rows = 48;
    const vertices = new Float32Array((cols + 1) * (rows + 1) * 4);
    const rest: Array<{ x: number; y: number }> = [];
    const triangles: number[] = [];
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= cols; x++) {
        const i = y * (cols + 1) + x;
        rest.push({ x: (x / cols) * 1024, y: (y / rows) * 1024 });
        vertices[i * 4 + 2] = x / cols;
        vertices[i * 4 + 3] = y / rows;
        if (x < cols && y < rows) {
          triangles.push(i, i + 1, i + cols + 1, i + 1, i + cols + 2, i + cols + 1);
        }
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices.byteLength, gl.DYNAMIC_DRAW);
    const location = gl.getAttribLocation(program, 'point');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 4, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(triangles), gl.STATIC_DRAW);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    return {
      draw(lx: number, ly: number, face: RemyFace) {
        const pose = lookPose(lx, ly);
        for (let i = 0; i < rest.length; i++) {
          const p = pose(rest[i]);
          vertices[i * 4] = p.x;
          vertices[i * 4 + 1] = p.y;
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindTexture(gl.TEXTURE_2D, textures[face]);
        gl.uniform1f(shiftAt, FACE_SHIFT[face]);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
        gl.drawElements(gl.TRIANGLES, triangles.length, gl.UNSIGNED_SHORT, 0);
      },
      dispose,
    };
  } catch {
    dispose();
    return null;
  }
}
