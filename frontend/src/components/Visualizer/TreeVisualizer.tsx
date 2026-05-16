// frontend/src/components/Visualizer/TreeVisualizer.tsx

import { useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import { motion } from 'framer-motion'

interface TreeNode {
  val: number | string
  left?: TreeNode | null
  right?: TreeNode | null
}

interface TreeVisualizerProps {
  name: string
  data: TreeNode
  highlightNodes?: (number | string)[]
}

interface FlatNode {
  id: string
  val: number | string
  x: number
  y: number
  parentId?: string
  highlighted: boolean
}

export function TreeVisualizer({
  name, data, highlightNodes = []
}: TreeVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  // Flatten tree for rendering
  const { nodes, edges } = useMemo(() => {
    const flatNodes: FlatNode[] = []
    const flatEdges: { from: string; to: string }[] = []

    function traverse(
      node: TreeNode | null | undefined,
      x: number, y: number,
      spread: number,
      parentId?: string,
      id: string = '0'
    ) {
      if (!node) return

      flatNodes.push({
        id,
        val: node.val,
        x,
        y,
        parentId,
        highlighted: highlightNodes.includes(node.val),
      })

      if (parentId) {
        flatEdges.push({ from: parentId, to: id })
      }

      if (node.left) {
        traverse(node.left, x - spread, y + 60, spread * 0.6, id, id + 'L')
      }
      if (node.right) {
        traverse(node.right, x + spread, y + 60, spread * 0.6, id, id + 'R')
      }
    }

    traverse(data, 250, 40, 100)

    return { nodes: flatNodes, edges: flatEdges }
  }, [data, highlightNodes])

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-300">{name}</span>
        <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 
                        rounded-full">
          Binary Tree
        </span>
      </div>

      <svg
        ref={svgRef}
        width={500}
        height={300}
        className="overflow-visible"
      >
        {/* Edges */}
        {edges.map((edge) => {
          const fromNode = nodes.find(n => n.id === edge.from)
          const toNode = nodes.find(n => n.id === edge.to)

          if (!fromNode || !toNode) return null

          return (
            <motion.line
              key={`${edge.from}-${edge.to}`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              x1={fromNode.x}
              y1={fromNode.y}
              x2={toNode.x}
              y2={toNode.y}
              stroke="#4B5563"
              strokeWidth={2}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map((node) => (
          <motion.g
            key={node.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={20}
              fill={node.highlighted ? '#EAB308' : '#1F2937'}
              stroke={node.highlighted ? '#FDE047' : '#6B7280'}
              strokeWidth={2}
            />
            <text
              x={node.x}
              y={node.y + 5}
              textAnchor="middle"
              fill={node.highlighted ? '#000' : '#E5E7EB'}
              fontSize={12}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {node.val}
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  )
}