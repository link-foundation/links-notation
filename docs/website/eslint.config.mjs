export default [
    {
        ignores: ["dist/**", "node_modules/**"]
    },
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                // vite.config.js runs in Node, index.html's script in the browser.
                URL: "readonly",
                process: "readonly",
                document: "readonly",
                window: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                fetch: "readonly",
                IntersectionObserver: "readonly",
                MutationObserver: "readonly",
                // Replaced at build time by vite.config.js.
                __LIBRARY_VERSION__: "readonly"
            }
        },
        rules: {
            "no-undef": "error",
            "no-unused-vars": "warn"
        }
    }
];