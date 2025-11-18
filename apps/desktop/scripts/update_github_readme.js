/**
 * Automated GitHub README Update Script
 * Updates README.md with latest showcase images, acknowledgements, and sponsor section
 */

const fs = require('fs');
const path = require('path');

// Calculate paths relative to script location
// Script is at: apps/desktop/scripts/update_github_readme.js
// README is at: README.md (root)
// Showcase is at: apps/desktop/assets/showcase
const DESKTOP_DIR = path.join(__dirname, '..');
const ROOT_DIR = path.join(DESKTOP_DIR, '..', '..');
let README_PATH = path.join(ROOT_DIR, 'README.md');
const SHOWCASE_DIR = path.join(DESKTOP_DIR, 'assets', 'showcase');

// Ensure we're using the correct paths
if (!fs.existsSync(README_PATH)) {
  // Try alternative path (if running from different location)
  const altPath = path.join(__dirname, '..', '..', 'README.md');
  if (fs.existsSync(altPath)) {
    README_PATH = altPath;
  } else {
    // Try current working directory
    const cwdPath = path.join(process.cwd(), 'README.md');
    if (fs.existsSync(cwdPath)) {
      README_PATH = cwdPath;
    }
  }
}

// Development tools to acknowledge
const DEV_TOOLS = [
  { name: 'Cursor', description: 'Primary IDE with AI-powered development assistance' },
  { name: 'VSCode', description: 'Code editor for development and debugging' },
  { name: 'KiloCode', description: 'AI coding assistant for enhanced productivity' },
  { name: 'Klein', description: 'Development tool for code optimization' },
  { name: 'RooCode', description: 'AI-powered code generation and refactoring' }
];

function getShowcaseImages() {
  const images = [];
  
  if (!fs.existsSync(SHOWCASE_DIR)) {
    console.warn('Showcase directory not found:', SHOWCASE_DIR);
    return images;
  }
  
  const files = fs.readdirSync(SHOWCASE_DIR)
    .filter(file => file.endsWith('.png') && !file.includes('banner'))
    .sort();
  
  files.forEach((file, index) => {
    const num = String(index + 1).padStart(2, '0');
    const name = file.replace('.png', '').replace(/^\d+-/, '');
    images.push({
      num,
      file,
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' ')
    });
  });
  
  return images;
}

function generateShowcaseSection(images) {
  if (images.length === 0) {
    return `\n<div align="center">\n\n*Showcase images will appear here after running \`npm run showcase\`*\n\n</div>\n`;
  }
  
  const rows = [];
  const imagesPerRow = 3;
  
  for (let i = 0; i < images.length; i += imagesPerRow) {
    const rowImages = images.slice(i, i + imagesPerRow);
    const cells = rowImages.map(img => 
      `    <td><img src="apps/desktop/assets/showcase/${img.file}" alt="${img.name}" width="300"></td>`
    ).join('\n');
    
    // Fill empty cells
    while (rowImages.length < imagesPerRow) {
      cells += '\n    <td></td>';
      rowImages.push(null);
    }
    
    rows.push(`  <tr>\n${cells}\n  </tr>`);
  }
  
  return `
<div align="center">

### Full Gallery

<table>
${rows.join('\n')}
  
  <tr>
    <td colspan="3">
      <sub>Screenshots are auto-generated via <code>npm run showcase</code> and saved to <code>apps/desktop/assets/showcase/</code>.</sub>
    </td>
  </tr>
  
</table>

</div>
`;
}

function generateAcknowledgementsSection() {
  const toolsList = DEV_TOOLS.map(tool => 
    `- **${tool.name}** – ${tool.description}`
  ).join('\n');
  
  return `
### ⚙️ Development Tools

This project was built using the following development tools and AI assistants:

${toolsList}

> These tools enabled rapid development and professional-grade code quality as a solo developer.
`;
}

function generateSponsorSection() {
  return `
---

## 💎 Sponsors & Support

### Cursor Ultra Sponsorship

This project is made possible thanks to **Cursor Ultra** subscription, which provides:

- 🚀 **Advanced AI Features**: Enhanced code completion and generation
- ⚡ **Faster Development**: Accelerated development cycles
- 🎯 **Better Code Quality**: AI-powered code review and optimization
- 💼 **Professional Tools**: Enterprise-grade development environment

**Want to support continued development?**

If you find SONU useful and want to help maintain and improve it, consider:

- ⭐ **Star the repository** – Show your support
- 🐛 **Report issues** – Help improve the app
- 💡 **Suggest features** – Share your ideas
- 💰 **Sponsor development** – Help cover Cursor Ultra costs

Your support enables continued development and feature additions. Thank you! 🙏

<div align="center">

[![Sponsor](https://img.shields.io/badge/Sponsor-Cursor%20Ultra-purple?style=for-the-badge)](https://cursor.sh)

*Supporting professional AI-augmented development*

</div>

---
`;
}

function updateREADME() {
  console.log('📝 Updating GitHub README...');
  
  if (!fs.existsSync(README_PATH)) {
    console.error('README.md not found at:', README_PATH);
    return false;
  }
  
  let readme = fs.readFileSync(README_PATH, 'utf8');
  
  // Get showcase images
  const images = getShowcaseImages();
  console.log(`Found ${images.length} showcase images`);
  
  // Update showcase section
  const showcaseRegex = /## 📸 Showcase[\s\S]*?(?=---|\n## |$)/;
  const newShowcaseSection = `## 📸 Showcase${generateShowcaseSection(images)}`;
  
  if (showcaseRegex.test(readme)) {
    readme = readme.replace(showcaseRegex, newShowcaseSection);
    console.log('✅ Updated showcase section');
  } else {
    // Insert after overview section
    const overviewEnd = readme.indexOf('---', readme.indexOf('## 🚀 Overview'));
    if (overviewEnd !== -1) {
      readme = readme.slice(0, overviewEnd) + newShowcaseSection + '\n\n' + readme.slice(overviewEnd);
      console.log('✅ Added showcase section');
    }
  }
  
  // Update development tools section
  const devToolsRegex = /### ⚙️ Development Tools[\s\S]*?(?=---|\n## |$)/;
  const newDevToolsSection = generateAcknowledgementsSection();
  
  if (devToolsRegex.test(readme)) {
    readme = readme.replace(devToolsRegex, newDevToolsSection);
    console.log('✅ Updated development tools section');
  } else {
    // Add before Acknowledgements section
    const ackIndex = readme.indexOf('## 🙏 Acknowledgements');
    if (ackIndex !== -1) {
      readme = readme.slice(0, ackIndex) + newDevToolsSection + '\n\n' + readme.slice(ackIndex);
      console.log('✅ Added development tools section');
    }
  }
  
  // Update footer to remove TraeAI reference
  readme = readme.replace(/Made with ❤️ by a solo developer using TraeAI IDE and AI assistance/g, 
    'Made with ❤️ by a solo developer using Cursor, VSCode, and AI-powered development tools');
  
  // Add sponsor section before Support section
  const supportIndex = readme.indexOf('## 📞 Support');
  if (supportIndex !== -1 && !readme.includes('## 💎 Sponsors & Support')) {
    const sponsorSection = generateSponsorSection();
    readme = readme.slice(0, supportIndex) + sponsorSection + '\n\n' + readme.slice(supportIndex);
    console.log('✅ Added sponsor section');
  }
  
  // Update acknowledgements footer
  readme = readme.replace(/Built independently and completely offline with respect for all the creators above\./g,
    'Built independently and completely offline with respect for all the creators above. Special thanks to Cursor Ultra for enabling professional-grade AI-augmented development.');
  
  // Write updated README
  fs.writeFileSync(README_PATH, readme, 'utf8');
  console.log('✅ README.md updated successfully');
  
  return true;
}

// Run if called directly
if (require.main === module) {
  const success = updateREADME();
  process.exit(success ? 0 : 1);
}

module.exports = { updateREADME, generateShowcaseSection, generateSponsorSection };

