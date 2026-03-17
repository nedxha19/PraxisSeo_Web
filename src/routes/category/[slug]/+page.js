import { error } from '@sveltejs/kit';

const validCategories = ['phones', 'laptops', 'audio', 'wearables'];

export function load({ params }) {
	if (!validCategories.includes(params.slug)) {
		throw error(404, 'Category not found');
	}

	return {
		category: params.slug
	};
}