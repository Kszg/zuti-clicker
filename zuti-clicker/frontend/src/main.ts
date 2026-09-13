import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { i18n } from "./i18n";
// Self-hosted (not a Google Fonts <link>): ships in the Docker image, no
// third-party request, works offline. --font-sans in base.css names
// 'Inter Variable' to match this package's family name.
import "@fontsource-variable/inter";
import "@/assets/styles/base.css";
import "@/assets/styles/animations.css";

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);

app.mount("#app");
