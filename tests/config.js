import vueEslintParser from "vue-eslint-parser";

const config = {
  languageOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    parser: vueEslintParser,
  }
}

export default config;