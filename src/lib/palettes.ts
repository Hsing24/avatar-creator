export type FourTonePalette = [string, string, string, string]; // [Tone0: Deep Outline, Tone1: Dark Shade, Tone2: Mid Light, Tone3: Highlight]

export type ColorMode = 'mono' | 'palette';

export interface PalettePreset {
  id: string;
  name: string;
  subtitle: string;
  colors: FourTonePalette;
}

/**
 * 1-Bit 原始黑白線稿模式配色（對應 8-bit_3.jpg）
 * 僅使用碳黑 (#141414) 與紙白 (#F0F0F0)
 */
export const MONO_PALETTE: [string, string] = ['#141414', '#F0F0F0'];

/**
 * 內建 2-Bit (4色階) 經典復古掌機色票主題
 * 第一組即為 8-bit_2.jpg 的原生 Game Boy BGB 綠色調色盤
 */
export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: 'gb-classic',
    name: '經典掌機綠',
    subtitle: '8-bit_2 原生配色',
    colors: ['#081820', '#346856', '#88C070', '#E0F8D0'],
  },
  {
    id: 'virtual-red',
    name: '赤紅虛擬機',
    subtitle: 'Virtual Boy 1995',
    colors: ['#1C0508', '#6E1423', '#D13B40', '#FFCCD2'],
  },
  {
    id: 'amber-crt',
    name: '復古琥珀映像管',
    subtitle: 'Amber Phosphor',
    colors: ['#1F1105', '#6E3B0C', '#CC7A18', '#FFE8B8'],
  },
  {
    id: 'cyber-neon',
    name: '電馭紫青霓虹',
    subtitle: 'Night City 2-Bit',
    colors: ['#140A29', '#4A2480', '#2CC5C5', '#D6FFFF'],
  },
  {
    id: 'sakura-bit',
    name: '昭和櫻吹雪',
    subtitle: 'Sakura Cassette',
    colors: ['#240D1B', '#732C52', '#D96B98', '#FFE6F0'],
  },
  {
    id: 'ocean-quest',
    name: '深海勇者藍',
    subtitle: 'Oceanic Cartridge',
    colors: ['#091929', '#1F5278', '#4EA8CC', '#DCF5FF'],
  },
  {
    id: 'pocket-grey',
    name: '口袋銀灰階',
    subtitle: 'GB Pocket LCD',
    colors: ['#181818', '#585858', '#A4A4A4', '#ECECEC'],
  },
  {
    id: 'earth-rpg',
    name: '荒野大冒險',
    subtitle: 'Famicom Dessert',
    colors: ['#211510', '#6B442A', '#C48A47', '#F7E6C4'],
  },
];

// --- Color Conversion Helpers ---

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '').trim();
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean.padEnd(6, '0');
  const num = parseInt(full.slice(0, 6), 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 當使用者挑選任意 1 個主色時，自動運用像素藝術色相偏移（Hue Shifting）與明度階梯，
 * 推算出和諧且對比分明的 4 階色系調配：
 * - Tone 0 (極暗輪廓): 明度 ~9%，色相微偏冷藍紫
 * - Tone 1 (深色陰影): 明度 ~34%，色相微偏深沉
 * - Tone 2 (中亮主色): 明度 ~64%，保留使用者所選主色精神
 * - Tone 3 (高光亮色): 明度 ~91%，色相微偏暖亮
 */
export function generatePaletteFromSeedColor(seedHex: string): FourTonePalette {
  const [r, g, b] = hexToRgb(seedHex);
  const [h, s] = rgbToHsl(r, g, b);

  // 若使用者選的是極低飽和度（灰黑白），保持灰階調性
  const isNeutral = s < 8;
  const baseSat = isNeutral ? s : Math.max(38, Math.min(82, s));

  const tone0 = hslToHex(isNeutral ? h : h + 22, isNeutral ? s : Math.min(70, baseSat + 8), 9);
  const tone1 = hslToHex(isNeutral ? h : h + 10, isNeutral ? s : Math.max(32, baseSat - 6), 34);
  const tone2 = hslToHex(h, isNeutral ? s : baseSat, 63);
  const tone3 = hslToHex(isNeutral ? h : h - 12, isNeutral ? s : Math.max(35, baseSat - 5), 91);

  return [tone0, tone1, tone2, tone3];
}
