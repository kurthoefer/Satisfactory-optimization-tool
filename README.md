# 🏭 Satisfactory Factory Planner

> Plan smarter! See everything!

An interactive production chain visualizer for [Satisfactory](https://www.satisfactorygame.com/). Unlike tools that pick the "optimal" path for you, this app shows **every possible recipe combination** as an explorable graph — so you can make informed decisions about how to build your factory.

**[🔗 Live Demo](https://main.dmlpkp500ruhd.amplifyapp.com/)**

---

## ✨ What It Does

- **Explore, don't optimize** — browse all valid production paths for any product, including alternate recipes and circular dependencies
- **Interactive graph visualization** — D3.js force-directed graphs with zoom, pan, and drag
- **Rich visual analysis** — more coming soon!

---

## 🛠 Tech Stack

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

Parses `_Docs.json` (Unreal Engine export) into the static JSON files the app consumes at runtime.

---

## 🏗 How It Works

### Data Pipeline

The app parses Satisfactory's raw game data (`_Docs.json`) into three clean datasets at build time:

- **products-flat.json** — 115 craftable products across 15 categories
- **recipes.json** — 318 recipes including alternates
- **topology.json** — a bipartite directed graph encoding every ingredient→recipe and recipe→product relationship

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
URL params → traversal config → BFS upstream walk → focus-tagged graph → D3 rendering
```

Selecting a target product triggers a breadth-first traversal of its upstream dependencies. Every node and edge gets tagged as "focused" or not — the D3 simulation runs on the full graph always, and view modes just change what's visible. Toggling between focused and big-picture views is instant.

---

## 📋 Roadmap

- [x] Product search with keyboard navigation
- [x] Bipartite graph construction from game data
- [x] SCC detection (Tarjan's algorithm)
- [x] Force-directed graph visualization
- [x] BFS upstream traversal with focus tagging
- [ ] Visual tuning (logarithmic scaling, opacity mapping, SCC coloring)
- [ ] Sugiyama hierarchical layout (via d3-dag)
- [ ] UI overhaul(s)
- [ ] Production rate calculator (items/min)
- [ ] User accounts & saved factory blueprints

---

## 📄 License

This project is not affiliated with Coffee Stain Studios. Satisfactory is a registered trademark of Coffee Stain Studios AB.

---

<p align="center">
  Built with ☕ and way too many hours in-game
</p>
