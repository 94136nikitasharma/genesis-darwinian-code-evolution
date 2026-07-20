const acorn = require('acorn');
const astring = require('astring');

/**
 * Traverses an AST and collects all nodes of a specific type.
 */
function collectNodes(node, targetType, collection = []) {
  if (!node || typeof node !== 'object') return collection;

  if (node.type === targetType) {
    collection.push(node);
  }

  for (const key in node) {
    if (Array.isArray(node[key])) {
      node[key].forEach(child => collectNodes(child, targetType, collection));
    } else if (typeof node[key] === 'object') {
      collectNodes(node[key], targetType, collection);
    }
  }

  return collection;
}

/**
 * Performs AST-aware crossover between two parent code strings.
 * We find compatible nodes (e.g., BlockStatements) and swap them.
 */
export function performCrossover(code1, code2) {
  try {
    const ast1 = acorn.parse(code1, { ecmaVersion: 2022, sourceType: 'module' });
    const ast2 = acorn.parse(code2, { ecmaVersion: 2022, sourceType: 'module' });

    // Target node types for swapping (BlockStatement is safest for logic swapping)
    const targetTypes = ['BlockStatement', 'IfStatement', 'ForStatement', 'ReturnStatement'];

    // Only choose a node type that both parents actually contain. Selecting a
    // missing type used to silently return parent 1 while reporting crossover.
    const compatibleTypes = targetTypes
      .map((type) => ({
        type,
        nodes1: collectNodes(ast1, type),
        nodes2: collectNodes(ast2, type),
      }))
      .filter(({ nodes1, nodes2 }) => nodes1.length > 0 && nodes2.length > 0);

    if (compatibleTypes.length === 0) {
      throw new Error('NO_COMPATIBLE_AST_NODES');
    }

    const { nodes1, nodes2 } = compatibleTypes[
      Math.floor(Math.random() * compatibleTypes.length)
    ];

    // Select random nodes to swap
    const n1Index = Math.floor(Math.random() * nodes1.length);
    const n2Index = Math.floor(Math.random() * nodes2.length);
    const nodeToReplace = nodes1[n1Index];
    const replacementNode = nodes2[n2Index];

    // Deep copy the replacement node to avoid modifying ast2
    const replacementCopy = JSON.parse(JSON.stringify(replacementNode));

    // Perform the swap (mutate ast1)
    // We clear out the existing keys and assign the new ones
    for (const key in nodeToReplace) {
      if (key !== 'type') delete nodeToReplace[key];
    }
    for (const key in replacementCopy) {
      nodeToReplace[key] = replacementCopy[key];
    }

    // Generate the new code
    const newCode = astring.generate(ast1);

    // Safety check: parse the generated code to ensure we didn't create a syntax error
    acorn.parse(newCode, { ecmaVersion: 2022, sourceType: 'module' });

    return newCode;
  } catch (err) {
    // If AST parsing, swapping, or regeneration fails (Syntax Error), throw so LLM can repair
    throw new Error('AST_CROSSOVER_FAILED');
  }
}
