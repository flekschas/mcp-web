<script lang="ts">
  let { count = 3, delay = 500 }: { count?: number; delay?: number } = $props();

  let numDots = $state(0);

  $effect(() => {
    const interval = setInterval(() => {
      numDots = (numDots + 1) % (count + 1);
    }, delay);

    return () => clearInterval(interval);
  });
</script>

<span class="relative inline-block">
  <span class="inset-0inline-block absolute">{".".repeat(numDots)}</span>
  <span class="invisible inline-block select-none opacity-0">{".".repeat(count + 1)}</span>
</span>
