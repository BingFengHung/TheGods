# 08｜免費部署與最後階段的後端候選

> 0.1 實作已開始：本文件保留前期規劃，完成情形及技術調整請以 [09 實作現況](09-implementation-status.md) 為準；不能將規劃表格視為已交付功能。

核對：2026-10-12。官方免費配額可能調整，真正部署前重新核對；目前未開通任何服務。

## 1. 現在：單機版只需靜態託管

建議先用 Cloudflare Pages Free 放置前端 HTML／JS／圖集與音效，使用預設子網域與 HTTPS。遊戲規則與進度在玩家裝置執行，沒有自己的遊戲後端，後端月費可保持 0。

官方文件列出靜態資產請求免費且不限次數；Free 每月 500 次建置、最多 20,000 個檔案、單檔最大 25 MiB。這不代表 Functions、所有雲端產品或無限容量都免費。圖集／音效應分包，部署前檢查單檔上限。[靜態請求計價](https://developers.cloudflare.com/pages/functions/pricing/) · [平台限制](https://developers.cloudflare.com/pages/platform/limits/)

前期不需要購買網域、租 VM、付費 API 或資料庫。首次下載需網路；已下載內容可離線遊玩。裝置進度用匯出／匯入備份搬移。

## 2. 未來：免費後端不等於無限制

| 方案 | 可能用途 | 核對到的免費限制／特性 | 對本專案的判斷 |
| --- | --- | --- | --- |
| Cloudflare Workers + Durable Objects | 小型多人房間、WebSocket 與伺服器狀態 | Free 支援 SQLite-backed DO；DO 100,000 requests／日、13,000 GB-s／日；另有 Worker、儲存與寫入配額 | 最後可研究回合制房間；屬事件式架構，不能直接當作常駐 Node／Colyseus 主機 |
| Render Free | Node.js 後端小型實驗 | 每 workspace 750 instance hours／月；15 分鐘無入站流量會休眠，喚醒約一分鐘；本機檔案不持久 | 容易試跑，但不適合承諾全天候穩定遊戲體驗；資料要另存持久服務 |
| Supabase Free | 帳號、資料庫、雲端存檔 | 500 MB 資料庫、1 GB 檔案、5 GB egress；最多兩個 active projects，低活動約一週可能暫停 | 可評估同步；不是一台可任意常駐遊戲迴圈的 Node 伺服器 |

DO 的 requests 配額包含不同計量的 HTTP、RPC、WebSocket 訊息及 alarm；不應將 100,000 當成玩家人數或直接換算同時在線容量。每個活躍物件的運算時間、訊息與持久化都需實測。

Render Free web service 不保留本機 SQLite／玩家檔案；免費資料庫的期限與限制另核對，不能把 web service 的免費期限套到資料庫。Supabase 提供即時功能也不會自動完成權威戰鬥與作弊驗證。

以上架構適合性的描述是本專案工程判斷，不是供應商承諾的遊戲承載量。免費層可能拒絕超額請求、暫停或需要升級；不承諾永久免費、無冷啟動或高同時在線。

## 3. 決策

當前採「完整單機 PWA＋免費靜態託管」方向，先驗證視覺及玩法。M5 如確定需要後端：

1. 先分清楚只是備份同步，還是需要真實組隊與交易。
2. 用少量玩家實測訊息、運算、資料量及休眠／重啟。
3. 選服務前確認免費方案、是否需付款資料、超限處理與備份方式。
4. 不自動升級付費方案，不以繞過休眠或配額方式維持免費。
5. 後端試驗不能讓已完成單機版變得必須登入或連線。

## 4. 官方來源

- [Cloudflare Pages 計價](https://developers.cloudflare.com/pages/functions/pricing/)
- [Cloudflare Pages 限制](https://developers.cloudflare.com/pages/platform/limits/)
- [Durable Objects 計價與配額](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Render Free](https://render.com/docs/free)
- [Supabase Pricing](https://supabase.com/pricing)
- [Supabase Free Project Pausing](https://supabase.com/docs/guides/platform/free-project-pausing)

費用範圍指網站與後端服務，不代表美術、人力、設備、網路或其他製作成本不存在。
