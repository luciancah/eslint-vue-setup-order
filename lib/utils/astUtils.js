/**
 * @param {ASTNode} node
 * @returns {ASTNode}
 * @description
 * TSAsExpression 또는 TSTypeAssertion 노드를 풀어서 내부 표현식 노드를 반환합니다.
 */
export function unwrapTypeCast(node) {
  const isTSNode = (n) =>
    n.type === "TSAsExpression" || n.type === "TSTypeAssertion";
  while (node && isTSNode(node)) {
    node = node.expression;
  }
  return node;
}

/**
 * @param {ASTNode} node
 * @returns {string}
 * @description
 * AST 노드를 분석하여 해당 노드가 속하는 섹션(그룹)을 반환합니다.
 * ImportDeclaration은 제외하며, 조건에 맞는 섹션이 없으면 "unknowns"를 반환합니다.
 */
export function getSection(node) {
  if (node.type === "ImportDeclaration") return null;
  if (node.type === "ClassDeclaration") {
    return "class";
  }
  if (node.type === "TSTypeAliasDeclaration" || node.type === "TSInterfaceDeclaration") {
    return "type";
  }
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
 * @param {string} calleeName
 * @returns {string|null}
 * @description
 * CallExpression의 callee 이름에 따라 해당 섹션을 반환합니다.
 */
export function getCallExpressionSection(calleeName) {
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
 * @param {ASTNode} node
 * @returns {string|null}
 * @description
 * lifecycle 섹션에 해당하는 노드에서 호출된 훅 이름을 추출합니다.
 */
export function extractLifecycleHookName(node) {
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

/**
 * @param {Array} sectionOrder
 * @param {Array} defaultOrder - 유효성 검사를 위한 기본 순서 배열
 * @description 사용자가 전달한 sectionOrder 값이 유효한지 검사합니다.
 * @throws {Error} sectionOrder가 유효하지 않으면 예외를 발생시킵니다.
 */
export function validateSectionOrder(sectionOrder, defaultOrder) {
  if (!Array.isArray(sectionOrder)) {
    throw new Error(
      `Invalid "sectionOrder" option: Expected an array, but received ${typeof sectionOrder}.`
    );
  }

  for (const section of sectionOrder) {
    if (typeof section !== "string") {
      throw new Error(
        `Invalid "sectionOrder" option: Expected string values, but found ${typeof section}.`
      );
    }
    if (!defaultOrder.includes(section)) {
      throw new Error(
        `Invalid "sectionOrder" option: "${section}" is not a recognized section. Valid sections: ${defaultOrder.join(
          ", "
        )}`
      );
    }
  }
}

/**
 * @param {string} section
 * @returns {string}
 * @description
 * 섹션 이름을 그룹 이름으로 변환합니다.
 * define* 관련 항목은 하나의 그룹("define")으로 합칩니다.
 */
export function groupName(section) {
  const defineGroup = ["defineProps", "defineEmits", "defineOthers"];
  return defineGroup.includes(section) ? "define" : section;
}
