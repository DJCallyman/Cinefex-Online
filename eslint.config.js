import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                document: "readonly",
                window: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                fetch: "readonly",
                HTMLElement: "readonly",
                navigator: "readonly",
                history: "readonly",
                self: "readonly",
                caches: "readonly",
                URL: "readonly",
                Response: "readonly",
                Promise: "readonly",
            },
        },
        rules: {
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "no-console": ["warn", { allow: ["error", "warn"] }],
            eqeqeq: ["error", "always"],
            "prefer-const": "error",
            "no-var": "error",
        },
    },
];
