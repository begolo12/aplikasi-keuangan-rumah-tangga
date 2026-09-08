const fs = require('fs');

let content = fs.readFileSync('src/app/api/init/route.ts', 'utf8');

// Fix line 335: add semicolon and remove extra blank line
// Windows CRLF line endings
content = content.replace(
    '    `)\r\n\r\n    // Budget',
    '    `);\r\n\r\n    // Budget'
);

fs.writeFileSync('src/app/api/init/route.ts', content, 'utf8');
console.log('Fixed line 335 - added semicolon');
