import adapter from '@sveltejs/adapter-auto';
import { vitePlugin as sveltekit } from '@sveltejs/vite-plugin-svelte';

export default {
  kit: {
    adapter: adapter()
  }
};
