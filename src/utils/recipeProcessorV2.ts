// // Script to parse Satisfactory _docs.json and extract all products
// // Run with: node parseGameData.js

// const fs = require('fs');

// // Load the game data
// const docsData = JSON.parse(
//   fs.readFileSync('/mnt/user-data/uploads/_docs.json', 'utf8')
// );

// // Category determination based on ClassName patterns and NativeClass
// function categorizeItem(item, nativeClass) {
//   const className = item.ClassName;
//   const displayName = item.mDisplayName || '';
//   const description = item.mDescription || '';
//   const form = item.mForm || '';

//   // Skip items without display names (these are internal/unused)
//   if (!displayName) return null;

//   // Resources (mined directly)
//   if (nativeClass === "Class'/Script/FactoryGame.FGResourceDescriptor'") {
//     if (form === 'RF_LIQUID') return 'Liquids';
//     return 'Resources';
//   }

//   // Equipment
//   if (
//     nativeClass === "Class'/Script/FactoryGame.FGEquipmentDescriptor'" ||
//     nativeClass === "Class'/Script/FactoryGame.FGConsumableDescriptor'"
//   ) {
//     return 'Equipment';
//   }

//   // Ammo (check description and className patterns)
//   if (
//     className.includes('Cartridge') ||
//     className.includes('Nobelisk') ||
//     className.includes('Rebar') ||
//     description.toLowerCase().includes('ammo for')
//   ) {
//     return 'Ammo';
//   }

//   // FICSMAS items
//   if (
//     className.includes('Xmas') ||
//     className.includes('CandyCane') ||
//     className.includes('Snowball') ||
//     className.includes('Wreath') ||
//     className.includes('XmasBall') ||
//     className.includes('Gift')
//   ) {
//     return 'FICSMAS';
//   }

//   // Liquids
//   if (form === 'RF_LIQUID' || className.includes('Liquid')) {
//     return 'Liquids';
//   }

//   // Packaged items
//   if (className.includes('Packaged')) {
//     return 'Packaged';
//   }

//   // Ingots
//   if (className.includes('Ingot')) {
//     return 'Ingots';
//   }

//   // Ores
//   if (className.startsWith('Desc_Ore')) {
//     return 'Ores';
//   }

//   // Nuclear
//   if (
//     className.includes('Uranium') ||
//     className.includes('Plutonium') ||
//     className.includes('Nuclear') ||
//     description.toLowerCase().includes('radioactive')
//   ) {
//     return 'Nuclear';
//   }

//   // Space Elevator Parts
//   if (className.includes('SpaceElevatorPart')) {
//     return 'Space Elevator Parts';
//   }

//   // Power/Energy
//   if (
//     className.includes('Battery') ||
//     className.includes('CrystalShard') ||
//     className.includes('Power')
//   ) {
//     return 'Power';
//   }

//   // Advanced Electronics
//   if (
//     className.includes('Computer') ||
//     className.includes('Circuit') ||
//     (className.includes('Crystal') && className.includes('Oscillator')) ||
//     className.includes('RadioControl') ||
//     className.includes('HighSpeed')
//   ) {
//     return 'Electronics';
//   }

//   // Motors and Frames
//   if (
//     className.includes('Motor') ||
//     className.includes('ModularFrame') ||
//     className.includes('HeavyModularFrame')
//   ) {
//     return 'Industrial Parts';
//   }

//   // Basic Parts
//   if (
//     className.includes('Plate') ||
//     className.includes('Rod') ||
//     className.includes('Screw') ||
//     className.includes('Wire') ||
//     className.includes('Cable') ||
//     className.includes('Sheet') ||
//     className.includes('Beam') ||
//     className.includes('Pipe') ||
//     className.includes('Rotor') ||
//     className.includes('Stator')
//   ) {
//     return 'Standard Parts';
//   }

//   // Materials
//   if (
//     className.includes('Concrete') ||
//     className.includes('Silica') ||
//     className.includes('Quartz') ||
//     className.includes('Rubber') ||
//     className.includes('Plastic') ||
//     className.includes('Fabric') ||
//     className.includes('Biomass')
//   ) {
//     return 'Materials';
//   }

//   // Alien/Special items
//   if (
//     className.includes('Alien') ||
//     className.includes('SAM') ||
//     className.includes('Mycelia') ||
//     className.includes('Hog') ||
//     className.includes('Hatcher') ||
//     className.includes('Spitter') ||
//     className.includes('Stinger')
//   ) {
//     return 'Alien';
//   }

//   // Default to "Other"
//   return 'Other';
// }

// // Extract products from the game data
// function extractProducts() {
//   const productsByCategory = {};

//   docsData.forEach((section) => {
//     const nativeClass = section.NativeClass;

//     // We only care about descriptors (actual items)
//     if (!nativeClass || !nativeClass.includes('Descriptor')) return;

//     section.Classes?.forEach((item) => {
//       const category = categorizeItem(item, nativeClass);

//       // Skip items we can't categorize
//       if (!category) return;

//       // Initialize category array if needed
//       if (!productsByCategory[category]) {
//         productsByCategory[category] = [];
//       }

//       // Create product object
//       const product = {
//         id: item.ClassName.toLowerCase()
//           .replace(/_c$/, '')
//           .replace(/^desc_/, ''),
//         name: item.mDisplayName,
//         className: item.ClassName,
//         description: item.mDescription || '',
//         form: item.mForm || 'RF_SOLID',
//         stackSize: item.mStackSize || 'SS_MEDIUM',
//         energyValue: parseFloat(item.mEnergyValue) || 0,
//         radioactive: parseFloat(item.mRadioactiveDecay) || 0,
//         category: category,
//       };

//       productsByCategory[category].push(product);
//     });
//   });

//   // Sort each category alphabetically
//   Object.keys(productsByCategory).forEach((category) => {
//     productsByCategory[category].sort((a, b) => a.name.localeCompare(b.name));
//   });

//   return productsByCategory;
// }

// // Run the extraction
// console.log('Parsing Satisfactory game data...');
// const products = extractProducts();

// // Show statistics
// console.log('\nExtracted products by category:');
// Object.keys(products)
//   .sort()
//   .forEach((category) => {
//     console.log(`  ${category}: ${products[category].length} items`);
//   });

// const totalItems = Object.values(products).reduce(
//   (sum, arr) => sum + arr.length,
//   0
// );
// console.log(
//   `\nTotal: ${totalItems} items across ${
//     Object.keys(products).length
//   } categories`
// );

// // Save to file
// const outputPath = '/home/claude/products.json';
// fs.writeFileSync(outputPath, JSON.stringify(products, null, 2));
// console.log(`\n✅ Saved to ${outputPath}`);

// // Also create a flat array version for easier searching
// const flatProducts = [];
// Object.values(products).forEach((categoryProducts) => {
//   flatProducts.push(...categoryProducts);
// });

// const flatOutputPath = '/home/claude/products-flat.json';
// fs.writeFileSync(flatOutputPath, JSON.stringify(flatProducts, null, 2));
// console.log(`✅ Saved flat version to ${flatOutputPath}`);

// console.log('\nDone!');
