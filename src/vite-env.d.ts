/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly GEMINI_API_KEY?: string;
  readonly VITE_GAS_WEBAPP_URL?: string;
  readonly VITE_GAS_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
