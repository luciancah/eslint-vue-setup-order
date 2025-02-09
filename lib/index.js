import declarationOrder from "./rules/declaration-order";

export default {
  rules: {
    "declaration-order": declarationOrder
  },
  configs: {
    recommended: {
      plugins: ["vue3-script-setup"],
      rules: {
        "vue3-script-setup/declaration-order": "error"
      }
    }
  }
};