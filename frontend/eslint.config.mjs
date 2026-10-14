import next from "eslint-config-next/core-web-vitals";
const config = [
  ...next,
  { ignores: [".next/**", ".npm-cache/**", "next-env.d.ts"] },
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
    },
  },
];
export default config;
