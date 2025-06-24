const fs = require('fs');

// Read the file
const filePath = 'src/components/onesheet/AIInstructionsTab.tsx';
const content = fs.readFileSync(filePath, 'utf8');

// Fix the populateFormData function to use proper type casting
let fixedContent = content.replace(
  /const populateFormData = \(data: Record<string, unknown>\) => {/,
  'const populateFormData = (data: Record<string, any>) => {'
);

// Remove the warning about toast dependency
fixedContent = fixedContent.replace(
  /}, \[onesheetId\]\);/,
  '}, [onesheetId, toast]);'
);

// Write the fixed content back
fs.writeFileSync(filePath, fixedContent);
console.log('Fixed type issues in AIInstructionsTab.tsx');
