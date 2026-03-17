import { query } from '$lib/server/db';

function escapeXml(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function getSlug(product) {
	const value = product?.slug ?? product?.product_slug ?? null;
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed || null;
}

export async function GET({ url }) {
	try {
		const baseUrl = url.origin;
		const products = await query('SELECT * FROM products LIMIT 1000');

		const productUrls = products
			.map((product) => getSlug(product))
			.filter(Boolean)
			.map((slug) => `${baseUrl}/products/${encodeURIComponent(slug)}`);

		const allUrls = [`${baseUrl}/`, ...new Set(productUrls)];
		const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls.map((loc) => `<url><loc>${escapeXml(loc)}</loc></url>`).join('\n')}
</urlset>`;

		return new Response(xml, {
			headers: {
				'Content-Type': 'application/xml; charset=utf-8',
				'Cache-Control': 'max-age=0, s-maxage=3600'
			}
		});
	} catch (error) {
		console.error('Sitemap generation failed:', error);
		return new Response('Failed to generate sitemap', { status: 500 });
	}
}
