# 12｜褲裝與短上衣製作紀錄

整合版本：0.1.6，2026-10-15（Asia/Taipei）。

使用者指出長衣襬讓身體顯得過長，而且沒有褲子的設計。這次將上衣止於腰帶下緣，拿掉遮住大腿的長裙，新增真正的布料褲裝；這是可見服裝的修正，並非完整人物與八方向重建。

## 素材與來源

| 項目 | 內容 |
| --- | --- |
| 遊戲素材 | [`../src/assets/trousers.webp`](../src/assets/trousers.webp)，1536 × 1024，保留透明度 |
| 實際人物對照 | [`visuals/trouser-proportions-comparison.webp`](visuals/trouser-proportions-comparison.webp) |
| 實際動作圖 | [`visuals/trouser-actions.webp`](visuals/trouser-actions.webp) |
| 生成方式 | 內建 `image_gen`，`transparent_background: true`；未使用 CLI 或付費 API 金鑰 |
| 生成日期 | 2026-10-14；2026-10-15 接入遊戲並檢視 |
| 處理 | 將生成 PNG 編碼為 WebP；沒有以程式重繪或去背 |

三欄依序對應 crimson、jade、ivory 衣甲。衣甲與褲裝目前一起切換；尚未增加獨立褲子裝備槽。原始上衣、頭部、手與靴仍取自既有圖集，參考截圖沒有當作遊戲資產。

## 角色裝配

- 三套上衣以來源領口固定頸部，保留等比紋理，只將下襬裁到腰帶下緣。
- 補上褲腰、褲襠、左右大腿、膝部布料與褲腳，再由靴子遮住收口。
- 褲管跟隨腳踝位移，腰部保持相連；每條褲管只畫一次，避免逐列切片的橫紋。
- 這仍是正面素材的 2D 變形；背面、真正八方向、膝部三維彎曲與自然騎乘坐姿尚未完成。
- 對照圖由遊戲繪製函式產生，不是影像生成的整體角色概念稿，也不是手機截圖。

## 最終生成提示詞

```text
Use case: stylized-concept. Asset type: a single production-ready transparent game sprite atlas of fantasy Chinese martial-arts TROUSERS ONLY. Landscape atlas, three equally spaced columns on real transparent alpha, all at the same scale, all waistlines and cuffs horizontally aligned. Each column shows ONE complete pair of trousers from natural waist to ankle cuffs on an invisible wearer, with two distinct legs and a visible gap between the lower legs. Slight three-quarter front view facing toward the viewer's right, orthographic camera slightly above. Relaxed neutral stance, legs separated by about one boot width. No torso, head, arms, skin, feet, boots, weapons, long robe, skirt, hanging tabard or extra accessories. Short waistband and clearly modeled seat/crotch, full rounded thighs with cloth folds tapering toward the knees and fitted fabric cuffs. Compact heroic proportions, substantial adult trouser thighs, not thin sticks. Painterly pre-rendered late-1990s/2000s isometric RPG character art, restrained high-quality 3D-style material shading, soft warm light upper left. LEFT COLUMN: charcoal blue trousers with subtle burgundy outer-thigh panels and small antique-gold stitching. MIDDLE COLUMN: warm ivory trousers with pale teal shadow folds and narrow muted teal seams. RIGHT COLUMN: midnight indigo trousers with restrained antique-gold outer seams and subtle woven motifs. These are the same standard-cut trouser silhouette in three compatible outfit materials. Fine fabric folds readable at small sprite size, no exaggerated flowing fabric. All three pairs fully visible uncropped, broad transparent gutters, transparent margins around each. No text, labels, grid lines, ground plane, drop shadow, background, glowing aura or watermark. Only these three pairs of trousers, nothing else. Target composition about 1536x1024.
```
