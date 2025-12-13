<script lang="ts">
  const title = 'Checkers';

  const orders = [
    title.split('').map((char, index) => index),
  ];

  for (let i = 0; i < 3; i++) {
    const length = title.length;
    const charToSwitch = Math.floor(Math.random() * length);
    // 1 for forward, -1 for backward
    const switchDirection = charToSwitch === 0
      ? 1
      : charToSwitch === length - 1
        ? length - 2
        : Math.random() > 0.5 ? 1 : -1;
    const newOrder = [...orders.at(-1)!];
    let newCharToSwitch = charToSwitch + switchDirection;
    [newOrder[charToSwitch], newOrder[newCharToSwitch]] = [newOrder[newCharToSwitch], newOrder[charToSwitch]];
    orders.push(newOrder);
  }

  let order = $state(orders.length - 1);

  // Calculate translateX for each letter based on its position
  function getTranslateX(domIndex: number) {
    const currentOrder = orders[order];
    const visualPosition = currentOrder[domIndex];
    const offset = (visualPosition - domIndex) * 100; // Percentage based on character width
    return offset;
  }

  $effect(() => {
    if (order <= 0) return;
    const currentOrder = order;
    setTimeout(() => { order = currentOrder - 1; }, 400);
  });
</script>

<div class="flex items-center justify-center mb-4">
  <div class="relative">
    <h1 class="relative z-10 flex items-center justify-center text-4xl font-bold text-white font-mono uppercase">
      {#each title as char, index}
        <span
          class="checker-piece text-white px-2 py-1"
          style="transform: translateX({getTranslateX(index)}%)"
        >
          {char}
        </span>
      {/each}
    </h1>
    <div class="absolute pointer-events-none top-0 left-0 w-full h-full z-0 text-4xl font-bold font-mono uppercase">
      {#each title as char, index}
        <span
          class="checker-piece text-white px-2 py-1 inset-ring-2 inset-ring-[#94644b] odd:bg-[#94644b]"
        >
          <span class="invisible">{char}</span>
        </span>
      {/each}
    </div>
  </div>
</div>

<style>
  .checker-piece {
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: center;
    display: inline-block;
  }

  /* Add a subtle bounce and rotation when pieces move */
  .checker-piece:hover {
    transform: scale(1.1) rotate(5deg) !important;
  }
</style>
