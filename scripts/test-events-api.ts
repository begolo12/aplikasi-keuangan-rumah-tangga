import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('✓ Checking API route files...\n');

// Check main events route
try {
  const eventsRoute = readFileSync(join(__dirname, '../src/app/api/events/route.ts'), 'utf8');
  if (eventsRoute.includes('export async function GET') && 
      eventsRoute.includes('export async function POST')) {
    console.log('✅ src/app/api/events/route.ts - GET & POST handlers present');
  } else {
    console.log('❌ Missing GET or POST handler in events/route.ts');
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Cannot read events/route.ts:', e.message);
  process.exit(1);
}

// Check events/[id] route
try {
  const idRouteContent = readFileSync(join(__dirname, '../src/app/api/events/[id]/route.ts'), 'utf8');
  if (idRouteContent.includes('export async function GET') && 
      idRouteContent.includes('export async function PUT') &&
      idRouteContent.includes('export async function DELETE')) {
    console.log('✅ src/app/api/events/[id]/route.ts - GET, PUT, DELETE handlers present');
  } else {
    console.log('❌ Missing GET/PUT/DELETE handler in events/[id]/route.ts');
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Cannot read events/[id]/route.ts:', e.message);
  process.exit(1);
}

// Check export route
try {
  const exportRoute = readFileSync(join(__dirname, '../src/app/api/events/export/route.ts'), 'utf8');
  if (exportRoute.includes('export async function GET') &&
      exportRoute.includes('ical.js') &&
      exportRoute.includes('generateIcsFile')) {
    console.log('✅ src/app/api/events/export/route.ts - iCal export present');
  } else {
    console.log('❌ Export route missing iCal generation');
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Cannot read export/route.ts:', e.message);
  process.exit(1);
}

// Check types.ts for FinancialEvent interface
try {
  const typesContent = readFileSync(join(__dirname, '../src/lib/types.ts'), 'utf8');
  if (typesContent.includes('export type EventType') &&
      typesContent.includes('export interface FinancialEvent')) {
    console.log('✅ src/lib/types.ts - FinancialEvent interface defined');
  } else {
    console.log('❌ FinancialEvent not found in types.ts');
    process.exit(1);
  }
} catch (e) {
  console.error('❌ Cannot read types.ts:', e.message);
  process.exit(1);
}

// Check dependencies
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));
  if (pkg.dependencies['ical.js']) {
    console.log('✅ package.json - ical.js dependency added');
  } else {
    console.log('⚠️  ical.js dependency might be missing');
  }
} catch (e) {
  console.log('⚠️  Could not check package.json');
}

console.log('\n✅ All API routes successfully created!');
console.log('\nAPI Endpoints:');
console.log('  GET  /api/events        - List all financial events');
console.log('  POST /api/events        - Create new financial event');
console.log('  GET  /api/events/:id    - Get single event');
console.log('  PUT  /api/events/:id    - Update event');
console.log('  DELETE /api/events/:id  - Delete event');
console.log('  GET  /api/events/export - Export to iCal format');

process.exit(0);
