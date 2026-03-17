import { query, testDbConnection } from '$lib/server/db';

export async function load(param) {
    try {
        await testDbConnection();
        try {
            const products = await query('SELECT * FROM products LIMIT 100');

            return {
                dbConnected: true,
                products,
                productsError: null
            };
        } catch (error) {
            console.error('Products query failed:', error);
            return {
                dbConnected: true,
                products: [],
                productsError: error?.message ?? 'Unknown query error'
            };
        }
    } catch (error) {
        console.error('Database connection failed:', error);
        return {
            dbConnected: false,
            products: [],
            productsError: error?.message ?? 'Unknown database error'
        };
    }
}
