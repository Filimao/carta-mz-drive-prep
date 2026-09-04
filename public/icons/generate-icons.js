import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const svgPath = join(__dirname, 'icon-512.svg');

// Convert SVG to 512x512 PNG
sharp(svgPath)
  .resize(512, 512, { fit: 'contain', background: { r: 11, g: 18, b: 32 } })
  .png()
  .toFile(join(__dirname, 'icon-512.png'), (err, info) => {
    if (err) {
      console.error('Erro ao converter 512x512:', err);
    } else {
      console.log('✓ icon-512.png criado:', info);
    }
  });

// Convert SVG to 192x192 PNG
sharp(svgPath)
  .resize(192, 192, { fit: 'contain', background: { r: 11, g: 18, b: 32 } })
  .png()
  .toFile(join(__dirname, 'icon-192.png'), (err, info) => {
    if (err) {
      console.error('Erro ao converter 192x192:', err);
    } else {
      console.log('✓ icon-192.png criado:', info);
    }
  });

