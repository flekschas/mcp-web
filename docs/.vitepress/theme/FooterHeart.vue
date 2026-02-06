<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { gsap } from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';

gsap.registerPlugin(MorphSVGPlugin);

const heartRef = ref(null);
let morphTween = null;
let parentLink = null;

const onMouseEnter = () => {
  morphTween?.play();
  heartRef.value.classList.add('enlarge');
};

const onMouseLeave = () => {
  morphTween?.reverse();
  heartRef.value.classList.remove('enlarge');
};

onMounted(() => {
  const roundPath = heartRef.value.querySelector('#round');
  const pixelsPath = heartRef.value.querySelector('#pixels');

  // Create the morph tween (paused)
  morphTween = gsap.to(roundPath, {
    morphSVG: pixelsPath,
    duration: 0.4,
    ease: 'power2.inOut',
    paused: true,
  });

  // Find the parent link and attach hover events to it
  parentLink = heartRef.value.closest('a');
  if (parentLink) {
    parentLink.addEventListener('mouseenter', onMouseEnter);
    parentLink.addEventListener('mouseleave', onMouseLeave);
  }
});

onBeforeUnmount(() => {
  morphTween?.kill();
  if (parentLink) {
    parentLink.removeEventListener('mouseenter', onMouseEnter);
    parentLink.removeEventListener('mouseleave', onMouseLeave);
  }
});
</script>

<template>
  <svg
    ref="heartRef"
    class="footer-heart"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 16 16"
  >
    <path
      id="round"
      class="heart-path"
      d="m0.005,5.578c0.01,-0.192 0.032,-0.383 0.066,-0.573l1.924,0l0,1.99l-1.831,0c-0.09,-0.319 -0.143,-0.646 -0.159,-0.975l0,-0.442zm0.068,-0.583c0.131,-0.712 0.438,-1.399 0.921,-1.99l1.001,0l0,1.99l-1.922,0zm0.929,-2c0.092,-0.112 0.19,-0.22 0.295,-0.325c0.217,-0.217 0.451,-0.408 0.698,-0.57l0,0.895l-0.993,0zm1.003,-0.902c0.608,-0.399 1.292,-0.632 1.99,-0.7l0,1.602l-1.99,0l0,-0.902zm2,-0.701c0.67,-0.063 1.352,0.026 1.99,0.267l0,1.336l-1.99,0l0,-1.603zm2,0.271c0.565,0.215 1.095,0.551 1.551,1.007l0.328,0.325l-1.879,0l0,-1.332zm1.889,1.342l0.101,0.1l0,1.89l-1.99,0l0,-1.99l1.889,0zm0.111,0.1l0.1,-0.1l1.89,0l0,1.99l-1.99,0l0,-1.89zm0.11,-0.11l0.329,-0.328c0.456,-0.455 0.986,-0.79 1.551,-1.005l0,1.333l-1.88,0zm1.89,-1.337c0.638,-0.241 1.32,-0.33 1.99,-0.266l0,1.603l-1.99,0l0,-1.337zm2,-0.265c0.697,0.067 1.382,0.3 1.99,0.698l0,0.904l-1.99,0l0,-1.602zm2,0.705c0.247,0.162 0.481,0.352 0.699,0.569c0.105,0.106 0.204,0.215 0.297,0.328l-0.996,0l0,-0.897zm1.004,0.907c0.482,0.591 0.788,1.278 0.918,1.99l-1.922,0l0,-1.99l1.004,0zm0.92,2c0.035,0.192 0.057,0.386 0.066,0.581l0,0.422c-0.016,0.333 -0.069,0.664 -0.159,0.987l-1.831,0l0,-1.99l1.924,0zm-0.096,2c-0.199,0.704 -0.575,1.368 -1.129,1.922l-0.068,0.068l-0.631,0l0,-1.99l1.828,0zm-1.207,2l-0.621,0.617l0,-0.617l0.621,0zm-0.631,0.627l-1.37,1.363l-0.62,0l0,-1.99l1.99,0l0,0.627zm-1.38,1.373l-0.61,0.607l0,-0.607l0.61,0zm-0.62,0.616l-1.381,1.374l-0.609,0l0,-1.99l1.99,0l0,0.616zm-1.391,1.384l-0.599,0.596l0,-0.596l0.599,0zm-0.609,0.606l-0.331,0.329c-0.457,0.457 -1.058,0.687 -1.659,0.687l0,-1.622l1.99,0l0,0.606zm-2,1.016c-0.009,0 -0.019,0 -0.028,0c-0.613,0.006 -1.229,-0.219 -1.697,-0.687l-0.265,-0.267l0,-0.668l1.99,0l0,1.622zm-2,-0.964l-0.653,-0.658l0.653,0l0,0.658zm-0.662,-0.668l-1.328,-1.338l0,-0.652l1.99,0l0,1.99l-0.662,0zm-1.338,-1.348l-0.637,-0.642l0.637,0l0,0.642zm-0.647,-0.652l-1.343,-1.354l0,-0.636l1.99,0l0,1.99l-0.647,0zm-1.353,-1.364l-0.621,-0.626l0.621,0l0,0.626zm-0.631,-0.636l-0.067,-0.068c-0.555,-0.554 -0.932,-1.218 -1.131,-1.922l1.829,0l0,1.99l-0.631,0zm0.641,-1.99l1.99,0l0,1.99l-1.99,0l0,-1.99zm4,3.99l0,-1.99l1.99,0l0,1.99l-1.99,0zm-2,0l0,-1.99l1.99,0l0,1.99l-1.99,0zm3.99,-5.99l0,1.99l-1.99,0l0,-1.99l1.99,0zm2,2l0,1.99l-1.99,0l0,-1.99l1.99,0zm4,1.99l-1.99,0l0,-1.99l1.99,0l0,1.99zm-7.99,4l0,-1.99l1.99,0l0,1.99l-1.99,0zm3.99,-7.99l0,1.99l-1.99,0l0,-1.99l1.99,0zm2,0l0,1.99l-1.99,0l0,-1.99l1.99,0zm0,3.99l-1.99,0l0,-1.99l1.99,0l0,1.99zm-7.99,-1.99l1.99,0l0,1.99l-1.99,0l0,-1.99zm3.99,0l0,1.99l-1.99,0l0,-1.99l1.99,0zm-2,-2l0,1.99l-1.99,0l0,-1.99l1.99,0zm-3.99,0l1.99,0l0,1.99l-1.99,0l0,-1.99zm9.99,5.99l-1.99,0l0,-1.99l1.99,0l0,1.99zm-3.99,0l0,-1.99l1.99,0l0,1.99l-1.99,0zm0,2l0,-1.99l1.99,0l0,1.99l-1.99,0zm-2.01,-9.99l0,1.99l-1.99,0l0,-1.99l1.99,0zm-2,0l0,1.99l-1.99,0l0,-1.99l1.99,0zm8,0l0,1.99l-1.99,0l0,-1.99l1.99,0zm2,3.99l-1.99,0l0,-1.99l1.99,0l0,1.99zm0,-3.99l0,1.99l-1.99,0l0,-1.99l1.99,0z"
    />
    <path
      id="pixels"
      class="heart-path-target"
      d="m5.875,1.125l0,1.75l-1.75,0l0,-1.75l1.75,0zm-1.75,9.75l0,-1.75l1.75,0l0,1.75l-1.75,0zm0,-3.75l1.75,0l0,1.75l-1.75,0l0,-1.75zm3.75,0l0,1.75l-1.75,0l0,-1.75l1.75,0zm4,1.75l-1.75,0l0,-1.75l1.75,0l0,1.75zm0,2l-1.75,0l0,-1.75l1.75,0l0,1.75zm-3.75,0l0,-1.75l1.75,0l0,1.75l-1.75,0zm-2,0l0,-1.75l1.75,0l0,1.75l-1.75,0zm0,4l0,-1.75l1.75,0l0,1.75l-1.75,0zm-6,-7.75l1.75,0l0,1.75l-1.75,0l0,-1.75zm0,-2l1.75,0l0,1.75l-1.75,0l0,-1.75zm2,4l1.75,0l0,1.75l-1.75,0l0,-1.75zm0,-2l1.75,0l0,1.75l-1.75,0l0,-1.75zm9.75,-6l0,1.75l-1.75,0l0,-1.75l1.75,0zm2,0l0,1.75l-1.75,0l0,-1.75l1.75,0zm-4,2l0,1.75l-1.75,0l0,-1.75l1.75,0zm2,0l0,1.75l-1.75,0l0,-1.75l1.75,0zm-8,-2l0,1.75l-1.75,0l0,-1.75l1.75,0zm12,5.75l-1.75,0l0,-1.75l1.75,0l0,1.75zm0,2l-1.75,0l0,-1.75l1.75,0l0,1.75zm-7.75,6l0,-1.75l1.75,0l0,1.75l-1.75,0zm7.75,-10l-1.75,0l0,-1.75l1.75,0l0,1.75zm-13.75,0.25l1.75,0l0,1.75l-1.75,0l0,-1.75zm3.75,0l0,1.75l-1.75,0l0,-1.75l1.75,0zm2,0l0,1.75l-1.75,0l0,-1.75l1.75,0zm2,0l0,1.75l-1.75,0l0,-1.75l1.75,0zm2,0l0,1.75l-1.75,0l0,-1.75l1.75,0zm-5.75,7.75l0,-1.75l1.75,0l0,1.75l-1.75,0zm-2,0l0,-1.75l1.75,0l0,1.75l-1.75,0zm9.75,-9.75l0,1.75l-1.75,0l0,-1.75l1.75,0zm0,3.75l-1.75,0l0,-1.75l1.75,0l0,1.75zm0,2l-1.75,0l0,-1.75l1.75,0l0,1.75zm0,2l-1.75,0l0,-1.75l1.75,0l0,1.75zm-3.75,2l0,-1.75l1.75,0l0,1.75l-1.75,0zm-2,0l0,-1.75l1.75,0l0,1.75l-1.75,0zm1.75,-5.75l0,1.75l-1.75,0l0,-1.75l1.75,0zm-9.75,-4l1.75,0l0,1.75l-1.75,0l0,-1.75zm3.75,0l0,1.75l-1.75,0l0,-1.75l1.75,0zm2,0l0,1.75l-1.75,0l0,-1.75l1.75,0zm2,0l0,1.75l-1.75,0l0,-1.75l1.75,0z"
    />
  </svg>
</template>

<style scoped>
svg {
  transition: all 0.4s ease-in-out;
}

.footer-heart {
  display: inline-block;
  width: 1em;
  height: 1em;
  vertical-align: text-top;
  margin-left: 0;
  margin-right: 0;
}

.heart-path {
  fill: currentColor;
}

.heart-path-target {
  visibility: hidden;
}

.enlarge {
  transform: scale(1.33);
  margin-left: 0.2em;
  margin-right: 0.2em;
}
</style>
