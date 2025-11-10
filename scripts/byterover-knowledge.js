#!/usr/bin/env node
/**
 * Lightweight knowledge capture utility used by the Byterover automation rules.
 *
 * Usage:
 *   node scripts/byterover-knowledge.js retrieve [options]
 *   node scripts/byterover-knowledge.js store [options] <note>
 *
 * Wrapper scripts (byterover-retrieve-knowledge / byterover-store-knowledge)
 * call into this file so it can remain single-sourced.
 */

const fs = require("fs");
const path = require("path");

const MODE = process.argv[2];
const args = process.argv.slice(3);
const LOG_DIR = path.join(__dirname, "..", "logs");
const KNOWLEDGE_FILE = path.join(LOG_DIR, "knowledge.jsonl");

function usage(exitCode = 0) {
  const message = `
Byterover Knowledge Helper

Retrieve stored notes:
  byterover-retrieve-knowledge [--latest <n>] [--all] [--search <text>] [--tag <tag>]

Store a new note:
  byterover-store-knowledge [--tag <tag>]... [--source <text>] <note text>

Examples:
  byterover-store-knowledge --tag watch-mode "Watch script debounces saves."
  byterover-retrieve-knowledge --tag watch-mode
  byterover-retrieve-knowledge --latest 10 --search \"menu\"
`;
  console.log(message.trim());
  process.exit(exitCode);
}

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function loadEntries() {
  if (!fs.existsSync(KNOWLEDGE_FILE)) {
    return [];
  }
  const lines = fs.readFileSync(KNOWLEDGE_FILE, "utf8").split("\n").filter(Boolean);
  return lines
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);
}

function saveEntry(entry) {
  ensureLogDir();
  fs.appendFileSync(KNOWLEDGE_FILE, `${JSON.stringify(entry)}\n`, "utf8");
}

function formatEntry(entry, idx) {
  const tags = entry.tags?.length ? ` [${entry.tags.join(", ")}]` : "";
  const source = entry.source ? ` • ${entry.source}` : "";
  return `${idx}. ${entry.timestamp}${source}${tags}\n   ${entry.note}`;
}

function parseRetrieveArgs(argv) {
  const options = {
    latest: 5,
    search: "",
    tags: [],
    showAll: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    switch (token) {
      case "--latest":
      case "-n":
        options.latest = parseInt(argv[i + 1] || "5", 10);
        i += 1;
        break;
      case "--all":
        options.showAll = true;
        break;
      case "--search":
      case "-s":
        options.search = (argv[i + 1] || "").toLowerCase();
        i += 1;
        break;
      case "--tag":
      case "-t":
        options.tags.push(argv[i + 1]);
        i += 1;
        break;
      case "--help":
      case "-h":
        usage(0);
        break;
      default:
        // Treat bare words as part of search text.
        options.search = [options.search, token].filter(Boolean).join(" ").trim().toLowerCase();
        break;
    }
  }

  if (!Number.isFinite(options.latest) || options.latest <= 0) {
    options.latest = 5;
  }

  return options;
}

function retrieveKnowledge(argv) {
  const options = parseRetrieveArgs(argv);
  const entries = loadEntries();
  if (entries.length === 0) {
    console.log("ℹ️  No knowledge entries saved yet. Use byterover-store-knowledge to capture insights.");
    return;
  }

  let filtered = entries;

  if (options.search) {
    filtered = filtered.filter((entry) => entry.note.toLowerCase().includes(options.search));
  }

  if (options.tags.length > 0) {
    filtered = filtered.filter((entry) => {
      const entryTags = entry.tags || [];
      return options.tags.every((tag) => entryTags.includes(tag));
    });
  }

  if (!options.showAll) {
    filtered = filtered.slice(-options.latest);
  }

  if (filtered.length === 0) {
    console.log("ℹ️  No entries matched your filters.");
    return;
  }

  filtered.forEach((entry, idx) => {
    console.log(formatEntry(entry, idx + 1));
  });
}

function parseStoreArgs(argv) {
  const result = {
    tags: [],
    source: process.env.BYTEROVER_SOURCE || "",
    noteParts: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    switch (token) {
      case "--tag":
      case "-t":
        if (argv[i + 1]) {
          result.tags.push(argv[i + 1]);
          i += 1;
        }
        break;
      case "--source":
        if (argv[i + 1]) {
          result.source = argv[i + 1];
          i += 1;
        }
        break;
      case "--help":
      case "-h":
        usage(0);
        break;
      default:
        result.noteParts.push(token);
        break;
    }
  }

  return result;
}

function storeKnowledge(argv) {
  const { tags, source, noteParts } = parseStoreArgs(argv);
  const note = noteParts.join(" ").trim();

  if (!note) {
    console.error("❌ Please provide a note to store. Example: byterover-store-knowledge \"Found new menu pattern.\"");
    process.exit(1);
  }

  const entry = {
    timestamp: new Date().toISOString(),
    note,
    tags,
    source,
  };

  saveEntry(entry);
  console.log(`✅ Stored knowledge entry${tags.length ? ` with tags: ${tags.join(", ")}` : ""}.`);
}

if (!MODE || MODE === "--help" || MODE === "-h") {
  usage(0);
}

if (MODE === "retrieve") {
  retrieveKnowledge(args);
} else if (MODE === "store") {
  storeKnowledge(args);
} else {
  console.error(`❌ Unknown mode "${MODE}". Expected "retrieve" or "store".`);
  usage(1);
}
