#!/usr/bin/env node
/**
 * Script to replace console.error with logger.error in all store files
 * Run: node scripts/replace-console-errors.js
 */

const fs = require('fs');
const path = require('path');

const storeFiles = [
  'src/store/accountStore.ts',
  'src/store/authStore.ts',
  'src/store/budgetStore.ts',
  'src/store/categoryBudgetStore.ts',
  'src/store/categoryStore.ts',
  'src/store/customTileStore.ts',
  'src/store/hierarchicalCategoryStore.ts',
  'src/store/plannedPaymentStore.ts',
];

storeFiles.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`Skipping ${filePath} - file not found`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Add logger import if not present
  if (!content.includes("import { logger }")) {
    const importMatch = content.match(/^import.*from ['"]\.\.\/lib\/utils['"]/m);
    if (importMatch) {
      content = content.replace(
        importMatch[0],
        `${importMatch[0]}\nimport { logger } from '../lib/logger'`
      );
    } else {
      // Find the last import statement
      const imports = content.match(/^import.*$/gm);
      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = content.lastIndexOf(lastImport);
        const insertIndex = lastImportIndex + lastImport.length;
        content = content.slice(0, insertIndex) + 
                  "\nimport { logger } from '../lib/logger'" + 
                  content.slice(insertIndex);
      }
    }
  }

  // Replace console.error patterns
  content = content.replace(
    /console\.error\((['"`])([^'"`]+)\1\s*,\s*error\)/g,
    (match, quote, message) => {
      return `logger.error(${quote}${message}${quote}, error instanceof Error ? error : new Error(${quote}${message}${quote}))`;
    }
  );

  // Replace console.error with context
  content = content.replace(
    /console\.error\((['"`])([^'"`]+)\1\s*,\s*error\s*,\s*([^)]+)\)/g,
    (match, quote, message, context) => {
      return `logger.error(${quote}${message}${quote}, error instanceof Error ? error : new Error(${quote}${message}${quote}), ${context})`;
    }
  );

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`Updated ${filePath}`);
});

console.log('Done!');

