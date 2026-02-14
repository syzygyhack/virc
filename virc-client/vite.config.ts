import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.test.ts']
	},
	build: {
		// Target modern browsers only — Tauri WebViews are always recent
		target: 'esnext',
		// Inline small assets to reduce HTTP requests (threshold in bytes)
		assetsInlineLimit: 4096,
		// Enable CSS code-splitting so each route loads only its styles
		cssCodeSplit: true,
		rollupOptions: {
			output: {
				// Split livekit into its own chunk so app code changes don't bust its cache.
				// Uses a function form to avoid conflict with SvelteKit's external resolution
				// (the object form fails when the module is also resolved as external).
				manualChunks(id) {
					if (id.includes('node_modules/livekit-client')) {
						return 'livekit';
					}
				}
			}
		}
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
