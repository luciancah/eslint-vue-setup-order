
# vue3-script-setup-custom-rules
- This package contains custom rules to enforce the order of declarations within `<script setup>` in Vue 3.

<br/>

## Concept

### Order
The declarations in `<script setup>` are sorted in the following fixed order:
```
"defineProps"
"defineEmits"
"defineOthers"
"plainVars"
"reactiveVars"
"composables"
"computed"
"watchers"
"lifecycle"
"functions"
"unknowns"
```

<br/>

### Grouping
Declarations that belong to the same group are grouped together without extra blank lines between them.<br/>
For example, all declarations starting with define (i.e., "defineProps", "defineEmits", and "defineOthers") are treated as one group.<br/>
Within this group, the declarations appear consecutively with a single line break separating each item.<br/>

Example:<br/>
If you have the following declarations (all belonging to the define group):

```js
const aa = defineProps<{ msg: string }>();

const emits = defineEmits();

const bb = defineExpose();
```

<br/>

They are grouped together in the final output as:
```js
const aa = defineProps<{ msg: string }>();
const emits = defineEmits();
const bb = defineExpose();
```
<br/>

Notice that there are only single newlines between each line.

<br/>

### Separation Between Groups
A single blank line (which corresponds to two consecutive newline characters) is inserted between different groups.<br/> 
This means that if you have a group of define declarations followed by another group (such as "plainVars"),<br/> 
there will be one blank line between these groups in the final sorted output.<br/> 

Example: Consider the following two groups:<br/> 
_Group 1 (define group):_
```js
const aa = defineProps<{ msg: string }>();
const emits = defineEmits();
```

<br/>

_Group 2 (plain variable declarations):_
```js
const hello = "Hello World!";
const count = ref(0);
```

<br/>

The final sorted output will be:
```js
const aa = defineProps<{ msg: string }>();
const emits = defineEmits();

const hello = "Hello World!";
const count = ref(0);
```
<br/>

Notice the blank line between the two groups, which helps visually separate different types of declarations.

<br/>

## How to Apply
### Method 1: Install via npm
```
npm i -D https://github.com/KumJungMin/eslint-vue-setup-order
```

<br/>

Then, add the ESLint plugin to your `eslint.config.js` (for ESLint v9 using the flat config pattern):
```js
// eslint.config.js
export default [
  {
    // Add the plugin object here:
    plugins: { "vue3-script-setup": eslintVueSetupRules },
    rules: { "vue3-script-setup/declaration-order": "error" },
  },
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueEslintParser,
      parserOptions: {
        parser: typescriptEslintParser,
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
  },
  // ... other settings
];
```

<br/>

### Method 2: Include the Rules File in Your Project
Alternatively, you can add the rule file directly to your project:

1. Add the file `rules/declaration-order.js` to your project directory:
```js
your-project/
├── src/
│   └── eslint-rules/
│       └── declaration-order.js
├── eslint.config.js
└── ...
```

2. Then, update your `eslint.config.js` to include the custom rule:
```js
import eslintVueSetupOrderRule from "./src/eslint-rules/declaration-order.js";
 
export default [
  {
    files: ["**/*.vue"],
    languageOptions: {
      parser: vueEslintParser,
      parserOptions: {
        parser: typescriptEslintParser,
        ecmaVersion: 2022,
        sourceType: "module",
      },
    },
    plugins: {
      "vue3-script-setup": {
        rules: {
          "declaration-order": eslintVueSetupOrderRule, // this!
        },
      },
    },
    rules: {
      "vue3-script-setup/declaration-order": "error",
    },
  },
  // ... other settings
];
```

<br/>

## Testing
When you run the command:
```
npx eslint .
```

<br/>

If the declaration order is incorrect, the rule will automatically fix it. For example:<br/>
**Before:**
```js
<script setup lang="ts">
import { onBeforeMount, ref } from "vue";

const count = ref(0);
const msg = ref("");
const aa = defineProps<{ msg: string }>();
const emits = defineEmits();
const hello = "Hello World!";

const changeMsg = () => {};
function handleClick() {
  emits("click");
}

onBeforeMount(() => {
  console.log("onBeforeMount");
});
</script>

<template>
</template>
```

<br/>

**After (fixed):**
```js
<script setup lang="ts">
import { onBeforeMount, ref } from "vue";

const aa = defineProps<{ msg: string }>();
const emits = defineEmits();

const hello = "Hello World!";

const count = ref(0);
const msg = ref("");

onBeforeMount(() => {
  console.log("onBeforeMount");
});

const changeMsg = () => {};
function handleClick() {
  emits("click");
}
</script>
```
