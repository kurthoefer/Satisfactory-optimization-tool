// =================
// FILE STRUCTURE
// =================

/_
src/
├── App.tsx
├── main.tsx
├── components/
│ ├── Layout.tsx # Main layout with nav/header
│ ├── Navigation.tsx # Nav bar component
│ ├── AuthButton.tsx # Login/logout button (placeholder for now)
│ └── calculator/ # Calculator-specific components
│ ├── ProductInput.tsx
│ ├── RecipeSelector.tsx
│ ├── ResultsDisplay.tsx
│ └── MachineBreakdown.tsx
├── pages/
│ ├── Home.tsx # Landing page: calculator + featured blueprints
│ ├── Calculator.tsx # Full calculator page (if needed separate)
│ ├── Factories.tsx # List of saved factory plans
│ ├── FactoryDetail.tsx # View a specific factory plan
│ ├── Blueprints.tsx # Browse community blueprints
│ ├── BlueprintDetail.tsx # View a specific blueprint
│ └── Profile.tsx # User profile page
├── hooks/
│ ├── useRecipeData.ts # Hook to access recipe JSON
│ └── useCalculator.ts # Calculator logic hook
├── utils/
│ ├── calculator.ts # Core calculation functions
│ └── recipeHelpers.ts # Recipe data utilities
├── data/
│ └── recipes.json # Satisfactory recipe data
├── types/
│ └── index.ts # TypeScript interfaces
└── styles/
└── index.css # Global styles
_/

STRUCTURAL MANTRAS:
**Potential considerations:**

**1. Feature vs. Technical organization**
As your calculator grows, you might hit a point where related files are scattered. For example, everything related to "product search" lives in different folders:

- `components/ProductAutocomplete.tsx`
- `hooks/useProductSearch.ts`
- `types/product.ts`
- `utils/productHelpers.ts`

Some teams prefer feature-based folders for larger apps:

```
features/
  product-search/
    components/
    hooks/
    types/
    utils/
```

But honestly, for a focused app like yours, the current structure is probably clearer.

**2. Where does business logic live?**
Right now you likely have calculation logic in `utils/`. That's fine, but if those calculations grow complex, you might want a `lib/` or `services/` folder to distinguish "app business logic" from "generic utilities". Just a semantic thing.

**3. Context/State management**
If you add React Context providers, you might want a `contexts/` folder. Currently you probably don't need it.

**4. Minor nitpick: `assets/` vs `public/`**
You're using `/public/images/` for game assets, which is correct. The `assets/` folder in `src/` should be for things bundled by Vite (imported in code). Just worth keeping that distinction clear.

**Bottom line:** This is a solid structure for your project size. Don't fix what isn't broken—reorganize only if you feel friction finding things.
