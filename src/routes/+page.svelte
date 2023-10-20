<script lang="ts">
	import { onMount } from 'svelte';
	import { client } from './api/APIClient';

	onMount(async () => {
		const res = await client.Service.handle('asdf');
		console.log(res.message.getDate());
	});
</script>
