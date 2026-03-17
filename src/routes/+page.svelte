<script lang="ts">
  import background from '$lib/assets/tek.jpg';
  import { fade, fly, scale, slide } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';

  type Product = Record<string, unknown>;
  type CartItem = Product & { quantity: number; cartKey: string };
  type Category = {
    name: string;
    description: string;
    slug: string;
    image: string;
  };

  let { data } = $props<{
    data: {
      products?: Product[];
      productsError?: string | null;
    };
  }>();

  const NAME_FIELDS = ['name', 'title', 'product_name'] as const;
  const DESCRIPTION_FIELDS = ['description', 'details', 'summary'] as const;
  const PRICE_FIELDS = ['price', 'cost', 'amount'] as const;
  const SLUG_FIELDS = ['slug', 'product_slug'] as const;

  const categories: Category[] = [
    {
      name: 'Phones',
      description: 'Flagship devices with titanium frames and AI photography.',
      slug: 'phones',
      image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1200&q=80'
    },
    {
      name: 'Laptops',
      description: 'Ultra-thin workstations built for creators and remote teams.',
      slug: 'laptops',
      image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=80'
    },
    {
      name: 'Audio',
      description: 'Spatial sound, adaptive noise cancellation, studio-grade clarity.',
      slug: 'audio',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80'
    },
    {
      name: 'Wearables',
      description: 'Health tracking, elegant materials, all-day performance.',
      slug: 'wearables',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=80'
    }
  ];

  let searchTerm = $state('');
  let sortOption = $state<'featured' | 'name' | 'price-low' | 'price-high'>('featured');
  let isDark = $state(false);
  let mobileMenuOpen = $state(false);
  let filtersOpen = $state(false);
  let cartOpen = $state(false);
  let quickView = $state<Product | null>(null);
  let cart = $state<CartItem[]>([]);

  const formatCurrency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  });

  function getFirstByKeys(row: Product | null | undefined, keys: readonly string[]) {
    for (const key of keys) {
      const value = row?.[key];
      if (value !== null && value !== undefined && value !== '') return value;
    }
    return null;
  }

  function getName(row: Product) {
    return String(getFirstByKeys(row, NAME_FIELDS) ?? 'Untitled product');
  }

  function getDescription(row: Product) {
    return String(
      getFirstByKeys(row, DESCRIPTION_FIELDS) ??
        'Engineered with premium materials, refined details, and long-term usability in mind.'
    );
  }

  function getImage(row: Product) {
    const candidate = row.image_url ?? row.image ?? row.photo_url ?? null;
    return typeof candidate === 'string' && candidate.trim().length > 0 ? candidate.trim() : null;
  }

  function getSlug(row: Product, fallback = '') {
    const value = getFirstByKeys(row, SLUG_FIELDS);
    if (value !== null) return String(value);

    const raw = String(getFirstByKeys(row, NAME_FIELDS) ?? fallback ?? 'product');
    return raw
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'product';
  }

  function getNumericPrice(row: Product) {
    const value = getFirstByKeys(row, PRICE_FIELDS);
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function getDisplayPrice(row: Product) {
    const numeric = getNumericPrice(row);
    return numeric === null ? 'Contact for price' : formatCurrency.format(numeric);
  }

  function getCartKey(row: Product, index = 0) {
    return `${getSlug(row, String(index))}-${index}`;
  }

  let productList = $derived(Array.isArray(data.products) ? data.products : []);

  let filteredProducts = $derived.by(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = [...productList].filter((product) => {
      if (!term) return true;
      return [getName(product), getDescription(product)].some((value) =>
        value.toLowerCase().includes(term)
      );
    });

    return list.sort((a, b) => {
      if (sortOption === 'name') return getName(a).localeCompare(getName(b));
      if (sortOption === 'price-low') return (getNumericPrice(a) ?? Infinity) - (getNumericPrice(b) ?? Infinity);
      if (sortOption === 'price-high') return (getNumericPrice(b) ?? -Infinity) - (getNumericPrice(a) ?? -Infinity);
      return 0;
    });
  });

  let cartCount = $derived(cart.reduce((sum, item) => sum + item.quantity, 0));
  let cartTotal = $derived(cart.reduce((sum, item) => sum + (getNumericPrice(item) ?? 0) * item.quantity, 0));
  let freeShippingThreshold = 1500;
  let shippingProgress = $derived(Math.min(100, (cartTotal / freeShippingThreshold) * 100));
  let shippingRemaining = $derived(Math.max(0, freeShippingThreshold - cartTotal));

  function toggleTheme() {
    isDark = !isDark;
    localStorage.setItem('tek-theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
  }

  function addToCart(product: Product) {
    const slug = getSlug(product);
    const existingIndex = cart.findIndex((item) => getSlug(item) === slug);

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += 1;
      cart = [...cart];
    } else {
      cart = [...cart, { ...product, quantity: 1, cartKey: getCartKey(product, cart.length) }];
    }

    cartOpen = true;
  }

  function changeQuantity(index: number, delta: number) {
    const current = cart[index];
    if (!current) return;

    const nextQuantity = current.quantity + delta;
    if (nextQuantity <= 0) {
      removeFromCart(index);
      return;
    }

    cart[index].quantity = nextQuantity;
    cart = [...cart];
  }

  function removeFromCart(index: number) {
    cart.splice(index, 1);
    cart = [...cart];
  }

  function closeOverlays() {
    mobileMenuOpen = false;
    filtersOpen = false;
    cartOpen = false;
    quickView = null;
  }

  function openQuickView(product: Product) {
    quickView = product;
  }

  $effect(() => {
    const savedTheme = localStorage.getItem('tek-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    isDark = savedTheme ? savedTheme === 'dark' : systemDark;
    document.documentElement.classList.toggle('dark', isDark);
  });

  $effect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeOverlays();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });
</script>

<svelte:head>
  <title>TEK — Premium electronics storefront</title>
  <meta
    name="description"
    content="A premium SvelteKit storefront with refined visual hierarchy, high-end motion, accessible interactions, and conversion-focused commerce UX."
  />
  <meta property="og:title" content="TEK — Premium electronics storefront" />
  <meta property="og:description" content="Minimal, polished, premium commerce for modern hardware brands." />
  <meta property="og:image" content={background} />
</svelte:head>

<div class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.12),transparent_28%),linear-gradient(to_bottom,#f8fafc,#eef2ff_30%,#ffffff_60%)] text-zinc-950 transition-colors duration-300 dark:bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.10),transparent_26%),linear-gradient(to_bottom,#09090b,#0f172a_32%,#09090b_75%)] dark:text-zinc-50">
  <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    <div class="absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.16),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.16),transparent_35%)]"></div>
  </div>

  <nav class="sticky top-0 z-40 border-b border-black/5 bg-white/75 backdrop-blur-2xl supports-[backdrop-filter]:bg-white/60 dark:border-white/10 dark:bg-zinc-950/70">
    <div class="mx-auto flex max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <a href="/" class="flex items-center gap-3 rounded-full px-2 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500">
        <span class="inline-flex size-10 items-center justify-center rounded-2xl bg-zinc-950 text-sm font-semibold tracking-[0.24em] text-white dark:bg-white dark:text-zinc-950">T</span>
        <div>
          <p class="text-sm font-medium uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400">TEK</p>
          <p class="text-sm font-semibold tracking-tight">Future hardware</p>
        </div>
      </a>

      <div class="hidden flex-1 items-center justify-center lg:flex">
        <div class="inline-flex items-center gap-1 rounded-full border border-black/5 bg-white/70 p-1 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
          <a href="#featured" class="rounded-full px-4 py-2 text-zinc-600 transition hover:bg-zinc-950 hover:text-white dark:text-zinc-300 dark:hover:bg-white dark:hover:text-zinc-950">Featured</a>
          <a href="#categories" class="rounded-full px-4 py-2 text-zinc-600 transition hover:bg-zinc-950 hover:text-white dark:text-zinc-300 dark:hover:bg-white dark:hover:text-zinc-950">Categories</a>
          <a href="#shop" class="rounded-full px-4 py-2 text-zinc-600 transition hover:bg-zinc-950 hover:text-white dark:text-zinc-300 dark:hover:bg-white dark:hover:text-zinc-950">Shop</a>
          <a href="#footer" class="rounded-full px-4 py-2 text-zinc-600 transition hover:bg-zinc-950 hover:text-white dark:text-zinc-300 dark:hover:bg-white dark:hover:text-zinc-950">Contact</a>
        </div>
      </div>

      <div class="ml-auto flex items-center gap-2 sm:gap-3">
        <label class="relative hidden md:block">
          <span class="sr-only">Search products</span>
          <input
            bind:value={searchTerm}
            type="search"
            placeholder="Search premium devices"
            class="h-11 w-72 rounded-full border border-black/5 bg-white/80 pl-11 pr-4 text-sm outline-none ring-0 transition placeholder:text-zinc-400 focus:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-white/10 dark:bg-white/5 dark:placeholder:text-zinc-500"
          />
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-4.35-4.35m1.35-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </label>

        <button
          type="button"
          class="inline-flex size-11 items-center justify-center rounded-full border border-black/5 bg-white/75 transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-white/10 dark:bg-white/5"
          aria-label="Toggle theme"
          onclick={toggleTheme}
        >
          {#if isDark}
            <svg xmlns="http://www.w3.org/2000/svg" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 3v2.25M12 18.75V21M4.22 4.22l1.59 1.59M18.19 18.19l1.59 1.59M3 12h2.25M18.75 12H21M4.22 19.78l1.59-1.59M18.19 5.81l1.59-1.59M15.75 12A3.75 3.75 0 1112 8.25 3.75 3.75 0 0115.75 12z"/>
            </svg>
          {:else}
            <svg xmlns="http://www.w3.org/2000/svg" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 12.79A9 9 0 1111.21 3c0 .24-.01.48-.01.72A9 9 0 0021 12.79z"/>
            </svg>
          {/if}
        </button>

        <button
          type="button"
          class="relative inline-flex size-11 items-center justify-center rounded-full border border-black/5 bg-white/75 transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-white/10 dark:bg-white/5"
          aria-label="Open cart"
          onclick={() => (cartOpen = true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M2.75 3.5h1.5l1.8 8.03a1.75 1.75 0 001.71 1.37h7.99a1.75 1.75 0 001.68-1.23l1.61-5.17H6.18"/>
            <circle cx="9.25" cy="18.5" r="1.5" />
            <circle cx="17.25" cy="18.5" r="1.5" />
          </svg>
          {#if cartCount > 0}
            <span class="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1.5 text-[11px] font-semibold text-white">{cartCount}</span>
          {/if}
        </button>

        <button
          type="button"
          class="inline-flex size-11 items-center justify-center rounded-full border border-black/5 bg-white/75 lg:hidden dark:border-white/10 dark:bg-white/5"
          aria-label="Open menu"
          onclick={() => (mobileMenuOpen = true)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </div>
  </nav>

  <section class="relative isolate overflow-hidden px-4 pt-10 sm:px-6 lg:px-8 lg:pt-12">
    <div class="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div class="max-w-2xl py-8 lg:py-16">
        <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs font-medium uppercase tracking-[0.24em] text-cyan-700 dark:text-cyan-300">
          <span class="size-2 rounded-full bg-cyan-400"></span>
          2026 Signature Collection
        </div>

        <h1 class="max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-balance sm:text-6xl lg:text-7xl" in:fly={{ y: 28, duration: 550, easing: quintOut }}>
          Electronics designed like luxury products, built like tools.
        </h1>

        <p class="mt-6 max-w-xl text-base leading-8 text-zinc-600 dark:text-zinc-300 sm:text-lg">
          TEK blends industrial precision, restrained motion, and high-performance commerce UX into a storefront that feels premium on every screen.
        </p>

        <div class="mt-8 flex flex-col gap-3 sm:flex-row">
          <a href="#shop" class="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-xl dark:bg-white dark:text-zinc-950">
            Shop the collection
          </a>
          <a href="#categories" class="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-white/70 px-6 text-sm font-medium transition hover:border-cyan-400 hover:text-cyan-600 dark:border-white/10 dark:bg-white/5 dark:hover:text-cyan-300">
            Explore categories
          </a>
        </div>

        <dl class="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div class="rounded-3xl border border-black/5 bg-white/65 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <dt class="text-xs uppercase tracking-[0.24em] text-zinc-500">Delivery</dt>
            <dd class="mt-2 text-2xl font-semibold tracking-tight">24h</dd>
          </div>
          <div class="rounded-3xl border border-black/5 bg-white/65 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
            <dt class="text-xs uppercase tracking-[0.24em] text-zinc-500">Support</dt>
            <dd class="mt-2 text-2xl font-semibold tracking-tight">24/7</dd>
          </div>
          <div class="rounded-3xl border border-black/5 bg-white/65 p-5 shadow-sm dark:border-white/10 dark:bg-white/5 col-span-2 sm:col-span-1">
            <dt class="text-xs uppercase tracking-[0.24em] text-zinc-500">Return window</dt>
            <dd class="mt-2 text-2xl font-semibold tracking-tight">30 days</dd>
          </div>
        </dl>
      </div>

      <div class="relative">
        <div class="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-cyan-500/15 via-transparent to-indigo-500/20 blur-3xl"></div>
        <div class="relative overflow-hidden rounded-[2rem] border border-white/50 bg-black shadow-[0_30px_120px_-30px_rgba(8,15,31,0.65)] dark:border-white/10">
          <img
            src={background}
            alt="Premium electronics hero banner"
            class="aspect-[4/5] w-full object-cover"
            width="1200"
            height="1500"
            fetchpriority="high"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent"></div>
          <div class="absolute inset-x-0 bottom-0 p-6 sm:p-8">
            <div class="rounded-[1.75rem] border border-white/15 bg-white/10 p-5 text-white backdrop-blur-xl">
              <p class="text-xs uppercase tracking-[0.28em] text-white/70">Editor’s pick</p>
              <div class="mt-3 flex items-end justify-between gap-4">
                <div>
                  <h2 class="text-2xl font-semibold tracking-tight">Nova X Pro</h2>
                  <p class="mt-1 text-sm text-white/75">Titanium shell. 3-day battery. Studio optics.</p>
                </div>
                <span class="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950">From $1,199</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="featured" class="px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
    <div class="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
      <article class="rounded-[2rem] border border-black/5 bg-white/70 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <p class="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Premium materials</p>
        <h3 class="mt-3 text-2xl font-semibold tracking-tight">Understated, not overdesigned</h3>
        <p class="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">A sharper grid, cleaner hierarchy, and more confident whitespace replace the generic glass-heavy look.</p>
      </article>
      <article class="rounded-[2rem] border border-black/5 bg-white/70 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <p class="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Motion system</p>
        <h3 class="mt-3 text-2xl font-semibold tracking-tight">Subtle movement with purpose</h3>
        <p class="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">Animations support focus and feedback instead of becoming decoration that slows the page down.</p>
      </article>
      <article class="rounded-[2rem] border border-black/5 bg-white/70 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <p class="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Commerce UX</p>
        <h3 class="mt-3 text-2xl font-semibold tracking-tight">Fast browsing, fast buying</h3>
        <p class="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-300">Search, sorting, quick view, and a cleaner cart drawer work together without visual clutter.</p>
      </article>
    </div>
  </section>

  <section id="categories" class="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
    <div class="mx-auto max-w-7xl">
      <div class="mb-8 flex items-end justify-between gap-4">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Collections</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Shop by category</h2>
        </div>
        <a href="#shop" class="hidden text-sm font-medium text-zinc-600 transition hover:text-cyan-600 sm:inline-block dark:text-zinc-300 dark:hover:text-cyan-300">Browse all products →</a>
      </div>

      <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {#each categories as category}
          <a
            href={`/category/${category.slug}`}
            class="group overflow-hidden rounded-[2rem] border border-black/5 bg-white/75 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 dark:bg-white/5"
          >
            <div class="relative overflow-hidden">
              <img
                src={category.image}
                alt={category.name}
                class="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                width="800"
                height="1000"
                loading="lazy"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent"></div>
              <div class="absolute inset-x-0 bottom-0 p-6 text-white">
                <h3 class="text-2xl font-semibold tracking-tight">{category.name}</h3>
                <p class="mt-2 text-sm leading-6 text-white/75">{category.description}</p>
              </div>
            </div>
          </a>
        {/each}
      </div>
    </div>
  </section>

  <section id="shop" class="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
    <div class="mx-auto max-w-7xl">
      <div class="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Storefront</p>
          <h2 class="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Curated product grid</h2>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label class="relative md:hidden">
            <span class="sr-only">Search products</span>
            <input
              bind:value={searchTerm}
              type="search"
              placeholder="Search products"
              class="h-12 w-full rounded-full border border-black/5 bg-white/80 pl-11 pr-4 text-sm outline-none focus:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-white/10 dark:bg-white/5"
            />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 21l-4.35-4.35m1.35-5.15a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </label>
          <button
            type="button"
            class="inline-flex h-12 items-center justify-between rounded-full border border-black/5 bg-white/80 px-5 text-sm font-medium dark:border-white/10 dark:bg-white/5 lg:hidden"
            onclick={() => (filtersOpen = !filtersOpen)}
            aria-expanded={filtersOpen}
            aria-controls="mobile-filters"
          >
            Filters & sort
            <span class:rotate-180={filtersOpen} class="ml-3 transition-transform">⌄</span>
          </button>
        </div>
      </div>

      <div class="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          id="mobile-filters"
          class:hidden={!filtersOpen}
          class="rounded-[2rem] border border-black/5 bg-white/70 p-6 shadow-sm dark:border-white/10 dark:bg-white/5 lg:block"
        >
          <div class="space-y-8 lg:sticky lg:top-24">
            <div>
              <p class="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Sort</p>
              <select
                bind:value={sortOption}
                class="mt-3 h-12 w-full rounded-2xl border border-black/5 bg-white px-4 text-sm outline-none focus:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-white/10 dark:bg-zinc-950"
              >
                <option value="featured">Featured</option>
                <option value="name">Name A–Z</option>
                <option value="price-low">Price: Low to high</option>
                <option value="price-high">Price: High to low</option>
              </select>
            </div>

            <div class="rounded-3xl border border-dashed border-black/10 bg-zinc-50 p-5 dark:border-white/10 dark:bg-white/5">
              <p class="text-xs font-medium uppercase tracking-[0.24em] text-zinc-500">Results</p>
              <p class="mt-3 text-3xl font-semibold tracking-tight">{filteredProducts.length}</p>
              <p class="mt-1 text-sm text-zinc-600 dark:text-zinc-300">products matching your current search and sorting preferences.</p>
            </div>
          </div>
        </aside>

        <div>
          {#if data.productsError}
            <div class="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              <p class="text-lg font-semibold">Unable to load products</p>
              <p class="mt-2 text-sm">{data.productsError}</p>
            </div>
          {:else if filteredProducts.length === 0}
            <div class="rounded-[2rem] border border-black/5 bg-white/70 p-10 text-center shadow-sm dark:border-white/10 dark:bg-white/5">
              <p class="text-2xl font-semibold tracking-tight">No matching products</p>
              <p class="mt-3 text-sm text-zinc-600 dark:text-zinc-300">Try clearing your search or choosing another sorting option.</p>
              <button
                type="button"
                class="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950"
                onclick={() => {
                  searchTerm = '';
                  sortOption = 'featured';
                }}
              >
                Reset filters
              </button>
            </div>
          {:else}
            <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {#each filteredProducts as product, index (getSlug(product, String(index)))}
                <article
                  class="group overflow-hidden rounded-[2rem] border border-black/5 bg-white/80 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_80px_-30px_rgba(8,145,178,0.45)] dark:border-white/10 dark:bg-white/5"
                  in:fade={{ delay: index * 35, duration: 220 }}
                >
                  <div class="relative overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                    {#if getImage(product)}
                      <img
                        src={getImage(product) ?? ''}
                        alt={getName(product)}
                        class="aspect-[4/4.6] w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                        width="900"
                        height="1020"
                        loading="lazy"
                      />
                    {:else}
                      <div class="flex aspect-[4/4.6] items-center justify-center text-sm text-zinc-400">No product image</div>
                    {/if}

                    <div class="absolute inset-x-0 top-0 flex items-start justify-between p-5">
                      <span class="rounded-full border border-white/20 bg-black/45 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-white backdrop-blur-md">New</span>
                      <button
                        type="button"
                        class="inline-flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white opacity-0 backdrop-blur-xl transition group-hover:opacity-100 focus:opacity-100"
                        aria-label={`Quick view ${getName(product)}`}
                        onclick={() => openQuickView(product)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" />
                          <circle cx="12" cy="12" r="3" stroke-width="1.8" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div class="space-y-4 p-6">
                    <div class="space-y-2">
                      <h3 class="text-xl font-semibold tracking-tight text-balance">{getName(product)}</h3>
                      <p class="line-clamp-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{getDescription(product)}</p>
                    </div>

                    <div class="flex items-center justify-between gap-4">
                      <p class="text-2xl font-semibold tracking-tight text-cyan-700 dark:text-cyan-300">{getDisplayPrice(product)}</p>
                      <span class="text-xs uppercase tracking-[0.22em] text-zinc-500">Ready to ship</span>
                    </div>

                    <div class="grid grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        class="inline-flex h-12 items-center justify-center rounded-full bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-cyan-600 dark:bg-white dark:text-zinc-950 dark:hover:bg-cyan-300"
                        onclick={() => addToCart(product)}
                      >
                        Add to cart
                      </button>
                      <a
                        href={`/products/${getSlug(product, String(index))}`}
                        class="inline-flex h-12 items-center justify-center rounded-full border border-black/10 bg-transparent px-4 text-sm font-medium transition hover:border-cyan-400 hover:text-cyan-600 dark:border-white/10 dark:hover:text-cyan-300"
                      >
                        View details
                      </a>
                    </div>
                  </div>
                </article>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>

  {#if mobileMenuOpen}
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onclick={() => (mobileMenuOpen = false)} transition:fade></div>
    <aside
      class="fixed inset-y-0 right-0 z-[60] flex w-full max-w-sm flex-col border-l border-white/10 bg-zinc-950 p-6 text-white shadow-2xl"
      transition:slide={{ axis: 'x', duration: 260 }}
      aria-label="Mobile navigation"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.26em] text-zinc-500">Navigation</p>
          <p class="mt-1 text-2xl font-semibold tracking-tight">TEK</p>
        </div>
        <button type="button" class="inline-flex size-11 items-center justify-center rounded-full border border-white/10 bg-white/5" onclick={() => (mobileMenuOpen = false)} aria-label="Close menu">✕</button>
      </div>
      <nav class="mt-10 flex flex-col gap-2 text-base">
        <a href="#featured" class="rounded-2xl px-4 py-3 hover:bg-white/5" onclick={() => (mobileMenuOpen = false)}>Featured</a>
        <a href="#categories" class="rounded-2xl px-4 py-3 hover:bg-white/5" onclick={() => (mobileMenuOpen = false)}>Categories</a>
        <a href="#shop" class="rounded-2xl px-4 py-3 hover:bg-white/5" onclick={() => (mobileMenuOpen = false)}>Shop</a>
        <a href="#footer" class="rounded-2xl px-4 py-3 hover:bg-white/5" onclick={() => (mobileMenuOpen = false)}>Contact</a>
      </nav>
    </aside>
  {/if}

  {#if quickView}
    <div
      class="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-xl"
      onclick={(event) => event.target === event.currentTarget && (quickView = null)}
      transition:fade={{ duration: 180 }}
      role="presentation"
    >
      <section
        class="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-950"
        transition:scale={{ start: 0.97, duration: 220 }}
        role="dialog"
        aria-modal="true"
        aria-label={`Quick view ${getName(quickView)}`}
      >
        <div class="grid max-h-[92vh] overflow-auto lg:grid-cols-[1fr_0.9fr]">
          <div class="bg-zinc-100 dark:bg-zinc-900">
            {#if getImage(quickView)}
              <img
                src={getImage(quickView) ?? ''}
                alt={getName(quickView)}
                class="aspect-[4/4.5] h-full w-full object-cover"
                width="1200"
                height="1350"
              />
            {/if}
          </div>
          <div class="flex flex-col p-6 sm:p-8 lg:p-10">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-[0.24em] text-zinc-500">Quick view</p>
                <h3 class="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{getName(quickView)}</h3>
              </div>
              <button type="button" class="inline-flex size-11 items-center justify-center rounded-full border border-black/10 dark:border-white/10" onclick={() => (quickView = null)} aria-label="Close quick view">✕</button>
            </div>

            <p class="mt-4 text-3xl font-semibold tracking-tight text-cyan-700 dark:text-cyan-300">{getDisplayPrice(quickView)}</p>
            <p class="mt-6 text-sm leading-7 text-zinc-600 dark:text-zinc-300">{getDescription(quickView)}</p>

            <div class="mt-8 grid gap-4 rounded-[1.5rem] border border-black/5 bg-zinc-50 p-5 dark:border-white/10 dark:bg-white/5">
              <div class="flex items-center justify-between text-sm">
                <span class="text-zinc-500">Shipping</span>
                <span class="font-medium">Free over {formatCurrency.format(freeShippingThreshold)}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-zinc-500">Warranty</span>
                <span class="font-medium">2 years included</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-zinc-500">Availability</span>
                <span class="font-medium">In stock</span>
              </div>
            </div>

            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                class="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-zinc-950 px-6 text-sm font-semibold text-white transition hover:bg-cyan-600 dark:bg-white dark:text-zinc-950 dark:hover:bg-cyan-300"
                onclick={() => {
                  addToCart(quickView);
                  quickView = null;
                }}
              >
                Add to cart
              </button>
              <a
                href={`/products/${getSlug(quickView)}`}
                class="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-black/10 px-6 text-sm font-medium transition hover:border-cyan-400 hover:text-cyan-600 dark:border-white/10 dark:hover:text-cyan-300"
              >
                Open product page
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  {/if}

  {#if cartOpen}
    <div class="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" onclick={() => (cartOpen = false)} transition:fade></div>
    <aside
      class="fixed inset-y-0 right-0 z-[80] flex w-full max-w-md flex-col border-l border-black/5 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-950"
      transition:slide={{ axis: 'x', duration: 260 }}
      aria-label="Shopping cart"
    >
      <div class="border-b border-black/5 p-6 dark:border-white/10">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs uppercase tracking-[0.24em] text-zinc-500">Cart</p>
            <h3 class="mt-2 text-2xl font-semibold tracking-tight">Your bag</h3>
          </div>
          <button type="button" class="inline-flex size-11 items-center justify-center rounded-full border border-black/10 dark:border-white/10" aria-label="Close cart" onclick={() => (cartOpen = false)}>✕</button>
        </div>

        {#if cart.length > 0}
          <div class="mt-5 rounded-[1.5rem] border border-black/5 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5">
            <div class="mb-3 flex items-center justify-between text-sm">
              <span class="text-zinc-500">Free shipping progress</span>
              <span class="font-medium">
                {#if shippingRemaining > 0}
                  {formatCurrency.format(shippingRemaining)} left
                {:else}
                  Unlocked
                {/if}
              </span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-white/10">
              <div class="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600" style={`width:${shippingProgress}%`}></div>
            </div>
          </div>
        {/if}
      </div>

      <div class="flex-1 overflow-auto p-6">
        {#if cart.length === 0}
          <div class="flex h-full flex-col items-center justify-center text-center">
            <div class="rounded-full border border-black/5 bg-zinc-50 p-5 dark:border-white/10 dark:bg-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" class="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M2.75 3.5h1.5l1.8 8.03a1.75 1.75 0 001.71 1.37h7.99a1.75 1.75 0 001.68-1.23l1.61-5.17H6.18"/>
              </svg>
            </div>
            <h4 class="mt-5 text-xl font-semibold tracking-tight">Your cart is empty</h4>
            <p class="mt-2 max-w-xs text-sm leading-7 text-zinc-600 dark:text-zinc-300">Add a few products to see order totals, shipping progress, and checkout actions here.</p>
            <button type="button" class="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950" onclick={() => (cartOpen = false)}>
              Continue shopping
            </button>
          </div>
        {:else}
          <div class="space-y-4">
            {#each cart as item, index (item.cartKey)}
              <article class="flex gap-4 rounded-[1.5rem] border border-black/5 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5">
                <div class="size-24 overflow-hidden rounded-[1.25rem] bg-zinc-200 dark:bg-zinc-900">
                  {#if getImage(item)}
                    <img src={getImage(item) ?? ''} alt={getName(item)} class="h-full w-full object-cover" width="200" height="200" loading="lazy" />
                  {/if}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <h4 class="line-clamp-2 font-semibold tracking-tight">{getName(item)}</h4>
                      <p class="mt-1 text-sm text-zinc-500">{getDisplayPrice(item)}</p>
                    </div>
                    <button type="button" class="text-sm text-red-500 hover:underline" onclick={() => removeFromCart(index)}>Remove</button>
                  </div>

                  <div class="mt-4 inline-flex items-center rounded-full border border-black/10 dark:border-white/10">
                    <button type="button" class="inline-flex size-10 items-center justify-center" aria-label="Decrease quantity" onclick={() => changeQuantity(index, -1)}>−</button>
                    <span class="min-w-10 text-center text-sm font-medium">{item.quantity}</span>
                    <button type="button" class="inline-flex size-10 items-center justify-center" aria-label="Increase quantity" onclick={() => changeQuantity(index, 1)}>+</button>
                  </div>
                </div>
              </article>
            {/each}
          </div>
        {/if}
      </div>

      {#if cart.length > 0}
        <div class="border-t border-black/5 p-6 dark:border-white/10">
          <div class="mb-5 flex items-center justify-between text-base">
            <span class="text-zinc-500">Subtotal</span>
            <span class="text-2xl font-semibold tracking-tight">{formatCurrency.format(cartTotal)}</span>
          </div>
          <button type="button" class="inline-flex h-12 w-full items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white transition hover:bg-cyan-600 dark:bg-white dark:text-zinc-950 dark:hover:bg-cyan-300">
            Proceed to checkout
          </button>
          <p class="mt-3 text-center text-xs text-zinc-500">Taxes and shipping calculated at checkout.</p>
        </div>
      {/if}
    </aside>
  {/if}

  <footer id="footer" class="mt-8 border-t border-black/5 px-4 py-14 sm:px-6 lg:px-8 dark:border-white/10">
    <div class="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_0.7fr_0.7fr_1fr]">
      <div>
        <p class="text-xs font-medium uppercase tracking-[0.26em] text-zinc-500">TEK</p>
        <h2 class="mt-3 text-3xl font-semibold tracking-tight">Premium storefronts for premium hardware.</h2>
        <p class="mt-4 max-w-md text-sm leading-7 text-zinc-600 dark:text-zinc-300">Built with modern SvelteKit patterns, better layout discipline, stronger visual hierarchy, and cleaner commerce interactions.</p>
      </div>

      <div>
        <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Shop</h3>
        <ul class="mt-4 space-y-3 text-sm">
          <li><a href="#shop" class="transition hover:text-cyan-600 dark:hover:text-cyan-300">New arrivals</a></li>
          <li><a href="#categories" class="transition hover:text-cyan-600 dark:hover:text-cyan-300">Categories</a></li>
          <li><a href="#shop" class="transition hover:text-cyan-600 dark:hover:text-cyan-300">Best sellers</a></li>
        </ul>
      </div>

      <div>
        <h3 class="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Company</h3>
        <ul class="mt-4 space-y-3 text-sm">
          <li><a href="#" class="transition hover:text-cyan-600 dark:hover:text-cyan-300">About</a></li>
          <li><a href="#" class="transition hover:text-cyan-600 dark:hover:text-cyan-300">Support</a></li>
          <li><a href="#" class="transition hover:text-cyan-600 dark:hover:text-cyan-300">Careers</a></li>
        </ul>
      </div>

      <form class="rounded-[2rem] border border-black/5 bg-white/70 p-6 shadow-sm dark:border-white/10 dark:bg-white/5">
        <label for="newsletter" class="text-sm font-semibold tracking-tight">Join the newsletter</label>
        <p class="mt-2 text-sm leading-7 text-zinc-600 dark:text-zinc-300">Product drops, editorial picks, and private launch access.</p>
        <input
          id="newsletter"
          type="email"
          placeholder="you@example.com"
          class="mt-5 h-12 w-full rounded-full border border-black/10 bg-white px-4 text-sm outline-none focus:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-500 dark:border-white/10 dark:bg-zinc-950"
        />
        <button type="button" class="mt-3 inline-flex h-12 w-full items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white dark:bg-white dark:text-zinc-950">
          Subscribe
        </button>
      </form>
    </div>

    <div class="mx-auto mt-10 max-w-7xl border-t border-black/5 pt-6 text-xs text-zinc-500 dark:border-white/10">
      © 2026 TEK. Built with SvelteKit and Tailwind.
    </div>
  </footer>
</div>
