<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { createNoise3D } from 'simplex-noise';

interface Props {
  grain?: number
  vignette?: number
  noiseFrequency?: number
  animationSpeed?: number
  resolutionScale?: number
  colors?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  grain: 0.051,
  vignette: 0.661,
  noiseFrequency: 0.0008,
  // animationSpeed: 0.00008,
  animationSpeed: 0.008,
  resolutionScale: 0.15,
  colors: () => [
    'hsl(42, 60%, 74%)',
    'hsl(45, 65%, 78%)',
    'hsl(38, 55%, 70%)',
    'hsl(48, 58%, 76%)',
    'hsl(40, 52%, 72%)',
  ],
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationFrameId: number = 0

// Parse HSL string to components
const parseHSL = (hsl: string) => {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return { h: 0, s: 0, l: 90 };
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) }
}

// Convert HSL to RGB
const hslToRgb = (h: number, s: number, l: number) => {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
  }
  return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255 }
}

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) return

  const noise3D = createNoise3D()
  const noise3D2 = createNoise3D()
  const noise3D3 = createNoise3D()

  const parsedColors = props.colors.map((c) => {
    const { h, s, l } = parseHSL(c)
    console.log('c', c);
    console.log('h', h);
    console.log('s', s);
    console.log('l', l);
    return hslToRgb(h, s, l)
  });

  console.log('parsedColors', parsedColors);

  let width = 0
  let height = 0
  let canvasWidth = 0
  let canvasHeight = 0
  let vignetteMap: Float32Array

  const updateSize = () => {
    // Get size from parent SVG/foreignObject
    const parent = canvas.parentElement
    if (!parent) return

    const rect = parent.getBoundingClientRect()
    width = rect.width || 600
    height = rect.height || 200

    canvasWidth = Math.ceil(width * props.resolutionScale)
    canvasHeight = Math.ceil(height * props.resolutionScale)
    canvas.width = canvasWidth
    canvas.height = canvasHeight
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`

    // Recompute vignette map
    vignetteMap = new Float32Array(canvasWidth * canvasHeight)
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY)

    for (let y = 0; y < canvasHeight; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        const dx = x - centerX
        const dy = y - centerY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const vignetteAmount = (dist / maxDist) ** 2 * props.vignette
        vignetteMap[y * canvasWidth + x] = 1 - vignetteAmount * 0.4
      }
    }
  }

  updateSize()

  const isAnimating = props.animationSpeed > 0

  const render = (time: number) => {
    if (!vignetteMap) return

    const t = time * props.animationSpeed
    const imageData = ctx.createImageData(canvasWidth, canvasHeight)
    const data = imageData.data

    const freq = props.noiseFrequency / props.resolutionScale

    for (let y = 0; y < canvasHeight; y++) {
      for (let x = 0; x < canvasWidth; x++) {
        const idx = (y * canvasWidth + x) * 4
        const mapIdx = y * canvasWidth + x

        const n1 = noise3D(x * freq, y * freq, t)
        const n2 = noise3D2(x * freq * 2 + 100, y * freq * 2 + 100, t * 1.3)
        const n3 = noise3D3(x * freq * 0.5 + 200, y * freq * 0.5 + 200, t * 0.7)

        const combinedNoise = n1 * 0.5 + n2 * 0.3 + n3 * 0.2
        const normalizedNoise = (combinedNoise + 1) / 2

        const colorIndex = normalizedNoise * (parsedColors.length - 1)
        const colorLow = Math.floor(colorIndex)
        const colorHigh = Math.min(colorLow + 1, parsedColors.length - 1)
        const colorMix = colorIndex - colorLow

        const c1 = parsedColors[colorLow]
        const c2 = parsedColors[colorHigh]

        let r = c1.r + (c2.r - c1.r) * colorMix
        let g = c1.g + (c2.g - c1.g) * colorMix
        let b = c1.b + (c2.b - c1.b) * colorMix

        const vignetteDarken = vignetteMap[mapIdx]
        r *= vignetteDarken
        g *= vignetteDarken
        b *= vignetteDarken

        if (props.grain > 0 && (!isAnimating || Math.random() > 0.7)) {
          const grainValue = (Math.random() - 0.5) * 255 * props.grain
          r += grainValue
          g += grainValue
          b += grainValue
        }

        data[idx] = Math.max(0, Math.min(255, r))
        data[idx + 1] = Math.max(0, Math.min(255, g))
        data[idx + 2] = Math.max(0, Math.min(255, b))
        data[idx + 3] = 255
      }
    }

    ctx.putImageData(imageData, 0, 0)

    if (isAnimating) {
      animationFrameId = requestAnimationFrame(render)
    }
  }

  if (isAnimating) {
    animationFrameId = requestAnimationFrame(render)
  } else {
    render(0)
  }

  const handleResize = () => {
    updateSize()
    if (!isAnimating) {
      render(0)
    }
  }

  window.addEventListener('resize', handleResize)

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }
  })
})
</script>

<template>
  <canvas
    ref="canvasRef"
    style="image-rendering: auto; display: block;"
    aria-hidden="true"
  />
</template>
