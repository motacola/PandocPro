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
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: ./scripts/ai-edit.js <file> <section_header> <instruction>');
    console.error('Example: ./scripts/ai-edit.js docs/report.md "Introduction" "Make it more professional"');
    process.exit(1);
  }

  const [file, section, instruction] = args;
  
  const absoluteFile = path.resolve(process.cwd(), file);
  if (!fs.existsSync(absoluteFile)) {
    console.error(`Error: File not found: ${file}`);
    process.exit(1);
  }

  console.log(`📖 Reading section "${section}" from ${file}...`);
  let originalContent;
  try {
    originalContent = readSection(absoluteFile, section);
    if (!originalContent) {
      console.error(`Error: Section "${section}" not found or empty.`);
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
    const updatedContent = await generateResponse(PROJECT_ROOT, prompt);
    
    console.log(`✍️  Updating file...`);
    updateSection(absoluteFile, section, updatedContent);
    
    console.log('✅ Surgical edit complete.');
    
  } catch (err) {
    console.error(`❌ AI Error: ${err.message}`);
    process.exit(1);
  }
}

main();
