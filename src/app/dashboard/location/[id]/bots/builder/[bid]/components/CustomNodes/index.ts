import StandardNode from "./StandardNode";
import ConditionNode from "./ConditionNode";

export const NodeTypes = {
  standard: StandardNode,
  extraction: StandardNode, // Use standard node for extraction
  booking: StandardNode,    // Use standard node for booking
  delay: StandardNode,      // Use standard node for delay
  condition: ConditionNode,
};

export { StandardNode, ConditionNode };
