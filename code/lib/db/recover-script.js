import fs from 'fs';

const logPath = '/Users/maulik/.gemini/antigravity/brain/dd72d703-73b4-4be1-8a95-72ae4996698b/.system_generated/logs/transcript_full.jsonl';
const lines = fs.readFileSync(logPath, 'utf-8').split('\n');

for (const line of lines) {
  if (!line) continue;
  const data = JSON.parse(line);
  if (data.type === 'TOOL_RESPONSE' && data.content && data.content.includes('--- src/schema/events.ts ---')) {
    // Check if it's the exact output we want
    if (data.content.includes('import { pgTable')) {
      fs.writeFileSync('/Users/maulik/smaran/code/lib/db/recovered_schema_output.txt', data.content);
      console.log('Saved recovered output to recovered_schema_output.txt');
      break;
    }
  }
}
