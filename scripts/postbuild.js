import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const docsDir = path.resolve('docs');

// Ensure docs directory exists
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// Copy dist to docs
fs.cpSync(distDir, docsDir, { recursive: true });

// Create .nojekyll
fs.writeFileSync(path.join(distDir, '.nojekyll'), '# Disable Jekyll for GitHub Pages\n');
fs.writeFileSync(path.join(docsDir, '.nojekyll'), '# Disable Jekyll for GitHub Pages\n');

// Create 404.html fallback from index.html for SPA routing
const indexHtmlDist = path.join(distDir, 'index.html');
if (fs.existsSync(indexHtmlDist)) {
  fs.copyFileSync(indexHtmlDist, path.join(distDir, '404.html'));
  fs.copyFileSync(indexHtmlDist, path.join(docsDir, '404.html'));
}

console.log('✓ Postbuild complete: docs folder ready, .nojekyll and 404.html generated.');
