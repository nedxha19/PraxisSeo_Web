<script>
	let { data } = $props();

	const nameFieldCandidates = ['name', 'title', 'product_name'];
	const descriptionFieldCandidates = ['description', 'details', 'summary'];
	const priceFieldCandidates = ['price', 'cost', 'amount'];

	function getFirstByKeys(row, keys) {
		for (const key of keys) {
			if (row?.[key] !== null && row?.[key] !== undefined && row?.[key] !== '') return row[key];
		}
		return null;
	}

	function getImage(row) {
		const value = row?.image_url ?? row?.image ?? row?.photo_url ?? null;
		if (typeof value !== 'string') return null;
		const trimmed = value.trim();
		return trimmed || null;
	}

	function getName(row) {
		return getFirstByKeys(row, nameFieldCandidates) ?? 'Unnamed product';
	}

	function getDescription(row) {
		return getFirstByKeys(row, descriptionFieldCandidates) ?? 'No description available.';
	}

	function getPrice(row) {
		const value = getFirstByKeys(row, priceFieldCandidates);
		if (value === null) return null;
		const num = Number(value);
		if (!Number.isFinite(num)) return String(value);
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
	}
</script>


<svelte:head>
	<title>{getName(data.product)} | Electronic Devices</title>
	<meta name="description" content={getDescription(data.product)} />
	<meta property="og:image" content={getImage(data.product) ?? ''} />
</svelte:head>
<main class="mx-auto max-w-5xl px-4 py-10">
	<a href="/" class="mb-6 inline-block text-sm text-blue-700 hover:underline">Back to products</a>

	<div class="grid gap-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm md:grid-cols-2">
		{#if getImage(data.product)}
			<img
				src={getImage(data.product)}
				alt={getName(data.product)}
				class="h-full min-h-80 w-full rounded-xl bg-gray-100 object-cover"
			/>
		{:else}
			<div class="flex min-h-80 items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-500">
				No image available
			</div>
		{/if}

		<section class="space-y-4">
			<p class="text-sm uppercase tracking-[0.2em] text-gray-500">Product Detail</p>
			<h1 class="text-3xl font-bold text-gray-900">{getName(data.product)}</h1>

			{#if getPrice(data.product)}
				<p class="text-2xl font-semibold text-blue-900">{getPrice(data.product)}</p>
			{/if}

			<p class="text-base leading-7 text-gray-700">{getDescription(data.product)}</p>
		</section>
	</div>
</main>
