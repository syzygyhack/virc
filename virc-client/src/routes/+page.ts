import { redirect } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/api/auth';
import type { PageLoad } from './$types';

/**
 * Root route load function.
 * Redirects to /chat if the user has stored credentials, otherwise /login.
 */
export const load: PageLoad = () => {
	if (isAuthenticated()) {
		redirect(302, '/chat');
	}
	redirect(302, '/login');
};
