/**
 * 串行化 PubChem REST 請求，降低併發觸發 429／503 的風險（官方建議約每秒 ≤5 次）。
 * 每個請求完成後間隔 GAP_MS 再允許下一個請求發出。
 */
const GAP_MS = 220;

let chain: Promise<unknown> = Promise.resolve();

export function enqueuePubChemRestRequest<T>(task: () => Promise<T>): Promise<T> {
  const scheduled = chain.then(() => task());
  chain = scheduled.then(
    () => new Promise<void>(resolve => setTimeout(resolve, GAP_MS)),
    () => new Promise<void>(resolve => setTimeout(resolve, GAP_MS))
  );
  return scheduled;
}
