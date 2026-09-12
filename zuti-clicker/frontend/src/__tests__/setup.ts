import { config } from "@vue/test-utils";
import { i18n } from "@/i18n";

// Registers the real i18n instance globally so component specs render actual
// translated strings rather than raw keys.
config.global.plugins = [i18n];
