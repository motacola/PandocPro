const { spawn } = require("child_process");
const chokidar = require("chokidar");
const path = require("path");

// Get files from environment or use defaults
const DOCX = process.env.DOCX_FILE || "docs/presentation.docx";
const MD = process.env.MD_FILE || "docs/presentation.md";
const SCRIPT = "./scripts/docx-sync.sh";

console.log(`\n📝 Watching: ${MD}`);
console.log(`📘 Will export to: ${DOCX}\n`);

function runExport() {
  return new Promise((resolve, reject) => {
    const p = spawn(SCRIPT, [DOCX, MD, "to-docx"], { stdio: "inherit", shell: true });
    p.on("close", (code) => (code === 0 ? resolve() : reject(new Error("Export failed"))));
  });
}

const args = process.argv.slice(2);
if (args.includes("--once")) {
  runExport().catch((e) => { console.error(e.message); process.exit(1); });
} else {
  const watcher = chokidar.watch(MD, { ignoreInitial: true });
  watcher.on("change", async (fp) => {
    if (path.normalize(fp) !== path.normalize(MD)) return;
    console.log(`\n✏️  Change detected: ${path.basename(fp)}`);
    console.log("🔄 Exporting to Word...");
    try { 
      await runExport();
      console.log("✅ Export complete!\n");
    } catch (e) { 
      console.error("❌", e.message); 
    }
  });
  console.log("👀 Watching for changes... (Press Ctrl+C to stop)\n");
}
