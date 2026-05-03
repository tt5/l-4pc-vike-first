import vikeSolid from "vike-solid/vite";
/// <reference types="@batijs/core/types" />

import vike from "vike/plugin";
import { defineConfig } from "vite";
import { engineWebSocketPlugin } from "./vite-engine-plugin";

export default defineConfig({
  plugins: [vike(), vikeSolid(), engineWebSocketPlugin()],
  ssr: {
    external: ['jsonwebtoken'],
  },
});
