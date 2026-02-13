import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.test.ts']
	},
	server: {
		proxy: {
			'/ws': {
				target: 'http://localhost:8097',
				ws: true,
				rewriteWsOrigin: true
			},
			'/api': {
				target: 'http://localhost:8080'
			},
			'/.well-known': {
				target: 'http://localhost:8080'
			}
		}
	}
});
