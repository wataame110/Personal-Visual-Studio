#!/usr/bin/env node
// 医療版プロファイル生成ツール（開発者用）
//
// 使い方:
//   node tools/generate-profiles.mjs [枠数] [出力先]
//   例: node tools/generate-profiles.mjs 30 public/auth/profiles.json
//
// - 枠数を増やすだけでプロファイルを増設できる（30→50→100 など）。
// - ログイン画面・認証ロジックの変更は不要。
// - 既存ファイルがある場合、既存プロファイルの資格情報を保持したまま増設する。
// - 生成されるパスワードは開発・検証用の初期値。実運用前に必ず変更すること。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

const count = Number.parseInt(process.argv[2] ?? '30', 10);
const outPath = process.argv[3] ?? 'public/auth/profiles.json';

if (!Number.isInteger(count) || count < 1 || count > 10000) {
  console.error('枠数は 1〜10000 の整数で指定してください。');
  process.exit(1);
}

const makePassword = (prefix) => `${prefix}-${randomBytes(4).toString('hex')}`;

let existing = [];
try {
  const data = JSON.parse(readFileSync(outPath, 'utf8'));
  existing = data.profiles ?? [];
} catch {
  // 新規作成
}

const profiles = [];
for (let i = 1; i <= count; i++) {
  const id = `MED-${String(i).padStart(3, '0')}`;
  const prev = existing.find((p) => p.id === id);
  profiles.push(
    prev ?? {
      id,
      userId: `user-${String(i).padStart(3, '0')}`,
      loginPassword: makePassword('login'),
      permitPassword: makePassword('permit'),
      enabled: true,
      role: 'medical',
      version: 1,
    },
  );
}

const data = { version: 1, generatedAt: new Date().toISOString(), profiles };
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(data, null, 2) + '\n');
console.log(`${profiles.length} 件のプロファイルを ${outPath} に出力しました。`);
console.log('※ これは開発・検証用の簡易アクセスゲートです。平文パスワードを含むため、実患者情報の保護には使用しないでください。');
