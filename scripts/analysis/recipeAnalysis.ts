import type {
  Recipe,
  RecipesOrganized,
  CircularRelationships,
} from '../../src/types';

// Helper: Check if an item produces itself (immediate loop)
function hasSelfLoop(
  item: string,
  byProduct: { [className: string]: Recipe[] },
): boolean {
  const recipes = byProduct[item] || [];
  return recipes.some((recipe) =>
    recipe.ingredients.some((ing) => ing.className === item),
  );
}

// Helper: Tarjan's Algorithm for SCCs
function findCircularRelationships(byProduct: {
  [className: string]: Recipe[];
}): CircularRelationships {
  let index = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  // Get all items in the recipe graph
  const allItems = new Set<string>();
  Object.keys(byProduct).forEach((item) => allItems.add(item));
  Object.values(byProduct).forEach((recipes) => {
    recipes.forEach((recipe) => {
      recipe.ingredients.forEach((ing) => allItems.add(ing.className));
    });
  });

  function strongConnect(item: string) {
    indices.set(item, index);
    lowLinks.set(item, index);
    index++;
    stack.push(item);
    onStack.add(item);

    const recipes = byProduct[item] || [];
    for (const recipe of recipes) {
      for (const ingredient of recipe.ingredients) {
        const successor = ingredient.className;

        if (!indices.has(successor)) {
          strongConnect(successor);
          lowLinks.set(
            item,
            Math.min(lowLinks.get(item)!, lowLinks.get(successor)!),
          );
        } else if (onStack.has(successor)) {
          lowLinks.set(
            item,
            Math.min(lowLinks.get(item)!, indices.get(successor)!),
          );
        }
      }
    }

    if (lowLinks.get(item) === indices.get(item)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== item);
      sccs.push(scc);
    }
  }

  for (const item of allItems) {
    if (!indices.has(item)) {
      strongConnect(item);
    }
  }

  // Process Results
  const itemToSCC = new Map<string, number>();
  const circularItems = new Set<string>();

  sccs.forEach((scc, sccIndex) => {
    const isCircular =
      scc.length > 1 || (scc.length === 1 && hasSelfLoop(scc[0], byProduct));

    scc.forEach((item) => {
      itemToSCC.set(item, sccIndex);
      if (isCircular) {
        circularItems.add(item);
      }
    });
  });

  const circularRecipes = new Set<string>();
  Object.entries(byProduct).forEach(([product, recipes]) => {
    if (circularItems.has(product)) {
      recipes.forEach((recipe) => {
        const productSCC = itemToSCC.get(product);
        const hasCircularIngredient = recipe.ingredients.some(
          (ing) => itemToSCC.get(ing.className) === productSCC,
        );

        if (hasCircularIngredient) {
          circularRecipes.add(recipe.className);
        }
      });
    }
  });

  return {
    stronglyConnectedComponents: sccs,
    circularItems: Array.from(circularItems),
    circularRecipes: Array.from(circularRecipes),
  };
}

// Main Export
export function organizeRecipes(recipes: Recipe[]): RecipesOrganized {
  const byProduct: { [className: string]: Recipe[] } = {};
  const byIngredient: { [className: string]: Recipe[] } = {};
  const byMachine: { [machine: string]: Recipe[] } = {};
  const alternates: Recipe[] = [];

  recipes.forEach((recipe) => {
    // Index by product
    recipe.products.forEach((product) => {
      if (!byProduct[product.className]) {
        byProduct[product.className] = [];
      }
      byProduct[product.className].push(recipe);
    });

    // Index by ingredient
    recipe.ingredients.forEach((ingredient) => {
      if (!byIngredient[ingredient.className]) {
        byIngredient[ingredient.className] = [];
      }
      byIngredient[ingredient.className].push(recipe);
    });

    // Index by machine
    if (!byMachine[recipe.producedIn]) {
      byMachine[recipe.producedIn] = [];
    }
    byMachine[recipe.producedIn].push(recipe);

    // Collect alternates
    if (recipe.isAlternate) {
      alternates.push(recipe);
    }
  });

  // Analyze circular relationships
  const circularRelationships = findCircularRelationships(byProduct);

  return {
    all: recipes,
    byProduct,
    byIngredient,
    byMachine,
    alternates,
    circularRelationships,
  };
}
