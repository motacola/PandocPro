#!/usr/bin/env node

/**
 * mcp-ops.js
 * Helper for MCP tools to perform surgical reads/writes on Markdown files.
 * 
 * Usage:
 *   node mcp-ops.js read <file> <header_name>
 *   node mcp-ops.js update <file> <header_name> <new_content_string>
 */

const fs = require('fs');
const path = require('path');

function normalizeHeader(header) {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function findSectionRange(lines, targetHeader) {
  const targetSlug = normalizeHeader(targetHeader);
  let start = -1;
  let end = -1;
  let level = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    
    if (match) {
      const currentLevel = match[1].length;
      const currentHeader = match[2].trim();
      const currentSlug = normalizeHeader(currentHeader);

      if (start === -1) {
        // Looking for start
        // We match loosely on slug OR exact text
        if (currentSlug === targetSlug || currentHeader.toLowerCase() === targetHeader.toLowerCase()) {
          start = i;
          level = currentLevel;
        }
      } else {
        // Looking for end (next header of same or higher level)
        if (currentLevel <= level) {
          end = i;
          break;
        }
      }
    }
  }

  if (start !== -1 && end === -1) {
    end = lines.length;
  }

  return { start, end };
}

function readSection(filePath, header) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  if (!header) {
    // No header specified, return full content
    console.log(content);
    return;
  }

  const lines = content.split('\n');
  const { start, end } = findSectionRange(lines, header);

  if (start === -1) {
    console.error(`Error: Section "${header}" not found.`);
    process.exit(1);
  }

  // extract content (including the header itself for context, or just body? Usually helpful to include header)
  // Let's include the header so the LLM knows what it's looking at
  const sectionContent = lines.slice(start, end).join('\n');
  console.log(sectionContent);
}

function updateSection(filePath, header, newContent) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  // Handle whole-file update
  if (!header) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated entire file: ${filePath}`);
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const { start, end } = findSectionRange(lines, header);

  if (start === -1) {
    // If section doesn't exist, should we append it? For now, error safety.
    console.error(`Error: Section "${header}" not found. Cannot update.`);
    process.exit(1);
  }

  // Replace lines [start, end)
  // Ensure newContent ends with newline if needed, but not double
  const cleanContent = newContent.replace(/\r\n/g, '\n'); 
  
  // We want to preserve the header? 
  // "Update section 3" usually means "rewrite section 3".
  // The LLM should provide the full replacement. 
  // However, often LLMs just provide the body.
  // Let's assume the LLM provides the *body*? 
  // Actually, to be safe, if the new content *doesn't* start with a header, we should probably keep the old header.
  // But if the LLM wants to rename the section, they might include the header.
  
  // Strategy: Identify if newContent starts with a matching header level.
  // For simplicity valid "Surgical" edit usually implies replacing the whole block.
  // Let's just output exactly what is given. If the user messed up the header, that's on them (or the LLM).
  // BUT, to be helpful, if the new content does NOT start with #, we'll keep the original header line.
  
  const originalHeaderLine = lines[start];
  let finalReplacement = cleanContent;
  
  if (!cleanContent.trim().startsWith('#')) {
    finalReplacement = originalHeaderLine + '\n' + cleanContent;
  }

  const before = lines.slice(0, start);
  const after = lines.slice(end);
  
  const newLines = [...before, finalReplacement, ...after];
  
  fs.writeFileSync(filePath, newLines.join('\n'), 'utf8');
  console.log(`Updated section "${header}" in ${filePath}`);
}

async function main() {
  const op = process.argv[2];
  const args = process.argv.slice(3);
  
  // Simple arg parsing
  const getArg = (name) => {
    const idx = args.indexOf(name);
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
    return null;
  };

  const file = getArg('--file');
  const section = getArg('--section');
  const content = getArg('--content');

  if (!op || !file) {
    console.error('Usage: node mcp-ops.js <read|update> --file <path> [--section <name>] [--content <string>]');
    process.exit(1);
  }

  if (op === 'read') {
    readSection(file, section);
  } else if (op === 'update') {
    if (!content) {
      console.error('Error: --content required for update operation');
      process.exit(1);
    }
    updateSection(file, section, content);
  } else {
    console.error(`Unknown operation: ${op}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
