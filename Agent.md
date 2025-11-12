# Git Repository Analysis System - Agent Context

## 📋 專案概述

這是一個基於 Next.js 15 的全端應用，整合 Firebase 與 Gemini AI，提供自動化的 Git 儲存庫分析與智慧摘要功能。

**核心功能：**

- 使用者透過 GitHub OAuth 登入
- 提交任意公開 Git 儲存庫進行掃描
- 使用 Gemini AI 生成技術摘要與技能評估
- 儀表板追蹤掃描歷史與狀態
- 永久連結分享分析結果

---

## 🏗️ 技術架構

### 架構原則 ⭐

**關鍵設計決策：客戶端只讀，後端處理寫入**

- 客戶端（瀏覽器）：僅能讀取 Firestore 資料
- 後端（API Routes）：負責所有寫入操作
- 優勢：更安全、更容易審計、防止客戶端濫用

### 前端架構

```
技術棧: Next.js 15 App Router + React + TypeScript
UI 框架: Tailwind CSS + Shadcn/UI
狀態管理: React Hooks + Server Components
資料存取: 僅讀取（透過 Firestore SDK）
```

### 後端架構

```
API: Next.js Route Handlers (App Router)
運行時: Node.js
語言: TypeScript
包管理: pnpm
資料存取: 讀寫（透過 Firebase Admin SDK）
```

### 第三方服務

```
認證與資料庫: Firebase (Auth + Firestore)
AI 分析: Google Gemini API
部署: Firebase Hosting
CI/CD: GitHub Actions
```

---

## 📂 專案結構

```
/src
  /app
    /api
      /auth
        /sync-user   # 同步使用者資料 API
          route.ts   # POST /api/auth/sync-user
      /scan          # 儲存庫掃描 API
        route.ts     # POST /api/scan
    /dashboard       # 使用者儀表板
    /login           # 登入頁面
    /submit          # 提交儲存庫頁面
    layout.tsx       # 根佈局
    page.tsx         # 首頁
  /lib
    firebase-client.ts        # Firebase 客戶端配置（只讀）
    /server
      firebase-admin.ts       # Firebase Admin SDK（讀寫）
    utils.ts                  # 工具函數
  /contexts
    AuthContext.tsx           # 認證狀態管理
/public                       # 靜態資源
/firestore.rules              # Firestore 安全規則
```

---

## 🔐 環境變數配置

系統需要以下環境變數（`.env.local`）：

```bash
# Firebase 配置
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK (Server-side)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Gemini AI
GEMINI_API_KEY=

# GitHub OAuth (Firebase Console 設定)
# 在 Firebase Console > Authentication > Sign-in method 中配置
```

---

## 🔄 資料流程

### 1. 使用者登入流程（更新：後端寫入）

```
用戶點擊登入
  → Firebase Auth (GitHub Provider) [Client]
  → 取得 ID Token [Client]
  → 呼叫 POST /api/auth/sync-user [Client → Server]
  → 驗證 ID Token [Server]
  → 寫入/更新 users collection [Server - Firestore]
  → 返回成功 [Server → Client]
  → 儲存使用者狀態至 Context [Client]
  → 重定向至 Dashboard [Client]
```

### 2. 儲存庫掃描流程（更新：後端寫入）

```
用戶提交 Git URL [Client]
  → 前端驗證格式 [Client]
  → POST /api/scan with ID Token [Client → Server]
  → 驗證 ID Token [Server]
  → 檢查使用者權限 & 速率限制 [Server - Firestore Read]
  → Clone 儲存庫 (simple-git) [Server]
  → 解析專案結構 & 技術棧 [Server]
  → 呼叫 Gemini API 生成摘要 [Server]
  → 寫入 scans collection [Server - Firestore Write]
  → 返回結果 UUID [Server → Client]
  → 重定向至 /results/[id] [Client]
```

### 3. 儀表板資料載入（只讀）

```
Dashboard 頁面載入 [Client]
  → 驗證使用者登入狀態 [Client]
  → 讀取 Firestore: scans collection [Client - Firestore Read]
  → Filter by userId (由 Firestore rules 強制執行)
  → 依時間排序顯示 [Client]
  → 支援狀態篩選 (queued/running/succeeded/failed) [Client]
```

---

## 📊 Firestore 資料結構

### Collection: `scans`

```typescript
interface ScanDocument {
  id: string // 自動生成 UUID
  userId: string | null // null 表示匿名使用者
  repositoryUrl: string
  status: "queued" | "running" | "succeeded" | "failed"

  // 分析結果
  summary?: {
    description: string // Gemini 生成的專案描述
    techStack: string[] // 技術棧列表
    skillLevel: "Beginner" | "Junior" | "Mid-level" | "Senior"
    complexity: number // 複雜度評分 (1-10)
  }

  // 統計資訊
  statistics?: {
    languages: Record<string, number> // 語言分佈百分比
    totalFiles: number
    totalLines: number
  }

  // 錯誤處理
  error?: string // 失敗原因

  // 時間戳記
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt?: Timestamp
}
```

### Collection: `users`

```typescript
interface UserDocument {
  uid: string // Firebase Auth UID
  email: string
  displayName: string
  photoURL?: string
  githubUsername?: string

  // 速率限制
  scanCount: number // 本日掃描次數
  lastScanAt?: Timestamp

  createdAt: Timestamp
}
```

---

## 🚀 API 規格

### POST `/api/auth/sync-user` ⭐ 新增

**用途：** 同步使用者資料到 Firestore（登入後呼叫）

**請求標頭：**

```typescript
Authorization: Bearer <Firebase ID Token>
```

**請求體：**

```typescript
{
  uid: string // Firebase User UID
  email: string | null
  displayName: string | null
  photoURL: string | null
  provider: string // "github"
}
```

**響應：**

```typescript
{
  success: boolean
  message?: string
  error?: string
}
```

**錯誤碼：**

- 401: 未授權（缺少或無效的 token）
- 403: UID 不匹配
- 500: 伺服器錯誤

**安全性：**

- ✅ 驗證 Firebase ID Token
- ✅ 確認 token UID 與請求 UID 一致
- ✅ 僅後端可寫入 Firestore

---

### POST `/api/scan`

**用途：** 提交 Git 儲存庫進行分析

**請求標頭：**

```typescript
Authorization: Bearer <Firebase ID Token>  // 註冊使用者
// 或不提供（匿名使用者）
```

**請求體：**

```typescript
{
  repositoryUrl: string // Git 儲存庫 URL
}
```

**響應：**

```typescript
{
  success: boolean
  scanId?: string               // 掃描任務 ID
  error?: string
}
```

**速率限制：**

- 匿名使用者：每日 3 次
- 註冊使用者：每日 10 次

**錯誤碼：**

- 400: 無效的儲存庫 URL
- 401: 未授權
- 429: 超過速率限制
- 500: 伺服器錯誤

**資料寫入：**

- ✅ 僅後端可寫入 scans collection
- ✅ 客戶端透過 API 提交，不直接寫入

---

## 🎨 UI/UX 設計原則

### 頁面結構

#### 1. 首頁 (`/`)

- Hero Section: 說明系統功能
- CTA Button: "開始分析" → `/submit`
- Features Section: 列出核心功能
- Footer: GitHub 連結、文件

#### 2. 提交頁面 (`/submit`)

- 輸入框：Git 儲存庫 URL
- 驗證提示：即時檢查 URL 格式
- 提交按鈕：觸發掃描
- Loading 狀態：顯示掃描進度

#### 3. 儀表板 (`/dashboard`)

- 掃描列表（表格或卡片）
- 狀態標籤：顏色區分 queued/running/succeeded/failed
- 篩選器：依狀態、時間排序
- 操作按鈕：查看結果、重新掃描

#### 4. 結果頁面 (`/results/[id]`)

- 儲存庫資訊：名稱、URL、語言
- AI 生成摘要：描述、技術棧、技能等級
- 統計圖表：語言分佈、檔案數量
- 分享按鈕：複製永久連結

---

## 🛠️ 開發規範

### TypeScript 規範

```typescript
// 使用嚴格模式
"strict": true
"noImplicitAny": true

// 統一命名規則
- 元件: PascalCase (UserDashboard.tsx)
- 函數: camelCase (fetchScanResults)
- 常數: UPPER_SNAKE_CASE (MAX_SCAN_LIMIT)
- 介面: PascalCase with I prefix (IScanDocument)
```

### React 規範

```typescript
// 優先使用 Server Components
// 僅在需要互動時使用 'use client'

// 範例：
// ✅ 好的做法
export default function Dashboard() {
  // Server Component - 直接查詢資料庫
}

// ❌ 避免的做法
;("use client")
export default function Dashboard() {
  // 不必要的 Client Component
}
```

### API 規範

```typescript
// 統一錯誤處理格式
export async function POST(request: Request) {
  try {
    // 業務邏輯
    return Response.json({ success: true, data })
  } catch (error) {
    console.error("API Error:", error)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

### Firestore 安全規則 ⭐ 重要

```javascript
// firestore.rules - 客戶端只讀，後端寫入

// ✅ 允許：使用者讀取自己的資料
match /users/{userId} {
  allow read: if request.auth.uid == userId;
  allow write: if false;  // 僅後端可寫入
}

// ✅ 允許：使用者讀取自己的掃描或公開掃描
match /scans/{scanId} {
  allow read: if request.auth.uid == resource.data.userId
                 || resource.data.isPublic == true;
  allow write: if false;  // 僅後端可寫入
}

// ❌ 禁止：所有其他操作
match /{document=**} {
  allow read, write: if false;
}
```

**部署規則：**

```bash
# 部署 Firestore 規則
firebase deploy --only firestore:rules

# 測試規則（本地）
firebase emulators:start
```

---

## 🔍 Gemini AI 整合指南

### Prompt 工程

**系統 Prompt：**

```
你是一個專業的軟體工程分析師。請分析以下 Git 儲存庫的內容，
並提供：

1. 專案描述（2-3 句話，說明專案目的與核心功能）
2. 技術棧列表（包含語言、框架、主要依賴）
3. 技能等級評估（Beginner/Junior/Mid-level/Senior）
4. 複雜度評分（1-10 分，考慮架構、設計模式、測試覆蓋率）

請使用繁體中文回覆，格式為 JSON。
```

**輸入資料結構：**

```typescript
{
  repositoryName: string
  mainLanguages: string[]
  fileStructure: string[]      // 重要檔案路徑
  readmeContent?: string       // README 內容（前 2000 字）
  packageJson?: object         // package.json 內容
  dependencies?: string[]      // 依賴列表
}
```

**預期輸出格式：**

```typescript
{
  description: string
  techStack: string[]
  skillLevel: "Beginner" | "Junior" | "Mid-level" | "Senior"
  complexity: number
  reasoning: string            // 評估理由
}
```

---

## 📝 開發任務清單

### Phase 1: 基礎設置 ✅

- [x] 初始化 Next.js 專案
- [x] 配置 Firebase (Auth + Firestore)
- [x] 設定 Tailwind + Shadcn/UI
- [x] 建立專案結構

### Phase 2: 認證系統 🚧

- [ ] 實作 GitHub OAuth 登入
- [ ] 建立登入頁面 UI
- [ ] 實作使用者 Session 管理
- [ ] 建立受保護的路由

### Phase 3: 掃描功能 🔜

- [ ] 建立 `/api/scan` Route Handler
- [ ] 整合 simple-git 進行 clone
- [ ] 實作檔案解析邏輯
- [ ] 整合 Gemini API
- [ ] 建立提交頁面 UI

### Phase 4: 儀表板 🔜

- [ ] 建立 Dashboard 頁面
- [ ] 實作 Firestore 查詢
- [ ] 建立掃描列表元件
- [ ] 實作狀態篩選與排序

### Phase 5: 結果頁面 🔜

- [ ] 建立 `/results/[id]` 動態路由
- [ ] 設計結果展示 UI
- [ ] 實作統計圖表
- [ ] 添加分享功能

### Phase 6: 優化與部署 🔜

- [ ] 實作速率限制
- [ ] 添加錯誤處理
- [ ] 效能優化
- [ ] 設定 CI/CD (GitHub Actions)
- [ ] 部署至 Firebase Hosting

---

## 🐛 已知問題與解決方案

### 問題 1: Firebase Admin SDK 初始化

**現況：** `src/lib/server/firebase.ts` 使用環境變數
**解決方案：** 確保 `FIREBASE_SERVICE_ACCOUNT_KEY` 為完整 JSON 字串

### 問題 2: Gemini API 速率限制

**現況：** 免費額度有限
**解決方案：**

- 實作本地快取機制
- 相同儲存庫 24 小時內不重複分析

### 問題 3: 大型儲存庫處理

**現況：** Clone 大型儲存庫耗時長
**解決方案：**

- 使用 shallow clone (`--depth=1`)
- 僅分析特定目錄 (src/, README)
- 設定檔案大小上限

---

## 📚 參考資源

### 官方文件

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Gemini API Reference](https://ai.google.dev/docs)
- [Shadcn/UI Components](https://ui.shadcn.com)

### 程式碼範例

- [Next.js Firebase Auth Example](https://github.com/vercel/next.js/tree/canary/examples/with-firebase-authentication)
- [Simple Git Usage](https://github.com/steveukx/git-js)

---

## 💡 開發提示

### 本地開發

```bash
# 安裝依賴
pnpm install

# 啟動開發伺服器
pnpm dev

# 建置生產版本
pnpm build

# 啟動生產伺服器
pnpm start
```

### 測試 Gemini API

```bash
# 使用 curl 測試
curl -X POST "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=$GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"分析這個專案"}]}]}'
```

### Firebase Emulator

```bash
# 啟動本地 Firebase 模擬器
firebase emulators:start

# 使用模擬器進行開發測試
```

---

## 🎯 下一步行動

**當前優先級：**

1. 完成 GitHub OAuth 登入流程
2. 實作基本的掃描 API (`/api/scan`)
3. 建立儀表板頁面基礎結構
4. 整合 Gemini API 進行測試

**建議開發順序：**

1. 先使用假資料完成 UI 開發
2. 再串接真實的 Firebase 與 Gemini API
3. 最後進行效能優化與錯誤處理

---

_最後更新: 2025-11-11_
_版本: 1.0.0_
