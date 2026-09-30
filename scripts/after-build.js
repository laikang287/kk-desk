const fs = require("node:fs");
const path = require("node:path");

module.exports = async function afterAllArtifactBuild(context) {
  const outputDir = context.outDir;
  const appDir = path.join(outputDir, "win-unpacked");
  if (!fs.existsSync(appDir)) return [];

  const { productName, version } = require("../package.json");
  const buildArch = context.arch ?? process.arch;
  const arch = buildArch === 1 ? "x64" : String(buildArch);
  const portableDir = path.join(
    outputDir,
    `${productName.replace(/\s+/g, "-")}-${version}-${arch}-portable`,
  );

  fs.rmSync(portableDir, { recursive: true, force: true });
  fs.renameSync(appDir, portableDir);

  for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
    if (entry.isFile() && /^KK Desk-.*-portable\.exe$/i.test(entry.name)) {
      fs.rmSync(path.join(outputDir, entry.name));
    }
  }

  return [];
};
