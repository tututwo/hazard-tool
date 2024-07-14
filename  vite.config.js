import { defineConfig } from "vite";
import dsv from "@rollup/plugin-dsv";
import content from '@originjs/vite-plugin-content'
export default defineConfig({
  plugins: [    content()],
  assetsInclude: ["**/*.csv"],
});
