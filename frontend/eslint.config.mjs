import next from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier/flat";
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
  prettier,
];
export default config;
