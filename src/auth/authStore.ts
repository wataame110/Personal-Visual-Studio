// 医療版アクセスゲート（開発・検証用）
//
// 重要: これは公開JSONとクライアント側JavaScriptによる簡易アクセスゲートであり、
// サーバー側認証と同等のセキュリティは提供しない。
// - JSONを取得すれば資格情報を読み取れる
// - JavaScriptの照合処理は回避可能
// 本番運用で実患者情報を扱う場合は、別途適切な認証・アクセス制御・データ保護が必要。
import { create } from 'zustand';

export interface MedicalProfile {
  id: string; // MED-001 等
  userId: string;
  loginPassword: string;
  permitPassword: string;
  enabled: boolean;
  role: string;
  version: number;
}

interface ProfilesFile {
  version: number;
  profiles: MedicalProfile[];
}

const STEP1_KEY = 'pvs-auth-step1';
const SESSION_KEY = 'pvs-auth-session';

interface AuthState {
  profiles: MedicalProfile[] | null;
  loadError: string | null;
  step1ProfileId: string | null; // 第1認証を通過したプロファイル
  authenticatedProfileId: string | null; // 第2認証まで通過
  loadProfiles: () => Promise<void>;
  verifyStep1: (userId: string, password: string) => { ok: boolean; error?: string };
  verifyStep2: (permitPassword: string) => { ok: boolean; error?: string };
  logout: () => void;
  restore: () => void;
}

async function fetchProfiles(): Promise<ProfilesFile> {
  const res = await fetch(`${import.meta.env.BASE_URL}auth/profiles.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`プロファイル設定の読み込みに失敗しました（HTTP ${res.status}）`);
  return res.json();
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profiles: null,
  loadError: null,
  step1ProfileId: sessionStorage.getItem(STEP1_KEY),
  authenticatedProfileId: sessionStorage.getItem(SESSION_KEY),

  loadProfiles: async () => {
    try {
      const data = await fetchProfiles();
      set({ profiles: data.profiles, loadError: null });
    } catch (e) {
      set({ loadError: e instanceof Error ? e.message : 'プロファイル設定の読み込みに失敗しました' });
    }
  },

  verifyStep1: (userId, password) => {
    const profiles = get().profiles;
    if (!profiles) return { ok: false, error: 'プロファイル設定を読み込み中です。しばらく待ってから再試行してください。' };
    const profile = profiles.find((p) => p.userId === userId);
    if (!profile) return { ok: false, error: 'ユーザーIDまたはログインパスワードが一致しません。' };
    if (!profile.enabled) return { ok: false, error: 'このプロファイルは無効化されています。管理者にお問い合わせください。' };
    if (profile.loginPassword !== password) {
      return { ok: false, error: 'ユーザーIDまたはログインパスワードが一致しません。' };
    }
    sessionStorage.setItem(STEP1_KEY, profile.id);
    set({ step1ProfileId: profile.id });
    return { ok: true };
  },

  verifyStep2: (permitPassword) => {
    const { profiles, step1ProfileId } = get();
    if (!profiles || !step1ProfileId) return { ok: false, error: '第1認証を先に完了してください。' };
    const profile = profiles.find((p) => p.id === step1ProfileId);
    if (!profile || !profile.enabled) return { ok: false, error: 'プロファイルが無効です。' };
    if (profile.permitPassword !== permitPassword) {
      return { ok: false, error: '使用許可パスワードが一致しません。' };
    }
    sessionStorage.setItem(SESSION_KEY, profile.id);
    set({ authenticatedProfileId: profile.id });
    return { ok: true };
  },

  logout: () => {
    sessionStorage.removeItem(STEP1_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    set({ step1ProfileId: null, authenticatedProfileId: null });
  },

  restore: () => {
    set({
      step1ProfileId: sessionStorage.getItem(STEP1_KEY),
      authenticatedProfileId: sessionStorage.getItem(SESSION_KEY),
    });
  },
}));
