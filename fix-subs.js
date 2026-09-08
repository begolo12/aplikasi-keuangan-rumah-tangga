const fs = require('fs');

let content = fs.readFileSync('src/app/api/init/route.ts', 'utf8');

// Fix: missing semicolon after backtick closing on line 335
// Replace `)  \n\n  // with `);\n\n  //
content = content.replace(/`\)\\n\\n  (\/\/ Budget)/, '`);\n\n  // Budget');

fs.writeFileSync('src/app/api/init/route.ts', content, 'utf8');
console.log('Fixed semicolon and spacing');
