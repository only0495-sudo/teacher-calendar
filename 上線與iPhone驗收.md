目前線上網址：https://only0495-sudo.github.io/teacher-calendar/
程式庫：https://github.com/only0495-sudo/teacher-calendar
2026-09-30 GitHub Pages 部署成功，HTTP 200，公開頁面課表倒數正常，未見 JavaScript 錯誤。
已取得使用者對目前課表、學校行事曆與校務活動公開發布的明確同意。
正式使用者限兩位老師，不開放公眾註冊；目前尚未接上登入及雲端同步。
backend/supabase-schema.sql 已準備兩個指定使用者名額與逐列權限規則，但尚未套用或實際資料庫驗證。
後續須移除公開前端內的個人初始化課表（teacher-data.js），將各自資料改存登入後的資料庫，並讓新帳號從空白工作區開始；不可把目前初始化資料當成私有帳號資料。

# 上線與 iPhone 驗收

## 已完成

- 手機響應式排版、16px 輸入欄位、主要按鈕至少 44px 高、安全區留白。
- apple-touch-icon 180px、PWA 192／512px 圖示、standalone manifest。
- HTTPS 上線後啟用 Service Worker；未對 iPhone 實機的離線啟動做驗證。
- GitHub Actions 工作流程：從 main 分支測試後只發布 dist。
- 計算與教師課表測試通過。

## 目前狀態

網站仍是本機 http://127.0.0.1:8765/；該網址不能直接在另一支手機使用。已排除受限網路造成的誤判，GitHub 帳號 only0495-sudo 已正常登入。網站發布狀態以本次 GitHub Actions 實際結果為準。

現有 localStorage／IndexedDB 只儲存在該瀏覽器。即使放上 GitHub Pages，也不會自動變成帳號登入或多裝置同步。正式上線需先決定使用者範圍與雲端資料庫。

## 上線順序

1. GitHub 已登入。不要把密碼或 token 貼到聊天。
2. 已確定多位老師各自登入。尚待建立 Supabase 專案，再補登入、資料庫、每位老師的權限隔離、儲存衝突處理及備份搬移。
3. 建立 GitHub 儲存庫，把本資料夾作為儲存庫根目錄。只發布 dist，工作流程已排除來源附件及測試截圖；teacher-data.js 是網站初始課表資料，發布後會隨程式提供。
4. GitHub Settings → Pages → Source 選 GitHub Actions，執行 Publish teacher calendar。需正常帳號授權與 Pages 可用設定。
5. 取得 HTTPS 網址後，用實體 iPhone Safari 開啟。紀錄一堂課、重新開啟確認；若已加同步，再用電腦確認一致。
6. Safari 分享 → 加入主畫面 → 開啟為網頁 App → 加入。從圖示啟動，再驗證資料保存與離線行為。

## 實機待驗收

- iPhone Safari 輸入課程進度，關閉後重開仍保存。
- 主畫面圖示、名稱、獨立視窗及瀏海／底部安全區。
- 鍵盤出現時仍可按儲存；每週表格可在表格區橫向滑動。
- HTTPS 初次載入後再測試離線；重新上線取得最新版。
- 若有同步：跨裝置讀寫、不同老師看不到彼此私人進度、同時修改不覆蓋。

本機手機尺寸測試不是 Safari 引擎或 iPhone 實機測試，不能據此宣稱已完成實機驗收。
