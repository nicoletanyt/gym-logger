import { defineConfig, mergeConfig } from "vitest/config";
import appConfig from "./vite.config";

export default mergeConfig(appConfig, defineConfig({
    test: { include: ["tests/frontend.test.ts"], environment: "node" },
}));
