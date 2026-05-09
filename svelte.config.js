import adapter from '@sveltejs/adapter-auto';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		// Pages are SPA (ssr=false in +layout.ts) but +server.ts API routes still
		// run on the server — that's where all provider calls get proxied through.
		adapter: adapter()
	}
};

export default config;
