import {
  DEFAULT_SECTION_ORDER,
  DEFAULT_LIFECYCLE_ORDER,
} from "../constants.js";
import {
  createNodeWithSection,
  sortNodes,
  groupNodes,
  generateSortedText,
} from "../utils/orderUtils.js";
import { validateSectionOrder } from "../utils/astUtils.js";

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
          (child) => child.type !== "ImportDeclaration"
        );
        if (nonImportNodes.length === 0) return;

        const nodesWithSection = nonImportNodes.map((child, index) =>
          createNodeWithSection({
            node: child,
            index,
            sourceCode,
            sectionOrder,
            lifecycleOrder,
          })
        );

        const sortedNodes = sortNodes(nodesWithSection);
        const groups = groupNodes(sortedNodes);
        const sortedText = generateSortedText(groups);
        const fixRange = [
          nonImportNodes[0].range[0],
          nonImportNodes[nonImportNodes.length - 1].range[1],
        ];
        const originalText = sourceCode.text.slice(fixRange[0], fixRange[1]);

        if (originalText === sortedText) return;

        context.report({
          node: nonImportNodes[0],
          message:
            "Vue 3 <script setup> 내 선언 순서가 올바르지 않습니다. 자동 수정(fix)을 적용합니다.",
          fix(fixer) {
            console.log("\nGenerated Output:");
            console.log("================");
            console.log(sortedText);
            console.log("================\n");

            return fixer.replaceTextRange(fixRange, sortedText);
          },
        });
      },
    };
  },
};
