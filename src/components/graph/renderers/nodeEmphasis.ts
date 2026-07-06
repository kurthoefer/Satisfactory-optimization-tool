import * as d3 from 'd3';
import type { GraphNode, Product } from '@/types';
import { NODE_STYLES } from '../graphStyles';
import { pinnedStore } from '@/lib/pinned';
import getProductImagePath from '@/utils/imageHelper';
import type { NodeSelection } from './drawNodes';

const PINNED_SCALE = 1.6; // pinned: enlarged
const TARGET_SCALE = 2.5; // target: clearly the largest

type Emphasis = 'none' | 'pinned' | 'target';

/**
 * Renders node emphasis: pinned and target nodes enlarge and fill with their
 * thumbnail via an objectBoundingBox <pattern>, so the node's OWN shape clips
 * it — product circles stay round, recipe squares stay square. The pattern
 * carries a solid backing rect behind the image, so the base color shows
 * through icon transparency (and while the image loads).
 *
 * Precedence: target > pinned > none (a pinned target still reads as target).
 * Returns paint() — call once initially and on every pin change. Event-driven,
 * never per-frame; no simulation involvement.
 */
export function createEmphasisPainter(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  nodeSelection: NodeSelection,
  selectedProduct: Product | null,
): () => void {
  const defs = svg.append('defs').attr('class', 'node-img-defs');
  const created = new Set<string>();
  const targetId = selectedProduct?.className ?? null;

  // Lazily create (and cache) one image pattern per node id: backing color
  // first, thumbnail on top.
  const patternFill = (id: string, backing: string): string => {
    if (!created.has(id)) {
      created.add(id);
      const pattern = defs
        .append('pattern')
        .attr('id', `img-${id}`)
        .attr('patternContentUnits', 'objectBoundingBox')
        .attr('width', 1)
        .attr('height', 1);
      pattern
        .append('rect')
        .attr('width', 1)
        .attr('height', 1)
        .attr('fill', backing);
      pattern
        .append('image')
        .attr('href', getProductImagePath(id))
        .attr('width', 1)
        .attr('height', 1)
        .attr('preserveAspectRatio', 'xMidYMid slice');
    }
    return `url(#img-${id})`;
  };

  return function paint() {
    nodeSelection.each(function (d) {
      const g = d3.select(this);
      const level: Emphasis =
        d.id === targetId
          ? 'target'
          : pinnedStore.has(d.id)
            ? 'pinned'
            : 'none';
      const scale =
        level === 'target'
          ? TARGET_SCALE
          : level === 'pinned'
            ? PINNED_SCALE
            : 1;
      const isProduct = d.payload.type === 'product';
      const baseFill = isProduct
        ? NODE_STYLES.product.fill
        : NODE_STYLES.recipe.fill;

      const shape = g.select<SVGGraphicsElement>('.node-shape');
      if (isProduct) {
        shape.attr('r', NODE_STYLES.product.radius * scale);
      } else {
        const size = NODE_STYLES.recipe.size * scale;
        shape
          .attr('x', -size / 2)
          .attr('y', -size / 2)
          .attr('width', size)
          .attr('height', size);
      }

      shape.attr(
        'fill',
        level === 'none' ? baseFill : patternFill(d.id, baseFill),
      );

      // Raise emphasized nodes so their thumbnails aren't occluded by neighbors.
      if (level !== 'none') g.raise();
    });
  };
}
