<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

interface Props {
  grain?: number;
  vignette?: number;
  noiseFrequency?: number;
  animationSpeed?: number;
  colors?: string[];
  onRender?: () => void;
}

const props = withDefaults(defineProps<Props>(), {
  grain: 0.04,
  vignette: 0.5,
  noiseFrequency: 0.001,
  animationSpeed: 0.0001,
  colors: () => [
    'hsl(60, 5%, 97%)',
    'hsl(60, 5%, 95%)',
    'hsl(60, 4%, 93%)',
  ],
  onRender: undefined,
});

const canvasRef = ref<HTMLCanvasElement | null>(null);
let gl: WebGLRenderingContext | null = null;
let program: WebGLProgram | null = null;
let animationFrameId: number = 0;
let startTime: number = 0;

// Uniform locations
let uTimeLocation: WebGLUniformLocation | null = null;
let uResolutionLocation: WebGLUniformLocation | null = null;
let uColorsLocation: WebGLUniformLocation | null = null;
let uColorCountLocation: WebGLUniformLocation | null = null;
let uNoiseFreqLocation: WebGLUniformLocation | null = null;
let uGrainLocation: WebGLUniformLocation | null = null;
let uVignetteLocation: WebGLUniformLocation | null = null;

// Vertex shader - simple full-screen quad
const vertexShaderSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  
  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// Fragment shader with simplex noise
// Simplex noise implementation based on Ashima Arts / Ian McEwan
const fragmentShaderSource = `
  precision highp float;
  
  varying vec2 v_uv;
  
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform vec3 u_colors[8];
  uniform int u_colorCount;
  uniform float u_noiseFreq;
  uniform float u_grain;
  uniform float u_vignette;
  
  // Simplex 3D Noise by Ian McEwan, Ashima Arts
  vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  // Better hash for grain - less patterned
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  
  void main() {
    vec2 uv = v_uv;
    vec2 pos = uv * u_resolution;
    
    float t = u_time;
    float freq = u_noiseFreq;
    
    // Multiple layers of noise
    float n1 = snoise(vec3(pos * freq, t));
    float n2 = snoise(vec3(pos * freq * 2.0 + 100.0, t * 1.3));
    float n3 = snoise(vec3(pos * freq * 0.5 + 200.0, t * 0.7));
    
    // Combine noise layers
    float combinedNoise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    float normalizedNoise = (combinedNoise + 1.0) / 2.0;
    
    // Map noise to color palette
    float colorCount = float(u_colorCount);
    float colorIndex = normalizedNoise * (colorCount - 1.0);
    float colorLowF = floor(colorIndex);
    float colorHighF = min(colorLowF + 1.0, colorCount - 1.0);
    float colorMix = fract(colorIndex);
    
    int colorLow = int(colorLowF);
    int colorHigh = int(colorHighF);
    
    // GLSL doesn't allow dynamic indexing in some versions, so we use a workaround
    vec3 c1 = u_colors[0];
    vec3 c2 = u_colors[0];
    
    for (int i = 0; i < 8; i++) {
      if (i == colorLow) c1 = u_colors[i];
      if (i == colorHigh) c2 = u_colors[i];
    }
    
    vec3 color = mix(c1, c2, colorMix);
    
    // Vignette
    vec2 center = vec2(0.5);
    float dist = distance(uv, center) / 0.7071; // normalize to corners
    float vignetteDarken = 1.0 - (dist * dist * u_vignette * 0.4);
    color *= vignetteDarken;
    
    // Film grain - use screen pixel coordinates for consistent grain size
    if (u_grain > 0.0) {
      // Use pixel coordinates + time for variation
      vec2 grainCoord = gl_FragCoord.xy + vec2(t * 1000.0, t * 573.0);
      float grainValue = (hash(grainCoord) - 0.5) * u_grain;
      color += grainValue;
    }
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

// Parse HSL to RGB (normalized 0-1)
const parseHSL = (hsl: string) => {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return { r: 0.9, g: 0.9, b: 0.9 };
  
  const h = Number(match[1]);
  let s = Number(match[2]) / 100;
  let l = Number(match[3]) / 100;
  
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  
  return { r: f(0), g: f(8), b: f(4) };
};

const createShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  
  return shader;
};

const createProgram = (gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram | null => {
  const program = gl.createProgram();
  if (!program) return null;
  
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  
  return program;
};

const updateColors = () => {
  if (!gl || !program || !uColorsLocation || !uColorCountLocation) return;
  
  gl.useProgram(program);
  
  const colorData: number[] = [];
  for (let i = 0; i < 8; i++) {
    if (i < props.colors.length) {
      const { r, g, b } = parseHSL(props.colors[i]);
      colorData.push(r, g, b);
    } else {
      colorData.push(0.9, 0.9, 0.9);
    }
  }
  
  gl.uniform3fv(uColorsLocation, colorData);
  gl.uniform1i(uColorCountLocation, props.colors.length);
};

const updateSize = () => {
  const canvas = canvasRef.value;
  if (!canvas || !gl || !uResolutionLocation) return;
  
  const width = window.innerWidth;
  const height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2x for performance
  
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(program);
  gl.uniform2f(uResolutionLocation, canvas.width, canvas.height);
};

const render = (time: number) => {
  if (!gl || !program) return;
  
  const elapsed = (time - startTime) * props.animationSpeed;
  
  gl.useProgram(program);
  gl.uniform1f(uTimeLocation!, elapsed);
  gl.uniform1f(uNoiseFreqLocation!, props.noiseFrequency);
  gl.uniform1f(uGrainLocation!, props.grain);
  gl.uniform1f(uVignetteLocation!, props.vignette);
  
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Notify listeners that a frame was rendered (for canvas copying)
  if (props.onRender) {
    props.onRender();
  }

  if (props.animationSpeed > 0) {
    animationFrameId = requestAnimationFrame(render);
  }
};

const initGL = () => {
  const canvas = canvasRef.value;
  if (!canvas) return false;
  
  gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true,  // Required for canvas copying via drawImage
  });
  
  if (!gl) {
    console.error('WebGL not supported');
    return false;
  }
  
  // Create shaders
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  
  if (!vertexShader || !fragmentShader) return false;
  
  // Create program
  program = createProgram(gl, vertexShader, fragmentShader);
  if (!program) return false;
  
  // Create full-screen quad
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
  ]), gl.STATIC_DRAW);
  
  const positionLocation = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  
  // Get uniform locations
  uTimeLocation = gl.getUniformLocation(program, 'u_time');
  uResolutionLocation = gl.getUniformLocation(program, 'u_resolution');
  uColorsLocation = gl.getUniformLocation(program, 'u_colors');
  uColorCountLocation = gl.getUniformLocation(program, 'u_colorCount');
  uNoiseFreqLocation = gl.getUniformLocation(program, 'u_noiseFreq');
  uGrainLocation = gl.getUniformLocation(program, 'u_grain');
  uVignetteLocation = gl.getUniformLocation(program, 'u_vignette');
  
  return true;
};

watch(() => props.colors, () => {
  updateColors();
  if (props.animationSpeed === 0) {
    render(startTime);
  }
}, { deep: true });

// Expose canvas for external copying
defineExpose({ canvas: canvasRef });

onMounted(() => {
  if (!initGL()) return;
  
  startTime = performance.now();
  updateSize();
  updateColors();
  
  if (props.animationSpeed > 0) {
    animationFrameId = requestAnimationFrame(render);
  } else {
    render(startTime);
  }
  
  const handleResize = () => {
    updateSize();
    if (props.animationSpeed === 0) {
      render(startTime);
    }
  };
  
  window.addEventListener('resize', handleResize);
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="noise-background-gl"
    aria-hidden="true"
  />
</template>

<style scoped>
.noise-background-gl {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1;
  pointer-events: none;
}
</style>
