# Design System — 8-Bit 像素大頭照製圖所

<!-- impeccable:design-schema 1 -->

## Visual Direction & World

- **Theme**: 8-Bit Monochrome Pixel OS Studio（黑灰白 8-Bit 像素製圖系統）
- **Inspiration**: `8-bit_3.jpg` 的高對比黑灰白像素點陣美學、Macintosh System 1 / Game Boy Camera 1-Bit 視窗介面，以及 `notion-avatar.app` 的直覺單欄部件拆解工作流。
- **Surface Mode**: Operate（工具工作台模式）—— 置中 32×32 像素主畫布舞台、10 大獨立部件分類格、單獨部件像素選擇視窗，以及底部「一切交由上天安排」與 PNG/SVG 匯出控制列。整體網站介面嚴格維持黑、灰、白無彩度 8-Bit 像素風格。

## Color Tokens (Strict Black / Gray / White 8-Bit Palette)

| Token | Value | Role |
| :--- | :--- | :--- |
| `--bg-page` | `#F0F0F0` | 8-Bit 淺灰白點陣網格背景（對應 `8-bit_3.jpg` 底色） |
| `--bg-surface` | `#FFFFFF` | 像素視窗與部件畫布純白底色 |
| `--bg-subtle` | `#E4E4E4` | 次要像素插槽、未選中按鈕與標題列淺灰底 |
| `--bg-mid` | `#C8C8C8` | 8-Bit 立體像素內陰影與懸停中灰階 |
| `--ink-black` | `#141414` | 像素純黑主邊框、文字與反白選取底色（對應 `8-bit_3.jpg` 線條色） |
| `--ink-dark` | `#333333` | 次要強調深灰 |
| `--ink-muted` | `#595959` | 輔助座標與狀態說明文字（對比度 > 5.8:1） |
| `--border-gray` | `#9E9E9E` | 內部像素格線與分隔線中灰 |

## Typography & Scannability

- **8-Bit Pixel Font Stack**: `'DotGothic16', 'Silkscreen', 'PingFang TC', 'Noto Sans TC', monospace` —— 採用 16×16 點陣字體呈現繁體中文與英數標記，徹底貼合 8-Bit 網站視覺調性。
- **Monospace / Hex Codes**: `'Silkscreen', 'DotGothic16', 'JetBrains Mono', monospace` 搭配 `font-variant-numeric: tabular-nums`。

## Pixel Geometry & Rendering Rules

- **零圓角像素框體 (`border-radius: 0`)**：全面捨棄現代圓角與模糊陰影，改用 8-Bit 階梯式像素邊框、雙線視窗標題列（Dithered Scanline Header）與像素內外立體斜角（`inset -2px -2px 0 #C8C8C8, inset 2px 2px 0 #FFFFFF`）。
- **像素銳利度**：所有 `<canvas>` 與 SVG 皆強制套用 `image-rendering: pixelated; image-rendering: crisp-edges;` 與 `ctx.imageSmoothingEnabled = false`。
