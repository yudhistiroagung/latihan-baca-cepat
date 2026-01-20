const fs = require('fs');
const path = require('path');

const root = __dirname;
const outDir = path.join(root, 'build');

function ensureDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function tryRequire(name) {
  try {
    return require(name);
  } catch (_) {
    return null;
  }
}

function minifyJS(code) {
  const terser = tryRequire('terser');
  if (terser) {
    return terser.minify(code).then((r) => r.code || code);
  }
  return Promise.resolve(
    code
      .replace(/\/\/[^\n\r]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\s{2,}/g, ' ')
  );
}

function minifyCSS(code) {
  const csso = tryRequire('csso');
  if (csso) {
    return csso.minify(code).css || code;
  }
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function run() {
  ensureDir(outDir);
  const indexPath = path.join(root, 'index.html');
  const appJsPath = path.join(root, 'app.js');
  const cssPath = path.join(root, 'styles.css');
  const dataPath = path.join(root, 'quizzes.json');

  const indexHtml = fs.readFileSync(indexPath, 'utf8');
  const appJs = fs.readFileSync(appJsPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  const quizzes = fs.readFileSync(dataPath, 'utf8');

  const minAppJs = await minifyJS(appJs);
  const minCss = minifyCSS(css);

  const useMinNames = true;
  const outIndex = indexHtml
    .replace(/href="styles\.css"/, `href="${useMinNames ? 'styles.min.css' : 'styles.css'}"`)
    .replace(/src="app\.js"/, `src="${useMinNames ? 'app.min.js' : 'app.js'}"`);

  fs.writeFileSync(path.join(outDir, 'index.html'), outIndex, 'utf8');
  fs.writeFileSync(path.join(outDir, useMinNames ? 'app.min.js' : 'app.js'), minAppJs, 'utf8');
  fs.writeFileSync(path.join(outDir, useMinNames ? 'styles.min.css' : 'styles.css'), minCss, 'utf8');
  fs.writeFileSync(path.join(outDir, 'quizzes.json'), quizzes, 'utf8');

  console.log('Build complete:', outDir);
}

run().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
