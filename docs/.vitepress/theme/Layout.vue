<script setup>
import DefaultTheme from 'vitepress/theme';
import { useData } from 'vitepress';
import { ref, onMounted, computed, watch, createApp, h } from 'vue';
import NoiseBackground from './NoiseBackground.vue';
import FooterHeart from './FooterHeart.vue';

const { frontmatter } = useData();

// Check if we're on the home page with a hero
const isHomePage = computed(() => frontmatter.value.layout === 'home');

// Add .is-home class to <html> for root-level CSS variable overrides
watch(isHomePage, (isHome) => {
  document.documentElement.classList.toggle('is-home', isHome);
}, { immediate: true });

// Dynamic sizing based on viewport
const svgWidth = ref(600);
const svgHeight = ref(120);
const fontSize = ref(72);

// Ref to NoiseBackground for canvas copying
const noiseRef = ref(null);

// Overlay canvases for header and sidebar
let headerCanvas = null;
let subHeaderCanvas = null;
let sidebarCanvas = null;
let headerCtx = null;
let subHeaderCtx = null;
let sidebarCtx = null;
let dpr = 1;

// Copy noise background to overlay canvases (called on each render frame)
const copyToOverlays = () => {
  const source = noiseRef.value?.canvas;
  if (!source) return;

  // Copy to header canvas
  if (headerCanvas && headerCtx) {
    const h = headerCanvas.height;
    const w = headerCanvas.width;
    // Copy from top of source canvas
    headerCtx.drawImage(
      source,
      0, 0, source.width, h,  // source: top portion
      0, 0, w, h              // dest: full header canvas
    );
  }

  // Copy to sub-header canvas
  if (subHeaderCanvas && subHeaderCtx) {
    const h = subHeaderCanvas.height;
    const w = subHeaderCanvas.width;
    // Copy from top of source canvas
    subHeaderCtx.drawImage(
      source,
      0, 0, source.width, h,  // source: top portion
      0, 0, w, h              // dest: full header canvas
    );
  }

  // Copy to sidebar canvas (if it exists and sidebar is visible)
  if (sidebarCanvas && sidebarCtx) {
    const rect = sidebarCanvas.getBoundingClientRect();
    const h = sidebarCanvas.height;
    const w = sidebarCanvas.width;
    // Source Y is based on sidebar's position relative to viewport
    const sourceY = rect.top * dpr;
    sidebarCtx.drawImage(
      source,
      0, Math.max(0, sourceY), w, h,  // source: sidebar region
      0, 0, w, h                      // dest: full sidebar canvas
    );
  }
};

// Color theme
const isDarkMode = ref(false);
const checkDarkMode = () => {
  isDarkMode.value = document.documentElement.classList.contains('dark');
}

onMounted(() => {
  const updateSize = () => {
    const vw = window.innerWidth
    if (vw < 640) {
      svgWidth.value = vw - 48
      fontSize.value = 48
      svgHeight.value = 80
    } else if (vw < 960) {
      svgWidth.value = 500
      fontSize.value = 64
      svgHeight.value = 100
    } else {
      svgWidth.value = 600
      fontSize.value = 72
      svgHeight.value = 120
    }
  }

  updateSize();
  window.addEventListener('resize', updateSize);

  // Set up overlay canvases for header and sidebar noise backgrounds
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Create and insert header overlay canvas
  const vpNav = document.querySelector('.VPNav');
  if (vpNav) {
    headerCanvas = document.createElement('canvas');
    headerCanvas.className = 'noise-overlay';
    headerCanvas.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      width: 100%;
      height: 100%;
    `;
    vpNav.insertBefore(headerCanvas, vpNav.firstChild);
    headerCtx = headerCanvas.getContext('2d');
  }

  // Create and insert sub-header overlay canvas

  // Create and insert sub-header overlay canvas
  const vpSubHeader = document.querySelector('.VPLocalNav');
  if (vpSubHeader) {
    subHeaderCanvas = document.createElement('canvas');
    subHeaderCanvas.className = 'noise-overlay';
    subHeaderCanvas.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      width: 100%;
      height: 100%;
    `;
    vpSubHeader.insertBefore(subHeaderCanvas, vpSubHeader.firstChild);
    subHeaderCtx = subHeaderCanvas.getContext('2d');
  }

  // Create and insert sidebar overlay canvas
  const vpSidebar = document.querySelector('.VPSidebar');
  if (vpSidebar) {
    sidebarCanvas = document.createElement('canvas');
    sidebarCanvas.className = 'noise-overlay';
    sidebarCanvas.style.cssText = `
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      width: 100%;
      height: 100%;
    `;
    vpSidebar.insertBefore(sidebarCanvas, vpSidebar.firstChild);
    sidebarCtx = sidebarCanvas.getContext('2d');
  }

  // Update overlay canvas sizes
  const updateOverlaySizes = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    if (headerCanvas && vpNav) {
      const rect = vpNav.getBoundingClientRect();
      headerCanvas.width = rect.width * dpr;
      headerCanvas.height = rect.height * dpr;
    }

    if (subHeaderCanvas && vpSubHeader) {
      const rect = vpSubHeader.getBoundingClientRect();
      subHeaderCanvas.width = rect.width * dpr;
      subHeaderCanvas.height = rect.height * dpr;
    }

    if (sidebarCanvas && vpSidebar) {
      const rect = vpSidebar.getBoundingClientRect();
      sidebarCanvas.width = rect.width * dpr;
      sidebarCanvas.height = rect.height * dpr;
    }
  };

  updateOverlaySizes();
  window.addEventListener('resize', updateOverlaySizes);

  const classObserver = new window.MutationObserver((mutations) => {
    mutations.forEach((mu) => {
      if (mu.type !== 'attributes' && mu.attributeName !== 'class') return;
      checkDarkMode();
    });
  });
  classObserver.observe(document.documentElement, { attributes: true });
  checkDarkMode();

  // Mount FooterHeart component into the footer
  const mountFooterHeart = () => {
    const mountPoint = document.getElementById('footer-heart-mount');
    if (mountPoint && !mountPoint.hasChildNodes()) {
      const app = createApp({
        render: () => h(FooterHeart)
      });
      app.mount(mountPoint);
    }
  };

  // Try mounting immediately and also after a short delay (for page transitions)
  mountFooterHeart();
  setTimeout(mountFooterHeart, 100);

  return () => {
    window.removeEventListener('resize', updateSize);
    window.removeEventListener('resize', updateOverlaySizes);
    classObserver.disconnect();
    // Clean up overlay canvases
    if (headerCanvas) headerCanvas.remove();
    if (subHeaderCanvas) subHeaderCanvas.remove();
    if (sidebarCanvas) sidebarCanvas.remove();
  }
});

const lightColorsHomepage = [
  'hsl(316, 69%, 57%)', // brand 1
  'hsl(60, 5%, 96%)', // bg
  'hsl(35, 81%, 51%)', // secondary 1
  'hsl(245, 17%, 51%)', // text 3
];
const lightColorsOther = [
  'hsl(60, 5%, 96%)', // bg
  'hsl(55, 8%, 94%)', // bg-alt
  'hsl(65, 3%, 92%)', // bg-alt2
];

const darkColorsHomepage = [
  'hsl(317, 100%, 73%)', // brand 1
  'hsl(248, 31%, 23%)', // bg
  'hsl(32, 96%, 67%)', // secondary 1
  'hsl(60, 0%, 56%)', // text 3
];
const darkColorsOther = [
  'hsl(248, 31%, 23%)', // bg
  'hsl(240, 28%, 25%)', // bg-alt
  'hsl(250, 35%, 20%)', // bg-alt2
];

const lightColors = computed(() => isHomePage.value ? lightColorsHomepage : lightColorsOther);
const darkColors = computed(() => isHomePage.value ? darkColorsHomepage : darkColorsOther);
const colors = computed(() => isDarkMode.value ? darkColors.value : lightColors.value);
</script>

<template>
  <!-- Full-page noise background - WebGL for performance -->
  <NoiseBackground
    ref="noiseRef"
    :colors="colors"
    :animation-speed="isHomePage ? 0.00005 : 0.000025"
    :noise-frequency="isHomePage ? 0.0005 : 0.0005"
    :grain="isHomePage ? 0.075 : 0.05"
    :vignette="isHomePage ? 0.4 : isDarkMode ? 0.2 : 0.075"
    :on-render="copyToOverlays"
  />

  <DefaultTheme.Layout>
    <template #home-hero-image>
      <video
        autoplay
        loop
        muted
        playsinline
        data-name="teaser"
        poster="https://storage.googleapis.com/jupyter-scatter/dev/images/teaser-dark.jpg"
      >
        <source
          src="https://storage.googleapis.com/jupyter-scatter/dev/videos/teaser-dark.mp4"
          type="video/mp4"
        />
      </video>
    </template>
  </DefaultTheme.Layout>
</template>

<style scoped>
/* Hide the default VitePress hero name */
:deep(.VPHero .name) {
  font-weight: 800;
  transform: scale(1.125);
  transform-origin: left bottom;
}
:deep(.VPHero .text) {
  transform: scale(0.9);
  transform-origin: left top;
}

:deep(.VPHero .tagline) {
  color: var(--vp-c-text-1);
  opacity: 0.8;
}

:deep(.VPHomeHero .image-bg) {
  display: none;
}

/* Make VitePress backgrounds transparent to show noise */
:deep(.VPNav) {
  background: transparent !important;
}

:deep(.VPHome) {
  background: transparent !important;
}

:deep(.VPHome .VPNavBarMenuLink.active) {
  color: var(--vp-c-text-1) !important;
  text-decoration: underline 1px solid var(--vp-c-text-1) !important;
}

:deep(.VPHero) {
  background: transparent !important;
}

:deep(.VPFeatures) {
  background: transparent !important;
}

:deep(.VPHomeFeatures) {
  background: transparent !important;
}

:deep(.VPSidebar) {
  background: transparent !important;
}

:deep(.VPNavBar:not(.home.top) .content-body) {
  background: transparent !important;
}

:deep(.VPNavBar:not(.home)) {
  background: transparent !important;
}

:deep(.VPLocalNav) {
  background: transparent !important;
}
</style>
