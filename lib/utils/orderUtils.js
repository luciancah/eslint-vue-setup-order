import { getSection, extractLifecycleHookName, groupName } from "./astUtils.js"

/**
 * @param {object} params - { node, index, sourceCode, sectionOrder, lifecycleOrder }
 * @returns {object} { node, index, section, sortIndex, text, lifecycleSortIndex }
 * @description
 * 각 노드별로 섹션과 정렬 인덱스를 생성합니다.
 * 사용자가 전달한 sectionOrder 배열에 해당 섹션이 존재하면 그 인덱스를 사용하고,
 * 존재하지 않으면 sectionOrder.length (즉, 하단에 배치)로 지정합니다.
 * lifecycle 섹션인 경우, 추가로 lifecycleSortIndex를 부여합니다.
 */
export function createNodeWithSection({
  node,
  index,
  sourceCode,
  sectionOrder,
  lifecycleOrder,
}) {
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
 * @param {Array} nodesWithSection - 각 항목은 { node, index, section, sortIndex, text, lifecycleSortIndex } 구조입니다.
 * @returns {Array}
 * @description
 * 전체 노드를 sectionOrder에 따른 순서로 정렬합니다.
 * 같은 섹션 내에서는 원래 순서를 유지하되, lifecycle 그룹은 추가로 lifecycleSortIndex로 정렬합니다.
 */
export function sortNodes(nodesWithSection) {
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
export function groupNodes(sortedNodes) {
  const groups = [];
  let currentGroup = [];
  let currentGroupName =
    sortedNodes.length > 0 ? groupName(sortedNodes[0].section) : null;
  let groupRangeStart =
    sortedNodes.length > 0 ? sortedNodes[0].node.range[0] : null;
  let groupRangeEnd = null;

  for (const item of sortedNodes) {
    const itemGroupName = groupName(item.section);
    if (itemGroupName === currentGroupName) {
      if (groupRangeStart === null) {
        groupRangeStart = item.node.range[0];
      }
      groupRangeEnd = item.node.range[1];
      currentGroup.push(item);
    } else {
      groups.push({
        group: currentGroupName,
        items: currentGroup,
        range: [groupRangeStart, groupRangeEnd],
      });
      currentGroup = [item];
      currentGroupName = itemGroupName;
      groupRangeStart = item.node.range[0];
      groupRangeEnd = item.node.range[1];
    }
  }
  if (currentGroup.length > 0) {
    groups.push({
      group: currentGroupName,
      items: currentGroup,
      range: [groupRangeStart, groupRangeEnd],
    });
  }
  return groups;
}

/**
 * @param {Array} groups
 * @returns {string}
 * @description
 * 각 그룹 내 노드들은 "\n"으로 연결하고, 그룹 간에는 "\n\n"을 삽입한 최종 텍스트를 생성합니다.
 * 단, unknowns 그룹은 range 정보를 활용하여 원본 소스 코드에서 추출합니다.
 */
export function generateSortedText(groups, sourceCode) {
  return groups
    .map((group) => {
      let groupText;
      if (group.group === "unknowns" && group.range) {
        groupText = sourceCode.text.slice(group.range[0], group.range[1]);
      } else {
        groupText = group.items.map((item) => item.text).join("\n");
        groupText = normalizeNewlines(groupText);
      }
      return groupText;
    })
    .join("\n\n");
}

export function normalizeNewlines(text) {
  return text.replace(/\n\s*\n/g, "\n").trim();
}
