<script>
	let { data } = $props();
</script>

<svelte:head>
	<title>{data.category} | PraxisSeo</title>
</svelte:head>

<div class="min-h-screen bg-white px-6 py-16 text-zinc-900 dark:bg-zinc-950 dark:text-white">
	<div class="mx-auto max-w-6xl">
		<p class="mb-3 text-sm uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-300">
			Category
		</p>

		<h1 class="text-4xl font-black capitalize sm:text-5xl">
			{data.category}
		</h1>

		<p class="mt-4 max-w-2xl text-base text-zinc-600 dark:text-zinc-300">
			This is the category page for {data.category}. You can now add products, filters, cards, and
			real content here.
		</p>

		<a
			href="/"
			class="mt-8 inline-flex rounded-full border border-black/10 px-5 py-3 text-sm font-semibold transition hover:border-cyan-500 hover:text-cyan-600 dark:border-white/10 dark:hover:border-cyan-300 dark:hover:text-cyan-300"
		>
			Back to home
		</a>
	</div>
</div>