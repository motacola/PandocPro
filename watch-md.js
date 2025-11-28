const { spawn } = require("child_process");
const chokidar = require("chokidar");
const path = require("path");
const fs = require("fs");

// Get files from environment or use defaults
const DOCX = process.env.DOCX_FILE || "docs/presentation.docx";
const MD = process.env.MD_FILE || "docs/presentation.md";
const SCRIPT = path.join(__dirname, "scripts", "docx-sync.sh");

console.log(`\n📝 Watching: ${MD}`);
console.log(`📘 Will export to: ${DOCX}\n`);

function deriveOutput(mode) {
  switch (mode) {
    case "to-pdf":
      return MD.replace(/\.[^.]+$/, ".pdf");
    case "to-html":
      return MD.replace(/\.[^.]+$/, ".html");
    case "to-pptx":
      return MD.replace(/\.[^.]+$/, ".pptx");
    case "to-docx":
    case "auto":
      return undefined;
    default:
      return undefined;
  }
}

function runExport(mode, outputOverride) {
  return new Promise((resolve, reject) => {
    const args = [DOCX, MD, mode === "auto" ? "auto" : mode];
    if (outputOverride) args.push(outputOverride);
    const p = spawn(SCRIPT, args, { stdio: "inherit" });
    p.on("error", (error) => reject(error));
    p.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Export failed with exit code ${code}`));
      }
    });
  });
}

const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith("--mode="));
const MODE = modeArg ? modeArg.split("=")[1] : "to-docx";
const allowedModes = new Set(["to-docx", "to-pptx", "to-pdf", "to-html", "auto"]);
if (!allowedModes.has(MODE)) {
  console.error(`❌ Unknown mode: ${MODE}. Use one of: to-docx, to-pptx, to-pdf, to-html, auto.`);
  process.exit(1);
}
const OUTPUT_OVERRIDE = deriveOutput(MODE);
const QUIET = args.includes("--quiet");
const NOTIFY = args.includes("--notify");

function fileSizeLabel(filePath) {
  try {
    const { size } = fs.statSync(filePath);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  } catch (_) {
    return "";
  }
}

if (args.includes("--once")) {
  runExport(MODE, OUTPUT_OVERRIDE).then(() => {
    const target = OUTPUT_OVERRIDE || DOCX;
    const sizeLabel = fileSizeLabel(target);
    if (!QUIET) {
      console.log(`✅ Export complete${sizeLabel ? ` (${sizeLabel})` : ""}${OUTPUT_OVERRIDE ? ` → ${OUTPUT_OVERRIDE}` : ""}`);
    }
    if (NOTIFY && process.platform === "darwin") {
      spawn("osascript", ["-e", `display notification \"Export done (${MODE})\" with title \"watch-md\"`]).on("error", () => { });
    }
  }).catch((e) => { console.error("❌", e.message); process.exit(1); });
} else {
  const watcher = chokidar.watch(MD, { ignoreInitial: true });
  const debounceMs = process.env.WATCH_DEBOUNCE_MS ? Number(process.env.WATCH_DEBOUNCE_MS) : 250;
  const maxDebounceMs = debounceMs * 4; // Max 1000ms for 250ms base
  let timer = null;
  let debounceStart = null;
  let running = false;
  let pending = false;

  const normalizedMd = path.normalize(MD);

  const triggerExport = async () => {
    if (running) {
      pending = true;
      return;
    }
    running = true;
    pending = false;
    if (!QUIET) {
      console.log(`\n✏️  Change detected: ${path.basename(MD)}`);
      console.log(`🔄 Exporting via mode: ${MODE}...`);
    }
    try {
      await runExport(MODE, OUTPUT_OVERRIDE);
      if (!QUIET) {
        const target = OUTPUT_OVERRIDE || DOCX;
        const sizeLabel = fileSizeLabel(target);
        const targetMsg = OUTPUT_OVERRIDE ? ` → ${OUTPUT_OVERRIDE}` : "";
        console.log(`✅ Export complete${sizeLabel ? ` (${sizeLabel})` : ""}${targetMsg}\n`);
      }
      if (NOTIFY && process.platform === "darwin") {
        spawn("osascript", ["-e", `display notification "Export done (${MODE})" with title "watch-md"`]).on("error", () => { });
      }
    } catch (e) {
      console.error("❌ Export failed:", e.message);
      console.error("ℹ️  Run './scripts/docx-sync.sh' directly for more details.");
    } finally {
      running = false;
      debounceStart = null;
      if (pending) {
        clearTimeout(timer);
        timer = setTimeout(triggerExport, debounceMs);
      }
    }
  };

  watcher.on("change", (fp) => {
    if (path.normalize(fp) !== normalizedMd) return;

    // Track debounce start time for max wait
    if (!debounceStart) {
      debounceStart = Date.now();
    }

    clearTimeout(timer);

    // Calculate remaining time before max debounce is reached
    const elapsedMs = Date.now() - debounceStart;
    const timeoutMs = Math.min(debounceMs, Math.max(0, maxDebounceMs - elapsedMs));

    if (timeoutMs === 0) {
      // Max wait time reached, trigger immediately
      triggerExport();
    } else {
      timer = setTimeout(triggerExport, timeoutMs);
    }
  });
  console.log("👀 Watching for changes... (Press Ctrl+C to stop)\n");
}
