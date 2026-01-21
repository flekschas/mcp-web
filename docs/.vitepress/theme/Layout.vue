<script setup>
import DefaultTheme from 'vitepress/theme';
import { useData } from 'vitepress';
import { ref, onMounted, computed, watch } from 'vue';
import NoiseBackgroundGL from './NoiseBackground.vue';

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

  const classObserver = new window.MutationObserver((mutations) => {
    mutations.forEach((mu) => {
      if (mu.type !== 'attributes' && mu.attributeName !== 'class') return;
      checkDarkMode();
    });
  });
  classObserver.observe(document.documentElement, { attributes: true });
  checkDarkMode();

  return () => {
    window.removeEventListener('resize', updateSize);
    classObserver.disconnect();
  }
});

// Light mode colors (warm cream/gold)
const lightColors = [
  'hsl(316, 69%, 57%)', // brand 1
  'hsl(60, 5%, 96%)', // bg
  'hsl(35, 81%, 51%)', // secondary 1
  'hsl(245, 17%, 51%)', // text 3
];

// Dark mode colors (deep blue/cyan)
const darkColors = [
  'hsl(317, 100%, 73%)', // brand 1
  'hsl(248, 31%, 23%)', // bg
  'hsl(32, 96%, 67%)', // secondary 1
  'hsl(60, 0%, 56%)', // text 3
];
</script>

<template>
  <!-- Full-page noise background (only on home page) - WebGL for performance -->
  <NoiseBackgroundGL
    v-if="isHomePage"
    :colors="isDarkMode ? darkColors : lightColors"
    :animation-speed="0.00005"
    :noise-frequency="0.0008"
    :grain="0.03"
    :vignette="0.4"
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

/* Make VitePress backgrounds transparent on home page to show noise */
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
</style>
