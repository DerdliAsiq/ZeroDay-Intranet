// Render uyumu: harici S3 yok. Dosyalar Postgres'te fileData olarak tutulur.
// Bu dosya geriye donuk uyumluluk icin durur; yeni kod kullanmaz.
export async function storagePut(..._args: unknown[]): Promise<{ key: string; url: string }> {
  throw new Error("Harici storage kaldirildi. Dosya icerigi DB'de saklanir.");
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  return { key: relKey, url: "" };
}

export async function storageGetSignedUrl(): Promise<string> {
  throw new Error("Harici storage kaldirildi.");
}
