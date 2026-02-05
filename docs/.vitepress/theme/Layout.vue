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

  // Clip content as it scrolls under the transparent header
  const vpContent = document.getElementById('VPContent');
  let headerHeight = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--vp-nav-height') || '64'
  );

  if (vpContent) {
    vpContent.style.willChange = 'clip-path';
  }

  const updateClip = () => {
    if (!vpContent) return;
    vpContent.style.clipPath = `inset(${window.scrollY + headerHeight}px 0 0 0)`;
  };

  // Recache header height on resize (it can change on mobile)
  const onResize = () => {
    headerHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--vp-nav-height') || '64'
    );
  };

  window.addEventListener('scroll', updateClip, { passive: true });
  window.addEventListener('resize', onResize);
  updateClip();

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
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', updateClip);
    classObserver.disconnect();
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

console.log('isHomePage', isHomePage.value)

const lightColors = computed(() => isHomePage.value ? lightColorsHomepage : lightColorsOther);
const darkColors = computed(() => isHomePage.value ? darkColorsHomepage : darkColorsOther);
const colors = computed(() => isDarkMode.value ? darkColors.value : lightColors.value);

console.log('colors', colors.value === darkColorsOther)
</script>

<template>
  <!-- Full-page noise background (only on home page) - WebGL for performance -->
  <NoiseBackground
    :colors="colors"
    :animation-speed="isHomePage ? 0.00005 : 0.000025"
    :noise-frequency="isHomePage ? 0.0005 : 0.0005"
    :grain="isHomePage ? 0.075 : 0.05"
    :vignette="isHomePage ? 0.4 : isDarkMode ? 0.2 : 0.075"
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
</style>
