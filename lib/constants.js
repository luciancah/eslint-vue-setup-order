/**
 * @type {ReadonlyArray<string>}
 * @description
 * Vue 3 <script setup>에서 선언 순서를 강제합니다.
 * define* 관련 항목은 하나("define")로 합쳐집니다.
 */
export const DEFAULT_SECTION_ORDER = Object.freeze([
  "type",
  "defineProps",
  "defineEmits",
  "defineOthers",
  "class",
  "plainVars",
  "reactiveVars",
  "composables",
  "computed",
  "watchers",
  "lifecycle",
  "unknowns",
  "functions",
]);

/**
 * @type {Readonly<{ [key: string]: number }>}
 * @description
 * lifecycle 섹션 내에서 훅 이름에 따른 정렬 순서를 정의합니다.
 */
export const DEFAULT_LIFECYCLE_ORDER = Object.freeze({
  onBeforeMount: 0,
  onMounted: 1,
  onBeforeUpdate: 2,
  onUpdated: 3,
  onBeforeUnmount: 4,
  onUnmounted: 5,
  onErrorCaptured: 6,
  onRenderTracked: 7,
  onRenderTriggered: 8,
  onActivated: 9,
  onDeactivated: 10,
  onServerPrefetch: 11,
});
