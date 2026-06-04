import type { CapacitorConfig } from "@capacitor/cli";

const PROD_URL = process.env["NARRAVERSE_URL"] ?? "https://xujing-narraverse-app.vercel.app";

const config: CapacitorConfig = {
  appId: "ai.narraverse.app",
  appName: "Ðð¾³",
  webDir: "out",

  // Production: load from deployed URL
  // Set NARRAVERSE_URL env var to override
  server: {
    url: PROD_URL,
    cleartext: false,
    allowNavigation: ["github.com", "api.github.com"],
  },

  android: {
    allowMixedContent: false,
  },

  plugins: {
    Keyboard: {
      resize: "body",
      style: "dark",
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#fffaf5",
    },
  },
};

export default config;
