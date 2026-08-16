import fs from 'fs';
import path from 'path';

const schemaDir = path.join(process.cwd(), 'src/schema');
const files = fs.readdirSync(schemaDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');

for (const file of files) {
  const filePath = path.join(schemaDir, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Find all matches of `export const (tableName) = pgTable`
  const regex = /export const (\w+) = pgTable/g;
  let match;
  let toAppend = '';
  while ((match = regex.exec(content)) !== null) {
    const tableName = match[1];
    toAppend += `\n${tableName}.enableRLS();\n`;
  }
  
  // Remove previously appended enableRLS if we accidentally added them
  content = content.replace(/\n\w+\.enableRLS\(\);\n/g, '');
  
  // Also remove `.enableRLS()` chained to the end of pgTable from before
  content = content.replace(/\)\.enableRLS\(\);/g, ');');
  content = content.replace(/\]\)\.enableRLS\(\);/g, ']);');
  
  if (toAppend) {
    content = content + '\n' + toAppend;
    fs.writeFileSync(filePath, content);
  }
}
console.log("Done");
