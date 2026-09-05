import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// In ESLint flat config, a config object's rules are resolved against the
// `plugins` of that SAME object — rules overridden below therefore need the
// plugin instances registered here as well. Reuse the exact instances that
// eslint-config-next registered: re-importing "@next/eslint-plugin-next"
// yields a different instance and ESLint rejects the redefinition.
const nextConfigs = [
  ...(Array.isArray(nextCoreWebVitals) ? nextCoreWebVitals : [nextCoreWebVitals]),
  ...(Array.isArray(nextTypescript) ? nextTypescript : [nextTypescript]),
];

const plugins = {};
for (const config of nextConfigs) {
  Object.assign(plugins, config.plugins ?? {});
}

const eslintConfig = [...nextCoreWebVitals, ...nextTypescript, {
  plugins,
  rules: {
    // TypeScript rules — enabled as warnings to avoid breaking the build
    // while surfacing issues for gradual cleanup
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/no-non-null-assertion": "warn",
    "@typescript-eslint/ban-ts-comment": "warn",
    "@typescript-eslint/prefer-as-const": "warn",

    // React rules
    "react-hooks/exhaustive-deps": "warn",
    "react-hooks/purity": "warn",
    // React-Compiler-derived rules ship as "error" in eslint-config-next 16.
    // They flag patterns that are legal React today; downgrade to warnings so
    // `next build` and CI are not blocked while the ~500 findings get addressed.
    "react-hooks/refs": "warn",
    "react-hooks/set-state-in-effect": "warn",
    "react-hooks/immutability": "warn",
    "react-hooks/preserve-manual-memoization": "warn",
    "react-hooks/use-memo": "warn",
    "react/no-unescaped-entities": "warn",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",

    // Next.js rules
    "@next/next/no-img-element": "off",
    "@next/next/no-html-link-for-pages": "off",

    // General JavaScript rules
    "prefer-const": "warn",
    "no-unused-vars": "off",
    "no-console": "warn",
    "no-debugger": "error",
    "no-empty": "warn",
    "no-irregular-whitespace": "warn",
    "no-case-declarations": "warn",
    "no-fallthrough": "warn",
    "no-mixed-spaces-and-tabs": "off",
    "no-redeclare": "off",
    "no-undef": "off",
    "no-unreachable": "warn",
    "no-useless-escape": "warn",
  },
}, {
  ignores: ["node_modules/**", ".next/**", "out/**", "build/**", "next-env.d.ts", "examples/**", "skills"]
}];

export default eslintConfig;
