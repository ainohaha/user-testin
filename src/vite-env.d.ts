/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_PROJECT_ID: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_ADMIN_PASSWORD: string;
    readonly VITE_TEST_TITLE: string;
    readonly VITE_PROTOTYPE_URL: string;
    readonly VITE_ENABLE_AI_ANALYSIS: string;
    readonly VITE_ENABLE_SCREEN_RECORDING: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
