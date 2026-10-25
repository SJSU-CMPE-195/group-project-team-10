const FADED_EDGE_OPACITY = 0.15

const isConnected = (edge, nodeId) => edge.source === nodeId || edge.target === nodeId

// which prerequisite arrows to draw given arrow toggle and the clicked course node
export function getVisibleEdges(edges, selectedNodeId, showAllArrows) {
  if (!selectedNodeId) return showAllArrows ? edges : []

  const visible = []
  for (const edge of edges) {
    if (isConnected(edge, selectedNodeId)) {
      visible.push({
        ...edge,
        zIndex: 1000,
        style: { ...edge.style, strokeWidth: 3 },
      })
    } else if (showAllArrows) {
      visible.push({
        ...edge,
        label: undefined,
        style: { ...edge.style, opacity: FADED_EDGE_OPACITY },
      })
    }
  }
  return visible
}

// nodes one arrow away from the selected node above or below along with the node itself
export function getConnectedNodeIds(edges, selectedNodeId) {
  const ids = new Set()
  for (const edge of edges) {
    if (isConnected(edge, selectedNodeId)) {
      ids.add(edge.source)
      ids.add(edge.target)
    }
  }
  return ids
}
