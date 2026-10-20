import {
  type AvatarState,
  type AvatarPartItem,
  type AvatarPartCategoryKey,
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
  OUTFITS,
  PART_ITEMS_MAP,
} from './avatar-data';
import {
  type ColorMode,
  type FourTonePalette,
  MONO_PALETTE,
  generatePaletteFromSeedColor,
} from './palettes';

export const GRID_SIZE = 32;

const LAYER_ORDER: AvatarPartCategoryKey[] = [
  'face', 'clothing', 'detail', 'eyebrows', 'eyes', 'nose', 'beard', 'mouth', 'hair', 'glasses',
];

interface AvatarElementPart {
  category: AvatarPartCategoryKey;
  item: AvatarPartItem;
}

/** 套裝拆成實際部件，讓配色與縮圖沿用相同圖層順序。 */
export function getElementParts(category: PartCategoryKey, item: AvatarPartItem): AvatarElementPart[] {
  if (category !== 'outfit') return [{ category, item }];
  const outfit = OUTFITS.find((candidate) => candidate.id === item.id);
  return LAYER_ORDER.flatMap((key) => {
    const index = outfit?.parts[key];
    return index === undefined ? [] : [{ category: key, item: PART_ITEMS_MAP[key][index] }];
  });
}

/**
 * 依固定 32x32 座標系，將 10 個獨立部位元素由底至頂疊加合成
 */
function composeAvatarLayers(state: AvatarState) {
  const grid: string[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => '.')
  );
  const parts: (AvatarElementPart | undefined)[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => undefined)
  );

  const hairItem = HAIRS[state.hair] ?? HAIRS[1];
  const hideEar = Boolean(hairItem?.coversEar);

  const applyPart = (part: AvatarElementPart, skipLeftEar = false) => {
    for (const [y, x, token] of part.item.patches) {
      if (skipLeftEar && x < 9 && y >= 12 && y <= 18) {
        continue;
      }
      if (y >= 0 && y < GRID_SIZE && x >= 0 && x < GRID_SIZE) {
        grid[y][x] = token;
        parts[y][x] = part;
      }
    }
  };

  // 保持固定圖層順序；全包覆髮型會收起臉型與細節中的左耳像素。
  for (const category of LAYER_ORDER) {
    const items = PART_ITEMS_MAP[category];
    const item = category === 'hair' ? hairItem : items[state[category]] ?? items[0];
    applyPart({ category, item }, hideEar && (category === 'face' || category === 'detail'));
  }

  // 若啟用水平翻轉 (Flip X)
  if (state.flipX) {
    return {
      tokens: grid.map((row) => [...row].reverse()),
      parts: parts.map((row) => [...row].reverse()),
    };
  }

  return { tokens: grid, parts };
}

export function composeAvatarTokens(state: AvatarState): string[][] {
  return composeAvatarLayers(state).tokens;
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

function createPixelColorResolver(state: AvatarState, colorMode: ColorMode, palette: FourTonePalette) {
  const localPalettes = new Map<string, FourTonePalette>();

  return (token: string, x: number, y: number, part?: AvatarElementPart): string => {
    // 頭髮與衣服內的 S 仍是皮膚，跟隨臉型配色，而不是該部件的材質色。
    if (token === 'S') {
      const face = part?.category === 'face' ? part.item : FACES[state.face] ?? FACES[0];
      const skinColor = state.partColors[face.id];
      return skinColor ?? resolvePixelHex(token, x, y, state, colorMode, palette);
    }

    const color = part && state.partColors[part.item.id];
    if (!part || !color || token === '.') {
      return resolvePixelHex(token, x, y, state, colorMode, palette);
    }
    if (token === 'B') return color;

    let localPalette = localPalettes.get(part.item.id);
    if (!localPalette) {
      localPalette = generatePaletteFromSeedColor(color);
      if (part.category !== 'face') {
        // 讓主要材質精確使用所選色，並保留其餘色階；白髮與線條也能直接上色。
        const counts = [0, 0, 0, 0];
        for (const [, , value] of part.item.patches) {
          const tone = ['0K', '1D', '2M', '3L'].findIndex((tokens) => tokens.includes(value));
          if (tone >= 0) counts[tone]++;
        }
        const mainTone = counts.indexOf(Math.max(...counts));
        localPalette[mainTone] = color;
      }
      localPalettes.set(part.item.id, localPalette);
    }
    return resolvePixelHex(token, x, y, state, 'palette', localPalette);
  };
}

/** 渲染完整合成後的 32x32 大頭照至 Canvas。 */
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
  const { tokens, parts } = composeAvatarLayers(state);
  const resolveColor = createPixelColorResolver(state, colorMode, palette);

  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      ctx.fillStyle = resolveColor(tokens[y][x], x, y, parts[y][x]);
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
  outfit: 32,
  glasses: 20,
  eyebrows: 14,
  eyes: 14,
  beard: 14,
  detail: 14,
  mouth: 12,
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
  state: AvatarState = createDefaultAvatarState()
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
  let hasDarkOutline = false;
  for (const [y, x, t] of item.patches) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (t === '0' || t === '1' || t === 'M' || t === 'K') {
      hasDarkOutline = true;
    }
  }

  const spanX = maxX - minX + 1;
  const spanY = maxY - minY + 1;
  const minBox = MIN_THUMB_SIZE_BY_CATEGORY[category] ?? 14;
  const boxSize = Math.max(spanX + 4, spanY + 4, minBox);
  const offsetX = Math.floor((boxSize - spanX) / 2) - minX;
  const offsetY = Math.floor((boxSize - spanY) / 2) - minY;
  const scale = width / boxSize;

  const resolveColor = createPixelColorResolver(state, colorMode, palette);
  for (const part of getElementParts(category, item)) {
    const hasCustomColor = Boolean(state.partColors[part.item.id]);
    for (const [y, x, token] of part.item.patches) {
      const localX = x + offsetX;
      const localY = y + offsetY;
      if (localX < 0 || localX >= boxSize || localY < 0 || localY >= boxSize) continue;

      let hex = resolveColor(token, x, y, part);
      if (!hasCustomColor && category === 'face' && token === 'S') {
        hex = colorMode === 'mono' ? '#F5F5F5' : palette[2];
      } else if (!hasCustomColor && category === 'detail' && token === 'B') {
        hex = colorMode === 'mono' ? '#141414' : palette[1];
      } else if (!hasCustomColor && !hasDarkOutline && hex.toUpperCase() === bgHex.toUpperCase() && token !== 'S') {
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
}

/**
 * 匯出純向量 SVG
 */
export function generateAvatarSVG(
  state: AvatarState,
  colorMode: ColorMode,
  palette: FourTonePalette
): string {
  const { tokens, parts } = composeAvatarLayers(state);
  const resolveColor = createPixelColorResolver(state, colorMode, palette);
  const rects: string[] = [];

  for (let y = 0; y < GRID_SIZE; y++) {
    let startX = 0;
    let currentHex = resolveColor(tokens[y][0], 0, y, parts[y][0]);

    for (let x = 1; x <= GRID_SIZE; x++) {
      const hex =
        x < GRID_SIZE ? resolveColor(tokens[y][x], x, y, parts[y][x]) : '';
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
 * 「一切交由上天安排」熱血智慧隨機搭配器
 */
export function generateRandomAvatarState(prev?: AvatarState): AvatarState {
  const rand = (n: number) => Math.floor(Math.random() * n);
  const hair = rand(HAIRS.length);
  const hairId = HAIRS[hair]?.id ?? '';
  const isHoodie = hairId === 'hair-hacker-hood' || hairId === 'hair-shadow-hood';

  const bgChoices: BgStyleId[] = ['solid-2', 'solid-3', 'solid-1', 'checker', 'dots'];
  const skinChoices: SkinToneLevel[] = [3, 3, 2, 2, 1];

  const glasses = Math.random() < 0.58 ? 0 : 1 + rand(GLASSES.length - 1);
  const glassesId = GLASSES[glasses]?.id ?? '';
  const isTigerMask = glassesId === 'glasses-tiger-white' || glassesId === 'glasses-tiger-gold';

  const state: AvatarState = {
    face: rand(FACES.length),
    hair,
    eyebrows: rand(EYEBROWS.length - 1),
    eyes: hairId === 'hair-shadow-hood' && Math.random() < 0.6 ? 13 : rand(EYES.length),
    nose: rand(NOSES.length),
    mouth: rand(MOUTHS.length),
    glasses,
    beard: isHoodie || Math.random() < 0.75 ? 0 : 1 + rand(BEARDS.length - 1),
    detail: Math.random() < 0.4 ? 0 : 1 + rand(DETAILS.length - 1),
    clothing: isHoodie
      ? CLOTHES.findIndex((c) => c.id === 'cloth-hoodie')
      : isTigerMask && Math.random() < 0.65
        ? CLOTHES.findIndex((c) => c.id === 'cloth-tiger-wrestler')
        : rand(CLOTHES.length),
    outfit: 0,
    skinTone: skinChoices[rand(skinChoices.length)],
    bgStyle: bgChoices[rand(bgChoices.length)],
    flipX: prev ? prev.flipX : false,
    partColors: { ...prev?.partColors },
  };

  // 連帽衫必須與兜帽成套，避免隨機產生只有衣身的半套組合。
  if (!isHoodie && CLOTHES[state.clothing]?.id === 'cloth-hoodie') {
    state.clothing = 0;
  }
  const outfitIndex = OUTFITS.findIndex((outfit, index) => index > 0 &&
    Object.entries(outfit.parts).every(([key, value]) =>
      state[key as Exclude<PartCategoryKey, 'outfit'>] === value
    )
  );
  state.outfit = Math.max(0, outfitIndex);
  return state;
}

/** 套裝只綁定指定部件；拆開任一部件時，其餘綁定部件回到各分類第一項。 */
export function selectAvatarPart(
  state: AvatarState,
  category: PartCategoryKey,
  index: number
): AvatarState {
  if (state[category] === index) return state;

  const nextState = { ...state };
  const currentOutfit = OUTFITS[state.outfit];
  if (category === 'outfit' || category in (currentOutfit?.parts ?? {})) {
    for (const key of Object.keys(currentOutfit?.parts ?? {}) as Exclude<PartCategoryKey, 'outfit'>[]) {
      nextState[key] = 0;
    }
    nextState.outfit = 0;
  }

  if (category === 'outfit') {
    nextState.outfit = index;
    Object.assign(nextState, OUTFITS[index]?.parts);
    return nextState;
  }

  nextState[category] = index;
  const linkedOutfit = OUTFITS.findIndex((outfit) =>
    outfit.autoEquip && outfit.parts[category] === index
  );
  return linkedOutfit > 0
    ? selectAvatarPart(nextState, 'outfit', linkedOutfit)
    : nextState;
}

export function createDefaultAvatarState(): AvatarState {
  return {
    face: 0, // 方圓臉 (國夫)
    hair: 1, // 短飛機頭 (國夫)
    eyebrows: 0, // 粗平眉
    eyes: 0, // 方眼
    nose: 0, // 方塊鼻
    mouth: 0, // 一字嘴
    glasses: 0, // 無
    beard: 0, // 無
    detail: 0, // 無
    clothing: 0, // 敞領白學蘭
    outfit: 0, // 無套裝
    skinTone: 3,
    bgStyle: 'solid-2',
    flipX: false,
    partColors: {},
  };
}
