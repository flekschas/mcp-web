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
};

const onMouseLeave = () => {
  morphTween?.reverse();
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
      d="M6.27 13.94c.468.468 1.084.693 1.697.687.614.01 1.23-.22 1.697-.687l5.04-5.013c1.728-1.73 1.728-4.53 0-6.26-1.73-1.727-4.53-1.727-6.26 0L8 3.11l-.444-.44C5.827.94 3.024.94 1.297 2.67c-1.73 1.728-1.73 4.53 0 6.257L6.27 13.94z"
    />
    <path
      id="pixels"
      class="heart-path-target"
      d="m2,8.99988l-2.0005,0l0.0005,-3.99964l0,-2.00037l2,0l0,-1.99982l4,0l0,1.99982l4,0l0,-1.99982l4,0l0,1.99982l2,0l0,6.00001l-2,0l0,2.00037l-2,0l0,1.99982l-2,0l0,1.99982l-4,0l0,-1.99982l-2,0l0,-1.99982l-2,0l0,-2.00037z"
    />
  </svg>
</template>

<style scoped>
.footer-heart {
  display: inline-block;
  width: 1em;
  height: 1em;
  vertical-align: text-top;
}

.heart-path {
  fill: currentColor;
}

.heart-path-target {
  visibility: hidden;
}
</style>
