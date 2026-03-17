import { error } from '@sveltejs/kit';
import { query, testDbConnection } from '$lib/server/db';

function buildSlug(product) {
	const direct = product?.slug ?? product?.product_slug ?? null;

	if (typeof direct === 'string' && direct.trim()) {
		return direct.trim();
	}

	const raw = String(product?.name ?? product?.title ?? product?.product_name ?? 'product');

	return raw
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'product';
}

export async function load({ params }) {
	try {
		await testDbConnection();
		const products = await query('SELECT * FROM products LIMIT 100');

		const product = products.find((entry) => buildSlug(entry) === params.slug);

		if (!product) {
			throw error(404, 'Product not found');
		}

		return {
			dbConnected: true,
			product
		};
	} catch (err) {
		if (err?.status) throw err;

		console.error('Product detail load failed:', err);
		throw error(500, err?.message ?? 'Failed to load product');
	}
}