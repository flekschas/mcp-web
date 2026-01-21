import DefaultTheme from 'vitepress/theme';
import './style.css';
import Layout from './Layout.vue';

export default {
  extends: DefaultTheme,
  Layout: Layout,
}
