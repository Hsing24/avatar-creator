import {
  type AvatarState,
  type AvatarPartItem,
  type BgStyleId,
  type PartCategoryKey,
  type SkinToneLevel,
  FACES,
  HAIRS,
  EYEBROWS,
  EYES,
  NOSES,
  MOUTHS,
  GLASSES,
  BEARDS,
  DETAILS,
  CLOTHES,
} from './avatar-data';
import { type ColorMode, type FourTonePalette, MONO_PALETTE } from './palettes';

export const GRID_SIZE = 32;

/**
 * 依固定 32x32 座標系，將 10 個獨立部位元素由底至頂疊加合成
 */
export function composeAvatarTokens(state: AvatarState): string[][] {
  const grid: string[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => '.')
  );

  const hairItem = HAIRS[state.hair] ?? HAIRS[1];
  const hideEar = Boolean(hairItem?.coversEar);

  const applyPart = (item: AvatarPartItem | undefined, skipLeftEar = false) => {
    if (!item) return;
    for (const [y, x, token] of item.patches) {
      if (skipLeftEar && x < 9 && y >= 12 && y <= 18) {
        continue;
      }
      if (y >= 0 && y < GRID_SIZE && x >= 0 && x < GRID_SIZE) {
        grid[y][x] = token;
      }
    }
  };

  // Z-order 固定座標圖層堆疊：
  // 1. 臉型外框、耳朵與脖子 (y: 4..28；若配戴全包覆兜帽/鮑伯頭則自動收起外露左耳)
  applyPart(FACES[state.face] ?? FACES[0], hideEar);

  // 2. 衣領與服裝 (y: 25..31)
  applyPart(CLOTHES[state.clothing] ?? CLOTHES[0]);

  // 3. 裝飾細節：腮紅、耳環、美人痣、傷疤
  applyPart(DETAILS[state.detail] ?? DETAILS[0], hideEar);

  // 4. 眉毛 (y: 10..13)
  applyPart(EYEBROWS[state.eyebrows] ?? EYEBROWS[0]);

  // 5. 眼睛 (y: 12..16)
  applyPart(EYES[state.eyes] ?? EYES[0]);

  // 6. 鼻子 (y: 13..20)
  applyPart(NOSES[state.nose] ?? NOSES[0]);

  // 7. 鬍鬚 (y: 18..25，位於嘴巴底層讓嘴唇在落腮鬍中清晰可見)
  applyPart(BEARDS[state.beard] ?? BEARDS[0]);

  // 8. 嘴巴 (y: 19..24)
  applyPart(MOUTHS[state.mouth] ?? MOUTHS[0]);

  // 9. 髮型與帽飾 (y: 1..28)
  applyPart(hairItem);

  // 10. 眼鏡配件 (y: 11..16，位於最上層橫跨鼻樑與雙眼)
  applyPart(GLASSES[state.glasses] ?? GLASSES[0]);

  // 若啟用水平翻轉 (Flip X)
  if (state.flipX) {
    return grid.map((row) => [...row].reverse());
  }

  return grid;
}

function resolveBgToneIndex(bgStyle: BgStyleId, x: number, y: number): 1 | 2 | 3 {
  switch (bgStyle) {
    case 'solid-1':
      return 1;
    case 'solid-2':
      return 2;
    case 'solid-3':
      return 3;
    case 'checker':
      return (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0 ? 2 : 3;
    case 'dots':
      return (x + y) % 2 === 0 ? 2 : 1;
    default:
      return 2;
  }
}

/**
 * 將語意像素代碼轉換為實際色碼
 * - 未選色 (colorMode === 'mono')：維持 8-bit_3.jpg 黑白線稿風格
 * - 已選色 (colorMode === 'palette')：以使用者顏色自動進行 4 階深淺搭配 (8-bit_2.jpg 風格)
 */
export function resolvePixelHex(
  token: string,
  x: number,
  y: number,
  state: AvatarState,
  colorMode: ColorMode,
  palette: FourTonePalette
): string {
  const [monoBlack, monoWhite] = MONO_PALETTE;

  if (colorMode === 'mono') {
    if (token === '0' || token === '1' || token === 'M' || token === 'L') {
      return monoBlack;
    }
    return monoWhite;
  }

  switch (token) {
    case '.':
      return palette[resolveBgToneIndex(state.bgStyle, x, y)];
    case 'S':
      return palette[state.skinTone];
    case 'B':
      return state.skinTone === 2 ? palette[1] : palette[2];
    case '0':
    case 'K':
      return palette[0];
    case '1':
    case 'D':
      return palette[1];
    case '2':
    case 'M':
      return palette[2];
    case '3':
    case 'L':
      return palette[3];
    default:
      return palette[0];
  }
}

/**
 * 渲染完整合成後的 32x32 大頭照至 Canvas
 */
export function renderAvatarToCanvas(
  canvas: HTMLCanvasElement,
  state: AvatarState,
  colorMode: ColorMode,
  palette: FourTonePalette,
  options: { showGrid?: boolean } = {}
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const scale = width / GRID_SIZE;
  const tokens = composeAvatarTokens(state);

  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      ctx.fillStyle = resolvePixelHex(tokens[y][x], x, y, state, colorMode, palette);
      ctx.fillRect(
        Math.floor(x * scale),
        Math.floor(y * scale),
        Math.ceil(scale),
        Math.ceil(scale)
      );
    }
  }

  if (options.showGrid && scale >= 6) {
    ctx.strokeStyle = colorMode === 'mono' ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < GRID_SIZE; i++) {
      const p = Math.floor(i * scale) + 0.5;
      ctx.moveTo(p, 0);
      ctx.lineTo(p, height);
      ctx.moveTo(0, p);
      ctx.lineTo(width, p);
    }
    ctx.stroke();
  }
}

/**
 * 各部位縮圖最小視窗尺寸，確保單一元素在選擇框中置中且清晰易辨識
 */
const MIN_THUMB_SIZE_BY_CATEGORY: Record<PartCategoryKey, number> = {
  face: 26,
  hair: 26,
  clothing: 24,
  glasses: 18,
  eyebrows: 14,
  eyes: 14,
  beard: 13,
  detail: 13,
  mouth: 11,
  nose: 10,
};

/**
 * 單獨渲染某一個「拆解出來的部位元素」至縮圖 Canvas（自動置中對齊、不含其他部位）
 */
export function renderIsolatedPartToCanvas(
  canvas: HTMLCanvasElement,
  item: AvatarPartItem,
  category: PartCategoryKey,
  colorMode: ColorMode,
  palette: FourTonePalette,
  skinTone: SkinToneLevel = 3
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;

  // 背景底色：黑白模式用乾淨白底，彩色模式用最高亮階 Tone 3 襯托單一元素
  const bgHex = colorMode === 'mono' ? '#FFFFFF' : palette[3];
  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, width, height);

  // 若為「無（空特徵）」，繪製簡約的像素斜線圓圈符號 (Ø)
  if (item.patches.length === 0) {
    const emptyColor = colorMode === 'mono' ? '#B8B8B8' : palette[1];
    const s = width / 16;
    const noneCoords = [
      [5, 6],[5, 7],[5, 8],[5, 9],
      [6, 5],[6, 9],[6, 10],
      [7, 5],[7, 8],[7, 10],
      [8, 5],[8, 7],[8, 10],
      [9, 5],[9, 6],[9, 10],
      [10, 6],[10, 7],[10, 8],[10, 9],
    ];
    ctx.fillStyle = emptyColor;
    for (const [ny, nx] of noneCoords) {
      ctx.fillRect(Math.floor(nx * s), Math.floor(ny * s), Math.ceil(s), Math.ceil(s));
    }
    return;
  }

  let minX = 32;
  let maxX = 0;
  let minY = 32;
  let maxY = 0;
  for (const [y, x] of item.patches) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  const spanX = maxX - minX + 1;
  const spanY = maxY - minY + 1;
  const minBox = MIN_THUMB_SIZE_BY_CATEGORY[category] ?? 14;
  const boxSize = Math.max(spanX + 4, spanY + 4, minBox);
  const offsetX = Math.floor((boxSize - spanX) / 2) - minX;
  const offsetY = Math.floor((boxSize - spanY) / 2) - minY;
  const scale = width / boxSize;

  const dummyState: AvatarState = {
    face: 0,
    hair: 1,
    eyebrows: 0,
    eyes: 0,
    nose: 0,
    mouth: 0,
    glasses: 0,
    beard: 0,
    detail: 0,
    clothing: 0,
    skinTone,
    bgStyle: 'solid-3',
    flipX: false,
  };

  for (const [y, x, token] of item.patches) {
    const localX = x + offsetX;
    const localY = y + offsetY;
    if (localX < 0 || localX >= boxSize || localY < 0 || localY >= boxSize) continue;

    let hex = resolvePixelHex(token, x, y, dummyState, colorMode, palette);
    if (category === 'face' && token === 'S') {
      hex = colorMode === 'mono' ? '#F5F5F5' : palette[2];
    } else if (category === 'detail' && token === 'B') {
      hex = colorMode === 'mono' ? '#141414' : palette[1];
    } else if (hex.toUpperCase() === bgHex.toUpperCase() && token !== 'S') {
      hex = colorMode === 'mono' ? '#141414' : palette[1];
    }

    ctx.fillStyle = hex;
    ctx.fillRect(
      Math.floor(localX * scale),
      Math.floor(localY * scale),
      Math.ceil(scale),
      Math.ceil(scale)
    );
  }
}

/**
 * 匯出純向量 SVG
 */
export function generateAvatarSVG(
  state: AvatarState,
  colorMode: ColorMode,
  palette: FourTonePalette
): string {
  const tokens = composeAvatarTokens(state);
  const rects: string[] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    let startX = 0;
    let currentHex = resolvePixelHex(tokens[y][0], 0, y, state, colorMode, palette);

    for (let x = 1; x <= GRID_SIZE; x++) {
      const hex =
        x < GRID_SIZE ? resolvePixelHex(tokens[y][x], x, y, state, colorMode, palette) : '';
      if (hex !== currentHex) {
        rects.push(
          `<rect x="${startX}" y="${y}" width="${x - startX}" height="1" fill="${currentHex}"/>`
        );
        startX = x;
        currentHex = hex;
      }
    }
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="512" height="512" shape-rendering="crispEdges">`,
    ...rects,
    `</svg>`,
  ].join('\n');
}

/**
 * 「一切交由上天安排」智慧隨機搭配器
 */
export function generateRandomAvatarState(prev?: AvatarState): AvatarState {
  const rand = (n: number) => Math.floor(Math.random() * n);
  const hair = rand(HAIRS.length);
  const isHoodie = Boolean(HAIRS[hair]?.coversEar && (hair === 7 || hair === 16));

  const bgChoices: BgStyleId[] = ['solid-2', 'solid-3', 'solid-1', 'checker', 'dots'];
  const skinChoices: SkinToneLevel[] = [3, 3, 2, 2, 1];

  return {
    face: rand(FACES.length),
    hair,
    eyebrows: rand(EYEBROWS.length - 1),
    eyes: hair === 16 && Math.random() < 0.6 ? 8 : rand(EYES.length),
    nose: rand(NOSES.length),
    mouth: rand(MOUTHS.length),
    glasses: Math.random() < 0.55 ? 0 : 1 + rand(GLASSES.length - 1),
    beard: isHoodie || Math.random() < 0.72 ? 0 : 1 + rand(BEARDS.length - 1),
    detail: Math.random() < 0.35 ? 0 : 1 + rand(DETAILS.length - 1),
    clothing: isHoodie ? 6 : rand(CLOTHES.length),
    skinTone: skinChoices[rand(skinChoices.length)],
    bgStyle: bgChoices[rand(bgChoices.length)],
    flipX: prev ? prev.flipX : false,
  };
}

export function createDefaultAvatarState(): AvatarState {
  return {
    face: 0,
    hair: 1, // 斜瀏海短髮
    eyebrows: 0,
    eyes: 0,
    nose: 0,
    mouth: 0,
    glasses: 0,
    beard: 0,
    detail: 1, // 雙頰腮紅
    clothing: 0, // 條紋圓領衫
    skinTone: 2,
    bgStyle: 'solid-2',
    flipX: false,
  };
}
