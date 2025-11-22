import { mount } from 'svelte';
import './app.css'
import App from './App.svelte'

const app = mount(App, {
  // biome-ignore lint/style/noNonNullAssertion: we know the element exists
  target: document.getElementById('app')!
});

export default app
