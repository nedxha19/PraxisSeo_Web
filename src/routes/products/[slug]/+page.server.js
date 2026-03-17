import { error } from '@sveltejs/kit';
import { query, testDbConnection } from '$lib/server/db';

function matchesProductSlug(product, slug) {
	return String(product?.slug ?? product?.product_slug ?? '') === slug;
}

export async function load({ params }) {
	try {
		await testDbConnection();
		const products = await query('SELECT * FROM products  LIMIT 100');
		const product = products.find((entry) => matchesProductSlug(entry, params.slug));

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
