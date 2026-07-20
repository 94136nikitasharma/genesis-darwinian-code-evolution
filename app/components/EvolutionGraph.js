'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import styles from './EvolutionGraph.module.css';

export default function EvolutionGraph({ organisms, activeOrganismIds = [], generation, onSelectOrganism, selectedId }) {
  const svgRef = useRef(null);
  const simulationRef = useRef(null);
  const nodesRef = useRef([]);
  const linksRef = useRef([]);

  const updateGraph = useCallback(() => {
    if (!svgRef.current || !organisms || organisms.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Build the complete historical organism graph. Every parent reference is
    // retained so the visual is evidence of evolution, not a current-population
    // snapshot.
    const nodeMap = new Map();
    const newNodes = [];
    const newLinks = [];
    const activeIds = new Set(activeOrganismIds);
    const childrenByParent = new Map();

    organisms.forEach(org => {
      (org.parents || []).forEach(parentId => {
        if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
        childrenByParent.get(parentId).push(org.id);
      });
    });

    const lineageIds = new Set();
    if (selectedId) {
      const byId = new Map(organisms.map(org => [org.id, org]));
      const visitedAncestors = new Set();
      const visitedDescendants = new Set();
      const visitAncestors = (id) => {
        if (visitedAncestors.has(id)) return;
        visitedAncestors.add(id);
        lineageIds.add(id);
        (byId.get(id)?.parents || []).forEach(visitAncestors);
      };
      const visitDescendants = (id) => {
        if (visitedDescendants.has(id)) return;
        visitedDescendants.add(id);
        lineageIds.add(id);
        (childrenByParent.get(id) || []).forEach(visitDescendants);
      };
      visitAncestors(selectedId);
      visitDescendants(selectedId);
    }

    organisms.forEach(org => {
      const existing = nodesRef.current.find(n => n.id === org.id);
      const node = {
        id: org.id,
        fitness: org.fitness || 0,
        correctness: org.correctness || 0,
        generation: org.generation,
        code: org.code,
        alive: activeIds.has(org.id),
        inLineage: !selectedId || lineageIds.has(org.id),
        operation: org.operation || 'initial',
        x: existing?.x || width / 2 + (Math.random() - 0.5) * 200,
        y: existing?.y || height / 2 + (Math.random() - 0.5) * 200,
        vx: existing?.vx || 0,
        vy: existing?.vy || 0,
      };
      newNodes.push(node);
      nodeMap.set(org.id, node);
    });

    // Create links from parent relationships
    organisms.forEach(org => {
      if (org.parents) {
        org.parents.forEach(parentId => {
          if (nodeMap.has(parentId)) {
            newLinks.push({
              source: parentId,
              target: org.id,
              generation: org.generation,
            });
          }
        });
      }
    });

    nodesRef.current = newNodes;
    linksRef.current = newLinks;

    // Update or create simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const simulation = d3.forceSimulation(newNodes)
      .force('link', d3.forceLink(newLinks).id(d => d.id).distance(72).strength(0.35))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.05))
      .force('collision', d3.forceCollide().radius(d => getRadius(d) + 4))
      .force('x', d3.forceX(width / 2).strength(0.02))
      .force('y', d3.forceY(height / 2).strength(0.02))
      .alphaDecay(0.02)
      .on('tick', ticked);

    simulationRef.current = simulation;

    // Clear and redraw
    svg.selectAll('*').remove();

    // Add definitions for gradients and filters
    const defs = svg.append('defs');

    // Glow filter
    const glow = defs.append('filter').attr('id', 'glow');
    glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
    const feMerge = glow.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

    // Strong glow for selected
    const glowStrong = defs.append('filter').attr('id', 'glow-strong');
    glowStrong.append('feGaussianBlur').attr('stdDeviation', '6').attr('result', 'coloredBlur');
    const feMerge2 = glowStrong.append('feMerge');
    feMerge2.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge2.append('feMergeNode').attr('in', 'SourceGraphic');

    const container = svg.append('g');

    // Links remain visible across generations; selected organisms emphasize their
    // complete ancestor/descendant path.
    const link = container.append('g')
      .selectAll('line')
      .data(newLinks)
      .join('line')
      .attr('class', styles.link)
      .attr('stroke', d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        const isLineageLink = !selectedId || (lineageIds.has(sourceId) && lineageIds.has(targetId));
        return isLineageLink ? 'rgba(0, 255, 136, 0.7)' : 'rgba(148, 163, 184, 0.12)';
      })
      .attr('stroke-width', d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        return selectedId && lineageIds.has(sourceId) && lineageIds.has(targetId) ? 2.4 : 1;
      });

    // Nodes
    const node = container.append('g')
      .selectAll('g')
      .data(newNodes)
      .join('g')
      .attr('class', styles.node)
      .attr('cursor', 'pointer')
      .attr('opacity', d => d.inLineage ? (d.alive ? 1 : 0.68) : 0.15)
      .on('click', (event, d) => {
        event.stopPropagation();
        onSelectOrganism?.(d.id);
      })
      .call(d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x; d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
      );

    // Create an inner group for CSS animations (so it doesn't fight D3 transform)
    const innerNode = node.append('g')
      .attr('class', styles.nodeInner)
      .style('animation-delay', () => `${Math.random() * 0.2}s`); // stagger birth

    // Outer glow circle (pulses if fitness > 0.8)
    innerNode.append('circle')
      .attr('r', d => getRadius(d) + 6)
      .attr('fill', d => getColor(d, 0.1))
      .attr('filter', d => d.id === selectedId ? 'url(#glow-strong)' : 'url(#glow)')
      .attr('class', d => d.fitness >= 0.8 ? styles.pulseGlow : '');

    // Main circle
    innerNode.append('circle')
      .attr('r', d => getRadius(d))
      .attr('fill', d => getColor(d, 0.8))
      .attr('stroke', d => d.id === selectedId ? '#fff' : getColor(d, 1))
      .attr('stroke-width', d => d.id === selectedId ? 2.5 : (d.alive ? 1.25 : 0.75));

    // Inner highlight
    innerNode.append('circle')
      .attr('r', d => getRadius(d) * 0.4)
      .attr('fill', d => getColor(d, 0.3))
      .attr('cy', d => -getRadius(d) * 0.2);

    // Fitness label
    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => getRadius(d) + 16)
      .attr('fill', d => d.fitness >= 0.8 ? 'rgba(0, 255, 136, 0.9)' : 'rgba(148, 163, 184, 0.7)')
      .attr('font-size', '10px')
      .attr('font-family', 'var(--font-mono)')
      .text(d => d.fitness > 0 ? d.fitness.toFixed(2) : '?');

    // Operation icon
    innerNode.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .attr('font-size', d => Math.max(8, getRadius(d) * 0.8) + 'px')
      .text(d => {
        if (d.operation === 'elite') return '👑';
        if (d.operation === 'crossover') return '🧬';
        if (d.operation === 'mutation') return '⚡';
        if (d.operation === 'novel') return '✨';
        return '';
      });

    function ticked() {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    }

    // Zoom
    const zoom = d3.zoom()
      .scaleExtent([0.3, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
      });

    svg.call(zoom);

  }, [organisms, activeOrganismIds, selectedId, onSelectOrganism]);

  useEffect(() => {
    updateGraph();
  }, [updateGraph]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => updateGraph();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateGraph]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <span className={styles.titleIcon}>🧫</span>
          Evolutionary Lineage
        </h3>
        <span className={styles.genBadge}>Gen {generation}</span>
      </div>
      <div className={styles.graphWrapper}>
        <svg ref={svgRef} className={styles.svg} />
        {(!organisms || organisms.length === 0) && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🧬</span>
            <p>No organisms yet. Start evolution to populate.</p>
          </div>
        )}
      </div>
      <div className={styles.legend}>
        <span className={styles.legendItem}><span style={{color: '#00ff88'}}>●</span> High fitness</span>
        <span className={styles.legendItem}><span style={{color: '#ffa502'}}>●</span> Medium</span>
        <span className={styles.legendItem}><span style={{color: '#ff4757'}}>●</span> Low fitness</span>
        <span className={styles.legendItem}>👑 Elite</span>
        <span className={styles.legendItem}>🧬 Crossover</span>
        <span className={styles.legendItem}>⚡ Mutation</span>
        <span className={styles.legendItem}>✨ Novel</span>
        {selectedId && <span className={styles.legendItem}>Selected lineage highlighted</span>}
      </div>
    </div>
  );
}

function getRadius(d) {
  const base = 12;
  const fitnessBonus = (d.fitness || 0) * 14;
  return base + fitnessBonus;
}

function getColor(d, alpha = 1) {
  const fitness = d.fitness || 0;
  // Red (0) → Orange (0.3) → Yellow (0.5) → Green (0.8) → Cyan (1.0)
  if (fitness >= 0.8) return `hsla(160, 90%, 55%, ${alpha})`;
  if (fitness >= 0.5) return `hsla(${80 + fitness * 100}, 85%, 55%, ${alpha})`;
  if (fitness >= 0.3) return `hsla(35, 90%, 55%, ${alpha})`;
  return `hsla(0, 80%, 55%, ${alpha})`;
}
