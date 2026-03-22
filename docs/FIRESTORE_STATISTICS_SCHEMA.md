# Firestore 學習統計 Schema

## 路徑

```
users/{userId}/statistics/overview
```

## 資料結構 (UserStatisticsDoc)

| 欄位 | 類型 | 說明 |
|------|------|------|
| `totalQuestionsAnswered` | number | 總答題數 |
| `overallAccuracy` | number | 整體正確率 (0-100) |
| `currentStreak` | number | 連續學習天數 |
| `subjectProgress` | Record<string, { total, correct }> | 各科進度（如 physics, math, chemistry） |
| `gradedPapers` | number | 已批改試卷數（向後相容） |
| `timeSavedHours` | number | 節省批改時間（小時） |
| `activeDays` | number | 本週活躍天數 |
| `updatedAt` | Timestamp | 最後更新時間 |

## 使用方式

### 讀取（實時監聽）

由 `useUserProfileManager` 透過 `onSnapshot` 自動訂閱，無需在 UI 元件內呼叫 Firebase。

### 寫入（更新進度）

當用戶解完一題時，呼叫：

```ts
const { updateUserProgress } = useUserProfileManager();

await updateUserProgress({
  totalQuestionsAnswered: prev + 1,
  overallAccuracy: newAccuracy,
  subjectProgress: {
    ...prevProgress,
    [subject]: { total: t + 1, correct: c + (isCorrect ? 1 : 0) }
  }
});
```

## 向後相容

- 既有用戶的 `users/{uid}` 主檔內含 `stats`，若 `statistics/overview` 不存在，會沿用主檔的 `gradedPapers`、`timeSavedHours`、`activeDays`
- 新用戶首次解題時，`updateUserProgress` 會自動建立 `statistics/overview` 文檔
