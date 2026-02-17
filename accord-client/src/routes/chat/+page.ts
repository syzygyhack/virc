import { redirect } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/api/auth';
import type { PageLoad } from './$types';

/**
 * Chat page load function.
 * Redirects to /login if the user is not authenticated.
 */
export const load: PageLoad = () => {
	if (!isAuthenticated()) {
		redirect(302, '/login');
	}
};
