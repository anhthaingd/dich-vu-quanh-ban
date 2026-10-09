import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Rasterize the same Lucide icons used by Storybook; no network or native dependency.
const React = require('../../ui-ux/prototype/node_modules/react');
const { renderToStaticMarkup } = require('../../ui-ux/prototype/node_modules/react-dom/server');
const icons = require('../../ui-ux/prototype/node_modules/lucide-react');
const sharp = require('sharp');
const { copyFileSync } = require('node:fs');
(async () => {
  for (const name of ['Search', 'MapPin', 'LayoutGrid', 'Navigation', 'Briefcase', 'MessageCircle', 'Bell', 'Map', 'SlidersHorizontal', 'ChevronDown', 'ArrowUpRight', 'Wrench', 'AirVent', 'SprayCan', 'Laptop', 'Car', 'PawPrint', 'Scissors', 'Truck', 'WashingMachine', 'Router']) {
    const svg = renderToStaticMarkup(React.createElement(icons[name], {size: 72, color: '#FFFFFF', strokeWidth: 1.8}));
    await sharp(Buffer.from(svg)).png().toFile(`apps/mobile/assets/icons/${name}.png`);
  }
  copyFileSync('ui-ux/prototype/node_modules/lucide-react/LICENSE', 'apps/mobile/assets/icons/LICENSE');
})();
