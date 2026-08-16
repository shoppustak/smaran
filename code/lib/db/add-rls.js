import fs from 'fs';
import path from 'path';

const schemaDir = path.join(process.cwd(), 'src/schema');
const files = fs.readdirSync(schemaDir).filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'family-content-log.ts');
files.push('family-content-log.ts'); // if exists

for (const file of files) {
  const filePath = path.join(schemaDir, file);
  if (!fs.existsSync(filePath)) continue;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace `});` at the end of `pgTable(..., { ... });`
  // and `]);` at the end of `pgTable(..., (t) => [ ... ]);`
  // We can use a regex that looks for `pgTable` and adds `.enableRLS()` to the end of the statement.
  // Actually, since all these files have a simple structure, we can just replace:
  // `\n});\n\nexport const insert` with `\n}).enableRLS();\n\nexport const insert`
  // Let's do it carefully.
  content = content.replace(/\n\}\);\n/g, '\n}).enableRLS();\n');
  content = content.replace(/\n\]\);\n/g, '\n]).enableRLS();\n');
  // Handle files that don't end with \n\nexport
  if (content.endsWith('\n});\n')) {
    content = content.replace(/\n\}\);\n$/, '\n}).enableRLS();\n');
  }
  if (content.endsWith('\n});')) {
    content = content.replace(/\n\}\);$/, '\n}).enableRLS();');
  }
  
  // Be careful with createInsertSchema(...).omit({...});
  // The above regex `\n});\n` might match it if it's formatted like that, but usually they are on one line:
  // `export const insertLedgerSchema = createInsertSchema(ledgerTable).omit({ id: true });`
  // which does not have a newline before `});`.
  
  fs.writeFileSync(filePath, content);
}
console.log("Done");
