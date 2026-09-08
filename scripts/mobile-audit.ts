/**
 * Mobile UI/UX Audit Script
 * Run: npx tsx scripts/mobile-audit.ts
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-min-32-chars-long';

import { readFileSync } from 'fs';
import { join } from 'path';

let passed = 0;
let failed = 0;

function assert(desc: string, cond: boolean) {
  if (cond) { console.log('✅ ' + desc); passed++; }
  else { console.log('❌ ' + desc); failed++; }
}

console.log('\n========================================');
console.log('Mobile UI/UX Audit Suite');
console.log('Viewport Targets: 390x844, 375x812');
console.log('========================================\n');

const bottomNav = readFileSync(join(process.cwd(), 'src/components/layout/BottomNav.tsx'), 'utf8');
const button = readFileSync(join(process.cwd(), 'src/components/ui/Button.tsx'), 'utf8');
const modal = readFileSync(join(process.cwd(), 'src/components/ui/Modal.tsx'), 'utf8');
const globalsCss = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
const layout = readFileSync(join(process.cwd(), 'src/app/layout.tsx'), 'utf8');
const manifest = JSON.parse(readFileSync(join(process.cwd(), 'public/manifest.json'), 'utf8'));

console.log('[1] TOUCH TARGETS >= 44x44px\n');
assert('Button md min-h-[44px]', button.includes('min-h-[44px]'));
assert('Button icon min-w/h-[44px]', button.includes('min-w-[44px]') && button.includes('min-h-[44px]'));
assert('BottomNav tabs min-h-[46px]', bottomNav.includes('min-h-[46px]'));
assert('BottomNav FAB w-14 h-14', bottomNav.includes('w-14 h-14'));

console.log('\n[2] SAFE AREA INSETS\n');
assert('BottomNav safe-area inset', bottomNav.includes('env(safe-area-inset-bottom)'));
assert('Modal safe-area inset', modal.includes('env(safe-area-inset-bottom)'));
assert('Body padding-safe-area', globalsCss.includes('padding-bottom: env(safe-area-inset-bottom)'));

console.log('\n[3] THEME CONTRAST COLORS\n');
assert('CSS :root light mode', globalsCss.includes(':root'));
assert('CSS .dark mode', globalsCss.includes('.dark'));
assert('Primary hover state', globalsCss.includes('--color-primary-hover:'));
assert('Text muted contrast', globalsCss.includes('--color-text-muted:'));

console.log('\n[4] VIEWPORT METADATA\n');
assert('width=device-width', layout.includes("width: 'device-width'"));
assert('initialScale=1', layout.includes("initialScale: 1"));
assert('viewportFit cover', layout.includes("viewportFit: 'cover'"));

console.log('\n[5] PWA MANIFEST\n');
assert('Manifest display standalone', ['standalone', 'fullscreen'].includes(manifest.display || ''));
assert('Manifest start_url', Boolean(manifest.start_url));

console.log('\n[6] RESPONSIVE GRID/FLEX\n');
assert('md:hidden for mobile nav', bottomNav.includes('md:hidden'));
assert('transition-transform animations', bottomNav.includes('transition-transform'));

console.log('\n========================================');
console.log(`Summary: ${passed} passed, ${failed} failed`);
console.log('========================================\n');

if (failed > 0) process.exit(1);
