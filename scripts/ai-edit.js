#!/usr/bin/env node

/**
 * ai-edit.js
 * 
 * Performs a "Surgical Edit" on a Markdown file using the configured local LLM.
 * 
 * Flow:
 * 1. Read the specified section (using mcp-ops logic).
 * 2. Construct a prompt with the context + instruction.
 * 3. Call the Local LLM (using llm-helper logic).
 * 4. Update the section with the result (using mcp-ops logic).
 * 
 * Usage:
 *   ./scripts/ai-edit.js <file> <section> <instruction>
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { generateResponse } = require('./lib/llm-helper');

const PROJECT_ROOT = path.join(__dirname, '..');
const MCP_OPS = path.join(__dirname, 'lib', 'mcp-ops.js');

function readSection(file, section) {
  const result = spawnSync('node', [MCP_OPS, 'read', '--file', file, '--section', section], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Failed to read section: ${result.stderr}`);
  }
  return result.stdout.trim();
}

function updateSection(file, section, content) {
  // We use the CLI helper to restart the mcp-ops process for cleanliness, 
  // ensuring we don't bleed context between operations.
  const result = spawnSync('node', [MCP_OPS, 'update', '--file', file, '--section', section, '--content', content], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Failed to update section: ${result.stderr}`);
  }
  return result.stdout.trim();
}

async function main() {
  // args: <file> <instruction> [section]
  // Ideally we want positionals, but CLI parsing is brittle if we change order.
  // Original usage: <file> <section> <instruction>
  // Let's change usage to: <file> <instruction> [section]
  // Or better, use named args or be smart.
  // Current main() expects 3 args. 
  
  // Let's support:
  // ./ai-edit.js --file <f> --instruction <i> [--section <s>]
  // But previously we used positionals. Refactor to use named args parsing logic similar to mcp-ops.
  
  const getArg = (name) => {
    const idx = args.indexOf(name);
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
    return null;
  };
  
  const file = getArg('--file') || args[0];
  // Backwards compat mixed matching is dangerous.
  // Let's rely on how mcp-ops calls usually go.
  // If no flags, assume old positionals? 
  // Old positionals: file, section, instruction
  // But wait, the previous `ai-edit.js` implementation used `process.argv.slice(2)` and `[file, section, instruction] = args`.
  // To allow optional section, we should probably switch to flags, OR make section token explicit like "ALL".
  
  // The caller (Electron) is under our control.
  // Let's switch `ai-edit.js` to use flags for clarity.
  // electron/main/ai-edit.ts ALREADY passes flags: ['--file', filePath, '--instruction', instruction]
  
  const instruction = getArg('--instruction');
  const section = getArg('--section'); // Optional
  
  if (!file || !instruction) {
      // Fallback for direct CLI usage if needed, or error
      if (args.length === 3 && !args[0].startsWith('--')) {
          // Old behavior
          // file = args[0]
          // section = args[1]
          // instruction = args[2]
          // Not fixing old behavior to keep it simple, expecting flags now.
      }
      console.error('Usage: ./scripts/ai-edit.js --file <file> --instruction "..." [--section "..."]');
      process.exit(1);
  }

  const absoluteFile = path.resolve(process.cwd(), file);
  if (!fs.existsSync(absoluteFile)) {
    console.error(`Error: File not found: ${file}`);
    process.exit(1);
  }

  const scopeMsg = section ? `section "${section}"` : "entire file";
  console.log(`📖 Reading ${scopeMsg} from ${file}...`);
  
  let originalContent;
  try {
    originalContent = readSection(absoluteFile, section || '');
    if (!originalContent) {
      console.error(`Error: Content not found or empty.`);
      process.exit(1);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  console.log(`🤖 Asking AI to: "${instruction}"...`);
  
  const prompt = `
You are an expert editor. You are editing a section of a Markdown document.
Context:
The user wants you to edit the following section based on their instructions.
Return ONLY the updated content for this section. Do not include markdown code fences (\`\`\`) surrounding the block unless the content itself requires them. Do not add "Here is the updated text". Just the text.

Original Section Content:
---
${originalContent}
---

Instruction: ${instruction}

Updated Content:
`;

  try {
    // Generate response using the configured local LLM
    let updatedContent = await generateResponse(PROJECT_ROOT, prompt);
    
    // Clean up markdown fences if the LLM ignored instructions
    updatedContent = updatedContent.replace(/^```markdown\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

    if (!updatedContent) {
      throw new Error('AI returned empty content');
    }

    console.log(`✍️  Updated content received (${updatedContent.length} chars). Updating file...`);
    updateSection(absoluteFile, section || '', updatedContent);
    
    console.log('✅ Surgical edit complete.');
    
  } catch (err) {
    console.error(`❌ AI Error: ${err.message}`);
    process.exit(1);
  }
}

main();
