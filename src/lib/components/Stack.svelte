<script lang="ts">
	import { fly } from 'svelte/transition';
	import { flip } from 'svelte/animate';

	let { items }: {
    items: {
      id: string;
      secondsLeft: number;
      text: string;
    }[]
  } = $props();
</script>

<div class="flex w-80 flex-col gap-2">
	{#each items as item (item.id)}
    <div
      in:fly={{ y: 50, duration: 400 }}
      animate:flip={{ duration: 300 }}
      class="flex items-center gap-3 rounded-lg border bg-[#1e1e1e] border-orange-700 box shadow-md"
    >
      <span class="rounded bg-red-100 px-2 py-0.5 w-12 font-mono text-xs font-bold text-red-700 text-center">
        {item.secondsLeft.toFixed(1)}&nbsp;s
      </span>
      <span class="text-md font-medium text-orange-300">
        {item.text}
      </span>
    </div>
	{/each}
</div>