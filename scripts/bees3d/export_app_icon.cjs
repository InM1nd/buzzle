// Export platform icon sizes from the approved sprite without redrawing it.
const fs = require('node:fs/promises');
const path = require('node:path');
const { generateImageAsync, generateImageBackgroundAsync, compositeImagesAsync } = require('@expo/image-utils');
const { getJimpImageAsync } = require('@expo/image-utils/build/jimp');

async function main() {
  const projectRoot = path.resolve(__dirname, '../..');
  const src = path.join(projectRoot, 'assets/art/bees-prototype/zhuzha-reference.png');
  const backgroundColor = '#FFF6E3';
  async function exportIcon(name, spriteSize, color, size = 1024) {
    const foreground = await generateImageAsync({ projectRoot }, {
      src, width: spriteSize, height: spriteSize, resizeMode: 'contain', backgroundColor: '#00000000',
    });
    const background = await generateImageBackgroundAsync({
      width: size, height: size, resizeMode: 'contain', backgroundColor: color,
    });
    let source = await compositeImagesAsync({ foreground: foreground.source, background,
      x: Math.round((size - spriteSize) / 2), y: Math.round((size - spriteSize) / 2) });
    // Jimp compositing can leave alpha 254 after rounding; standard icons must be opaque.
    if (color !== '#00000000') {
      const image = await getJimpImageAsync(source);
      for (let i = 3; i < image.bitmap.data.length; i += 4) image.bitmap.data[i] = 255;
      source = await image.getBufferAsync('image/png');
    }
    await fs.writeFile(path.join(projectRoot, 'assets', name), source);
  }
  await exportIcon('icon-zhuzha.png', 840, backgroundColor);
  await exportIcon('android-icon-zhuzha-foreground.png', 580, '#00000000');
  await exportIcon('favicon-zhuzha.png', 120, backgroundColor, 128);
  console.log('Exported standard icon, adaptive foreground and favicon from the approved sprite.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
