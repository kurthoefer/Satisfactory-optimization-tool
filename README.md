# Satisfactory Factory Planner

> Plan smarter! See everything!

An interactive production chain visualizer for [Satisfactory](https://www.satisfactorygame.com/). Unlike tools that pick the "optimal" path for you, this app shows **every possible recipe combination** as an explorable graph — so you can make informed decisions about how to build your factory.

**[🔗 Live Demo](https://main.dmlpkp500ruhd.amplifyapp.com/)**

---

## ✨ What It Does

- **Explore, don't optimize** — browse all valid production paths for any product, including alternate recipes and circular dependencies
- **Interactive graph visualization** — D3.js force-directed graphs with zoom, pan, and drag
- **Filter-driven subgraphs** — constrain by tier, alternate recipes, converter recipes, and base resources to see exactly the production paths relevant to your factory
- **Rich visual analysis** — more coming soon!

## 🖼️ Screenshots

> _Coming soon_

---

## Tech Stack

|                   |                                                   |
| ----------------- | ------------------------------------------------- |
| **Frontend**      | React 19 · TypeScript · React Router v7           |
| **Visualization** | D3.js · d3-dag                                    |
| **Styling**       | Tailwind CSS v4                                   |
| **Build**         | Vite (Rolldown)                                   |
| **Deployment**    | AWS Amplify                                       |
| **Data**          | Parsed from Satisfactory game files at build time |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/kurthoefer/Satisfactory-optimization-tool.git
cd Satisfactory-optimization-tool
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

This runs the full pipeline: game data parsing → TypeScript compilation → Vite build.

### Rebuild Game Data Only

```bash
npm run data:build
```

Parses `_docs.json` (Unreal Engine export) into the static JSON files the app consumes at runtime.

---

## How It Works

### Data Pipeline

The app parses Satisfactory's raw game data (`_Docs.json`) into three clean datasets at build time:

- **products-flat.json** — craftable products across 16 categories
- **recipes.json** — recipes including alternates and converter recipes
- **topology.json** — a bipartite directed graph encoding every ingredient→recipe and recipe→product relationship, with precomputed SCC groups and PageRank persistence scores

At runtime, `indexes.ts` builds fast lookup maps from this data — no async fetching, no backend calls.

### The Graph Model

Production chains are modeled as a **bipartite directed graph**:

```
Product → Recipe → Product → Recipe → ...
```

Products and recipes are both nodes. Edges represent material flow. This preserves the full semantics of how recipes _transform_ inputs into outputs, rather than collapsing recipes into simple edges between products.

### Visualization Architecture

The visualization page uses a unidirectional data flow driven entirely by the URL:

```
URL params → TraversalRules → filter edges → BFS upstream walk → graph assembly → D3 rendering
```

Selecting a target product and applying filters triggers a four-phase pipeline: edges are filtered by the current rules, a BFS walk identifies reachable nodes upstream of the target, persistence scores are computed on the filtered subgraph, and the resulting graph is assembled for D3. The URL is the single source of truth — filters and product selection are all shareable and bookmarkable.

---

## 📋 Roadmap

- [x] Product search with keyboard navigation
- [x] Bipartite graph construction from game data
- [x] SCC detection (Tarjan's algorithm)
- [x] Force-directed graph visualization
- [x] BFS upstream traversal
- [x] Filter-driven subgraph pipeline (tier, alternates, converter, base resources)
- [x] Precomputed PageRank persistence scores
- [ ] Runtime persistence recomputation on filtered subgraphs
- [ ] Visual tuning (persistence-driven opacity, SCC coloring, tier color encoding)
- [ ] Sugiyama hierarchical layout (via d3-dag)
- [ ] UI overhaul(s)
- [ ] Production rate calculator (items/min)
- [ ] User accounts & saved factory blueprints

---

## 📄 License

[MIT](LICENSE)

This project is not affiliated with Coffee Stain Studios. Satisfactory is a registered trademark of Coffee Stain Studios AB.

---

<p align="center">
  Built with ☕ and way too many hours in-game
</p>
