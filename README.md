# 8-Bit Pixel Avatar Creator (8-Bit 像素大頭照製圖所)

> 像素藝術風格大頭照創建工具，靈感源自經典 8-Bit 復古電玩與簡約極致的黑灰白美學。

線上預覽網址：[https://Hsing24.github.io/avatar-creator/](https://Hsing24.github.io/avatar-creator/)

---

## 🎮 特色亮點

- **純粹像素藝術 (32×32 Grid)**：所有五官、髮型、眼鏡、服飾均經嚴格像素格點對齊與分層渲染，邊角銳利無模糊。
- **元素自由拆解組合**：
  - 臉型 (Base Shape)
  - 髮型 (8 款經典像素髮型：刺蝟短髮、旁分短髮、側分、鮑伯短髮、平頭、波浪長髮、雙馬尾、莫霍克)
  - 眼睛 (8 款表情眼睛)
  - 眉毛 (5 款眉型)
  - 嘴部 (6 款嘴部動態)
  - 鬍鬚 (5 款鬍子樣式)
  - 眼鏡 (6 款潮流與復古鏡框)
  - 服飾 (7 款服裝：帽 T、T 恤、襯衫、背心、西裝、高領等)
- **一切交由上天安排 (Randomizer)**：一鍵隨機搭配角色特徵與像素色系，靈感瞬間湧現。
- **色系調配 (1-Bit & 2-Bit 像素色盤)**：
  - 支援 **1-Bit** 黑白反差與 **2-Bit** 四階灰階調配（黑色、深灰、中灰、純白）。
  - 精心內建多款主題色盤：經典單色、綠幕 Game Boy、低對比電子紙、琥珀夜視、白曜高光等。
  - 支援自訂十六進位顏色代碼即時套用。
- **高畫質匯出**：
  - 向量 SVG 格式（支援純色背景或透明通道）
  - 高解析度 PNG 格式（512×512 放大匯出，保持 crisp-edges 像素不失真）
  - 複製 SVG 程式碼至剪貼簿
- **極致 8-Bit 黑灰白介面**：CRT 掃描線氛圍切換、硬邊陰影 (Hard-edge Shadows)、微按壓觸感與像素字體排版。

---

## 🛠️ 技術棧

- **框架**：[Astro 5](https://astro.build/)
- **字型**：`DotGothic16` (日系復古像素黑體)、`Silkscreen`
- **樣式與渲染**：Vanilla CSS (CSS Custom Properties)、SVG `crispEdges`
- **部署**：GitHub Actions + GitHub Pages

---

## 🚀 本地開發與建置

```bash
# 安裝相依套件
npm install

# 啟動本地開發伺服器
npm run dev

# 靜態打包建置
npm run build

# 預覽打包產物
npm run preview
```

---

## 📄 授權條款

本專案採用 [MIT License](LICENSE) 授權。
