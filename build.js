const fs = require("fs");
const path = require("path");
const CleanCSS = require("clean-css");
const { minify } = require("terser");
const { pages, manifest, sitemap, robots } = require("./src/build/render");

const root = __dirname;
const dist = path.join(root, "dist");

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else if (entry.isFile()) copyFile(from, to);
  }
}

async function main() {
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
  copyDir(path.join(root, "images"), path.join(dist, "images"));
  copyDir(path.join(root, "fonts"), path.join(dist, "fonts"));
  copyDir(path.join(root, "data"), path.join(dist, "data"));
  copyDir(path.join(root, "assets"), dist);
  copyFile(path.join(root, "site-config.js"), path.join(dist, "site-config.js"));

  const commerceSrc = fs.readFileSync(path.join(root, "shared/commerce.js"), "utf8");
  const storeSrc = fs.readFileSync(path.join(root, "src/js/store.js"), "utf8");
  const commerceMin = await minify(commerceSrc, { compress: true, mangle: true });
  const storeMin = await minify(storeSrc, { compress: true, mangle: true });
  if (!commerceMin.code || !storeMin.code) throw new Error("JavaScript minify failed");
  fs.writeFileSync(path.join(dist, "commerce.js"), commerceMin.code);
  fs.writeFileSync(path.join(dist, "store.js"), storeMin.code);

  const css = fs.readFileSync(path.join(root, "src/css/styles.css"), "utf8");
  const minCss = new CleanCSS({ level: 1 }).minify(css);
  if (minCss.errors && minCss.errors.length) throw new Error(minCss.errors.join("\n"));
  fs.writeFileSync(path.join(dist, "styles.css"), minCss.styles);

  for (const page of pages()) {
    const dest = path.join(dist, page.file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, page.html);
  }
  fs.writeFileSync(path.join(dist, "site.webmanifest"), manifest());
  fs.writeFileSync(path.join(dist, "sitemap.xml"), sitemap());
  fs.writeFileSync(path.join(dist, "robots.txt"), robots());
  const cssKb = (Buffer.byteLength(minCss.styles) / 1024).toFixed(1);
  const jsKb = ((Buffer.byteLength(commerceMin.code) + Buffer.byteLength(storeMin.code)) / 1024).toFixed(1);
  console.log("Built " + pages().length + " pages. CSS " + cssKb + " KB, JS " + jsKb + " KB.");
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
