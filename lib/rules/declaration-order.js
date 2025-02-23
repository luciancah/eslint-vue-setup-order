/**
 * @type {ReadonlyArray<string>}
 * @description
 * Vue 3 <script setup>에서 선언 순서를 강제합니다.
 * define* 관련 항목은 하나("define")로 합쳐집니다.
 */
const DEFAULT_SECTION_ORDER = Object.freeze([
  "defineProps",
  "defineEmits",
  "defineOthers",
  "plainVars",
  "reactiveVars",
  "composables",
  "computed",
  "watchers",
  "lifecycle",
  "functions",
  "unknowns",
]);

/**
 * @type {Readonly<{ [key: string]: number }>}
 * @description
 * lifecycle 섹션 내에서 훅 이름에 따른 정렬 순서를 정의합니다.
 */
const DEFAULT_LIFECYCLE_ORDER = Object.freeze({
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

export default {
  meta: {
    type: "layout",
    docs: {
      description: `Vue 3 <script setup>에서 선언 순서를 강제합니다.`,
      category: "Stylistic Issues",
      recommended: true,
    },
    fixable: "code",
    schema: [
      {
        type: "object",
        properties: {
          sectionOrder: {
            type: "array",
            items: { type: "string" },
          },
          lifecycleOrder: {
            type: "object",
            additionalProperties: { type: "number" },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const options = context.options[0] || {};
    const sectionOrder = options.sectionOrder || DEFAULT_SECTION_ORDER;
    const lifecycleOrder = options.lifecycleOrder || DEFAULT_LIFECYCLE_ORDER;

    validateSectionOrder(sectionOrder);

    return {
      "Program:exit"(node) {
        const sourceCode = context.getSourceCode();

        // ImportDeclaration은 제외합니다.
        const nonImportNodes = node.body.filter(
          (child) => child.type !== "ImportDeclaration",
        );
        if (nonImportNodes.length === 0) return;

        const nodesWithSection = nonImportNodes.map((child, index) =>
          createNodeWithSection({
            node: child,
            index,
            sourceCode,
            sectionOrder,
            lifecycleOrder,
          }),
        );

        const sortedNodes = sortNodes(nodesWithSection);
        const groups = groupNodes(sortedNodes);
        const sortedText = generateSortedText(groups);
        const fixRange = [
          nonImportNodes[0].range[0],
          nonImportNodes[nonImportNodes.length - 1].range[1],
        ];
        const originalText = sourceCode.text.slice(fixRange[0], fixRange[1]);

        if (normalizeNewlines(originalText) === normalizeNewlines(sortedText))
          return;

        context.report({
          node: nonImportNodes[0],
          message:
            "Vue 3 <script setup> 내 선언 순서가 올바르지 않습니다. 자동 수정(fix)을 적용합니다.",
          fix(fixer) {
            return fixer.replaceTextRange(fixRange, sortedText);
          },
        });
      },
    };
  },
};

/**
 * @param {object} params - { node, index, sourceCode, sectionOrder, lifecycleOrder }
 * @returns {object} { node, index, section, sortIndex, text, lifecycleSortIndex }
 * @description
 * 각 노드별로 섹션과 정렬 인덱스를 생성합니다.
 * 사용자가 전달한 sectionOrder 배열에 해당 섹션이 존재하면 그 인덱스를 사용하고,
 * 존재하지 않으면 sectionOrder.length (즉, 하단에 배치)로 지정합니다.
 * lifecycle 섹션인 경우, 추가로 lifecycleSortIndex를 부여합니다.
 */
function createNodeWithSection({ node, index, sourceCode, sectionOrder, lifecycleOrder }) {
  const section = getSection(node);
  const text = sourceCode.getText(node);
  const idx = sectionOrder.indexOf(section);
  const sortIndex = idx !== -1 ? idx : sectionOrder.length;
  let lifecycleSortIndex;
  if (section === "lifecycle") {
    const hookName = extractLifecycleHookName(node);
    if (hookName && lifecycleOrder.hasOwnProperty(hookName)) {
      lifecycleSortIndex = lifecycleOrder[hookName];
    } else {
      lifecycleSortIndex = Object.keys(lifecycleOrder).length;
    }
  }
  return { node, index, section, sortIndex, text, lifecycleSortIndex };
}

/**
 * @param {ASTNode} node
 * @returns {string}
 * @description
 * AST 노드를 분석하여 해당 노드가 속하는 섹션(그룹)을 반환합니다.
 * ImportDeclaration은 제외하며, 조건에 맞는 섹션이 없으면 "unknowns"를 반환합니다.
 */
function getSection(node) {
  if (node.type === "ImportDeclaration") return null;

  if (node.type === "VariableDeclaration") {
    const declaration = node.declarations[0];
    if (declaration && declaration.init) {
      const initNode = unwrapTypeCast(declaration.init);
      if (
        initNode.type === "ArrowFunctionExpression" ||
        initNode.type === "FunctionExpression"
      ) {
        return "functions";
      }
      if (
        initNode.type === "CallExpression" &&
        initNode.callee.type === "Identifier"
      ) {
        const section = getCallExpressionSection(initNode.callee.name);
        if (section) return section;
      }
    }
    return "plainVars";
  }

  if (
    node.type === "ExpressionStatement" &&
    node.expression.type === "CallExpression"
  ) {
    if (node.expression.callee.type === "Identifier") {
      const section = getCallExpressionSection(node.expression.callee.name);
      if (section) return section;
    }
  }

  if (node.type === "FunctionDeclaration") return "functions";
  return "unknowns";
}

/**
 * @param {ASTNode} node
 * @returns {ASTNode}
 * @description
 * TSAsExpression 또는 TSTypeAssertion 노드를 풀어서 내부 표현식 노드를 반환합니다.
 */
function unwrapTypeCast(node) {
  const isTSNode = (n) =>
    n.type === "TSAsExpression" || n.type === "TSTypeAssertion";
  while (node && isTSNode(node)) {
    node = node.expression;
  }
  return node;
}

/**
 * @param {string} calleeName
 * @returns {string|null}
 * @description
 * CallExpression의 callee 이름에 따라 해당 섹션을 반환합니다.
 */
function getCallExpressionSection(calleeName) {
  if (calleeName === "defineProps") return "defineProps";
  if (calleeName === "defineEmits") return "defineEmits";

  const defineInterfaceList = [
    "defineModel",
    "defineExpose",
    "defineOptions",
    "defineSlots",
  ];
  if (defineInterfaceList.includes(calleeName)) return "defineOthers";

  const declareList = [
    "ref",
    "reactive",
    "shallowRef",
    "shallowReactive",
    "shallowReadonly",
    "markRaw",
  ];
  if (declareList.includes(calleeName)) return "reactiveVars";

  if (calleeName.startsWith("use")) return "composables";
  if (calleeName === "computed") return "computed";
  if (calleeName === "watch") return "watchers";

  const lifecycleList = [
    "onBeforeMount",
    "onMounted",
    "onBeforeUpdate",
    "onUpdated",
    "onBeforeUnmount",
    "onUnmounted",
    "onErrorCaptured",
    "onRenderTracked",
    "onRenderTriggered",
    "onActivated",
    "onDeactivated",
    "onServerPrefetch",
  ];
  if (lifecycleList.includes(calleeName)) return "lifecycle";

  return null;
}

/**
 * @param {Array} groups
 * @returns {string}
 * @description
 * 각 그룹 내 노드들은 "\n"으로 연결하고, 그룹 간에는 "\n\n"을 삽입한 최종 텍스트를 생성합니다.
 */
function generateSortedText(groups) {
  return groups
    .map((group) => group.items.map((item) => item.text).join("\n"))
    .join("\n\n");
}

function normalizeNewlines(text) {
  return text.replace(/\n\s*\n/g, "\n").trim();
}

/**
 * @param {Array} nodesWithSection - 각 항목은 { node, index, section, sortIndex, text, lifecycleSortIndex } 구조입니다.
 * @returns {Array}
 * @description
 * 전체 노드를 sectionOrder에 따른 순서로 정렬합니다.
 * 같은 섹션 내에서는 원래 순서를 유지하되, lifecycle 그룹은 추가로 lifecycleSortIndex로 정렬합니다.
 */
function sortNodes(nodesWithSection) {
  return nodesWithSection.slice().sort((a, b) => {
    if (a.sortIndex !== b.sortIndex) return a.sortIndex - b.sortIndex;
    if (a.section === "lifecycle" && b.section === "lifecycle") {
      if (
        typeof a.lifecycleSortIndex === "number" &&
        typeof b.lifecycleSortIndex === "number"
      ) {
        return a.lifecycleSortIndex - b.lifecycleSortIndex;
      }
    }
    return a.index - b.index;
  });
}

/**
 * @param {Array} sortedNodes
 * @returns {Array}
 * @description
 * 정렬된 노드들을 그룹별로 묶습니다. (define* 관련 항목은 하나의 그룹으로 합쳐짐)
 */
function groupNodes(sortedNodes) {
  const groups = [];
  let currentGroup = [];
  let currentGroupName =
    sortedNodes.length > 0 ? groupName(sortedNodes[0].section) : null;

  for (const item of sortedNodes) {
    const itemGroupName = groupName(item.section);
    if (itemGroupName === currentGroupName) {
      currentGroup.push(item);
    } else {
      groups.push({ group: currentGroupName, items: currentGroup });
      currentGroup = [item];
      currentGroupName = itemGroupName;
    }
  }
  if (currentGroup.length > 0) {
    groups.push({ group: currentGroupName, items: currentGroup });
  }
  return groups;
}

/**
 * @param {string} section
 * @returns {string}
 * @description
 * 섹션 이름을 그룹 이름으로 변환합니다.
 * define* 관련 항목은 하나의 그룹("define")으로 합칩니다.
 */
function groupName(section) {
  const defineGroup = ["defineProps", "defineEmits", "defineOthers"];
  return defineGroup.includes(section) ? "define" : section;
}

/**
 * @param {Array} sectionOrder
 * @description 사용자가 전달한 sectionOrder 값이 유효한지 검사합니다.
 * @throws {Error} sectionOrder가 유효하지 않으면 예외를 발생시킵니다.
 */
function validateSectionOrder(sectionOrder) {
  if (!Array.isArray(sectionOrder)) {
    throw new Error(
      `Invalid "sectionOrder" option: Expected an array, but received ${typeof sectionOrder}.`,
    );
  }

  for (const section of sectionOrder) {
    if (typeof section !== "string") {
      throw new Error(
        `Invalid "sectionOrder" option: Expected string values, but found ${typeof section}.`,
      );
    }
    if (!DEFAULT_SECTION_ORDER.includes(section)) {
      throw new Error(
        `Invalid "sectionOrder" option: "${section}" is not a recognized section. Valid sections: ${DEFAULT_SECTION_ORDER.join(
          ", ",
        )}`,
      );
    }
  }
}

/**
 * @param {ASTNode} node
 * @returns {string|null}
 * @description
 * lifecycle 섹션에 해당하는 노드에서 호출된 훅 이름을 추출합니다.
 */
function extractLifecycleHookName(node) {
  if (node.type === "VariableDeclaration") {
    const declaration = node.declarations[0];
    if (declaration && declaration.init) {
      const initNode = unwrapTypeCast(declaration.init);
      if (
        initNode.type === "CallExpression" &&
        initNode.callee.type === "Identifier"
      ) {
        return initNode.callee.name;
      }
    }
  } else if (
    node.type === "ExpressionStatement" &&
    node.expression.type === "CallExpression" &&
    node.expression.callee.type === "Identifier"
  ) {
    return node.expression.callee.name;
  }
  return null;
}
