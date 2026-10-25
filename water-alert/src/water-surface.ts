import { createRippleField } from './water-ripples'

export interface WaterSurface {
  resize(width: number, height: number): void
  drop(x: number, y: number, strength: number): void
  frame(now: number): void
  dispose(): void
}
const vertex = `
attribute vec2 position;
varying vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`
// Analytical wave packets avoid the quantization noise of packed-height buffers.
// Positions and radii use CSS pixels: circular rings travel at the same speed on
// phones and desktops. Nothing in the DOM is sampled or displaced.
const display = `
precision highp float;
varying vec2 uv;
uniform vec2 cssSize;
uniform vec4 waves[8];
void main(){
  float wave=0.;
  for(int i=0;i<8;i++){
    float distanceFromDrop=length((uv-waves[i].xy)*cssSize);
    float q=distanceFromDrop-waves[i].z;
    // A narrow crest and trailing trough, not a filled, cloudy disc.
    float packet=cos(q*.22)*exp(-q*q/260.);
    wave+=packet*waves[i].w;
  }
  wave=clamp(wave,-1.,1.);
  float y=clamp(uv.y+wave*3./cssSize.y,0.,1.);
  vec3 color=mix(vec3(1.),vec3(240.,247.,255.)/255.,y);
  color-=vec3(.085,.06,.045)*wave;
  gl_FragColor=vec4(clamp(color,0.,1.),1.);
}`

export function createWaterSurface(canvas: HTMLCanvasElement): WaterSurface | null {
  let gl: WebGLRenderingContext | null
  try { gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false }) }
  catch { return null }
  if (!gl) return null
  const gpu = gl
  const shaders: WebGLShader[] = []
  let program: WebGLProgram | null = null
  let quad: WebGLBuffer | null = null
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    if (quad) gpu.deleteBuffer(quad)
    if (program) gpu.deleteProgram(program)
    shaders.forEach(shader => gpu.deleteShader(shader))
  }
  try {
    const compile = (kind: number, source: string) => {
      const shader = gpu.createShader(kind)!
      shaders.push(shader)
      gpu.shaderSource(shader, source)
      gpu.compileShader(shader)
      if (!gpu.getShaderParameter(shader, gpu.COMPILE_STATUS)) throw new Error('Water shader unavailable')
      return shader
    }
    program = gpu.createProgram()!
    gpu.attachShader(program, compile(gpu.VERTEX_SHADER, vertex))
    gpu.attachShader(program, compile(gpu.FRAGMENT_SHADER, display))
    gpu.linkProgram(program)
    if (!gpu.getProgramParameter(program, gpu.LINK_STATUS)) throw new Error('Water program unavailable')
    gpu.useProgram(program)
    const size = gpu.getUniformLocation(program, 'cssSize')
    const waves = gpu.getUniformLocation(program, 'waves[0]')
    const position = gpu.getAttribLocation(program, 'position')
    quad = gpu.createBuffer()!
    gpu.bindBuffer(gpu.ARRAY_BUFFER, quad)
    gpu.bufferData(gpu.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gpu.STATIC_DRAW)
    gpu.enableVertexAttribArray(position)
    gpu.vertexAttribPointer(position, 2, gpu.FLOAT, false, 0, 0)
    const field = createRippleField()
    let previousFrame: number | undefined
    const resize = (w: number, h: number) => {
      const width = Math.max(1, w), height = Math.max(1, h)
      const scale = Math.min(1, 1280 / width, 960 / height)
      canvas.width = Math.max(1, Math.round(width * scale))
      canvas.height = Math.max(1, Math.round(height * scale))
      gpu.useProgram(program)
      gpu.uniform2f(size, width, height)
      gpu.viewport(0, 0, canvas.width, canvas.height)
    }
    const frame = (now: number) => {
      if (disposed || (previousFrame !== undefined && now - previousFrame < 32)) return
      // Resume gently after a hidden tab instead of jumping every wave forward.
      const elapsed = previousFrame === undefined ? 0 : Math.min(50, now - previousFrame)
      previousFrame = now
      gpu.useProgram(program)
      gpu.uniform4fv(waves, field.advance(elapsed))
      gpu.drawArrays(gpu.TRIANGLES, 0, 6)
    }
    resize(canvas.clientWidth || 1, canvas.clientHeight || 1)
    return { resize, frame, dispose, drop: field.drop }
  } catch {
    dispose()
    return null
  }
}
