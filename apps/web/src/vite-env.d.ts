/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_PUBLIC_SITE_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
