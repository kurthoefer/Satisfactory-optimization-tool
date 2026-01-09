// import itemsData from '../data/items.json';
// import resourcesData from '../data/resources.json';

// interface ItemDescriptor {
//   ClassName: string;
//   mDisplayName: string;
//   mDescription: string;
//   mForm: string;
// }

// // Create a map of className to display name
// const itemNameMap = new Map<string, string>();

// // Load manufactured items
// // @ts-ignore - items.json structure
// itemsData.Classes.forEach((item: ItemDescriptor) => {
//   itemNameMap.set(item.ClassName, item.mDisplayName);
// });

// // Load raw resources
// // @ts-ignore - resources.json structure
// resourcesData.Classes.forEach((resource: ItemDescriptor) => {
//   itemNameMap.set(resource.ClassName, resource.mDisplayName);
// });

// /**
//  * Get the display name for an item class
//  * Falls back to cleaned class name if not found
//  */
// export function getItemDisplayName(className: string): string {
//   const displayName = itemNameMap.get(className);

//   if (displayName) {
//     return displayName;
//   }

//   // Fallback to cleaned class name
//   return className
//     .replace('Desc_', '')
//     .replace('_C', '')
//     .replace(/([A-Z])/g, ' $1')
//     .trim();
// }

// /**
//  * Get all items that can be produced (have recipes)
//  * Returns array of [className, displayName] sorted by display name
//  */
// export function getProducibleItems(recipeIndex: any): Array<[string, string]> {
//   const producibleItems: Array<[string, string]> = [];

//   Object.keys(recipeIndex).forEach((className) => {
//     const displayName = getItemDisplayName(className);
//     producibleItems.push([className, displayName]);
//   });

//   return producibleItems.sort((a, b) => a[1].localeCompare(b[1]));
// }

// /**
//  * Get the full item descriptor if needed
//  */
// export function getItemDescriptor(
//   className: string
// ): ItemDescriptor | undefined {
//   // @ts-ignore
//   const item = itemsData.Classes.find(
//     (item: ItemDescriptor) => item.ClassName === className
//   );
//   if (item) return item;

//   // @ts-ignore
//   return resourcesData.Classes.find(
//     (resource: ItemDescriptor) => resource.ClassName === className
//   );
// }
