const fs = require('fs');

let content = fs.readFileSync('main.js', 'utf8');

// Find the line with LOCALAPPDATA and replace with simpler approach
content = content.replace(
  /path\.join\(process\.env\.LOCALAPPDATA \|\| '', 'Programs', 'Python'\),/,
  `'C:\\Program Files\\\\Python313\\\\python.exe',\n        $&'
);

fs.writeFileSync('main.js', content, 'utf8');
console.log('Fixed');
