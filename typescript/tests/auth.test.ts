// 二画面認証のテスト（クライアント側の画面遷移ロジック）
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore, type MedicalProfile } from '../auth/authStore';

const profiles: MedicalProfile[] = [
  { id: 'MED-001', userId: 'user-001', loginPassword: 'login-aaa', permitPassword: 'permit-xxx', enabled: true, role: 'medical', version: 1 },
  { id: 'MED-002', userId: 'user-002', loginPassword: 'login-bbb', permitPassword: 'permit-yyy', enabled: false, role: 'medical', version: 1 },
];

describe('医療版二画面認証', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useAuthStore.setState({ profiles, loadError: null, step1ProfileId: null, authenticatedProfileId: null });
  });

  it('正しいIDとログインパスワードで第1認証を通過する', () => {
    const r = useAuthStore.getState().verifyStep1('user-001', 'login-aaa');
    expect(r.ok).toBe(true);
    expect(useAuthStore.getState().step1ProfileId).toBe('MED-001');
    // 第2認証はまだ通過していない
    expect(useAuthStore.getState().authenticatedProfileId).toBeNull();
  });

  it('不一致の場合は第1画面に留まる', () => {
    expect(useAuthStore.getState().verifyStep1('user-001', 'wrong').ok).toBe(false);
    expect(useAuthStore.getState().verifyStep1('unknown', 'login-aaa').ok).toBe(false);
    expect(useAuthStore.getState().step1ProfileId).toBeNull();
  });

  it('無効化されたプロファイルは拒否される', () => {
    const r = useAuthStore.getState().verifyStep1('user-002', 'login-bbb');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('無効化');
  });

  it('第1認証なしでは第2認証を通過できない', () => {
    const r = useAuthStore.getState().verifyStep2('permit-xxx');
    expect(r.ok).toBe(false);
  });

  it('第2認証の正しいパスワードで医療画面へ進める', () => {
    useAuthStore.getState().verifyStep1('user-001', 'login-aaa');
    const r = useAuthStore.getState().verifyStep2('permit-xxx');
    expect(r.ok).toBe(true);
    expect(useAuthStore.getState().authenticatedProfileId).toBe('MED-001');
  });

  it('第2認証で不一致の場合は医療画面へ進めない', () => {
    useAuthStore.getState().verifyStep1('user-001', 'login-aaa');
    const r = useAuthStore.getState().verifyStep2('wrong');
    expect(r.ok).toBe(false);
    expect(useAuthStore.getState().authenticatedProfileId).toBeNull();
  });

  it('ログアウトでログイン状態が解除される', () => {
    useAuthStore.getState().verifyStep1('user-001', 'login-aaa');
    useAuthStore.getState().verifyStep2('permit-xxx');
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().step1ProfileId).toBeNull();
    expect(useAuthStore.getState().authenticatedProfileId).toBeNull();
    expect(sessionStorage.getItem('pvs-auth-session')).toBeNull();
  });

  it('JSON設定の変更が認証判定に反映される', () => {
    const updated = profiles.map((p) => (p.id === 'MED-001' ? { ...p, loginPassword: 'changed' } : p));
    useAuthStore.setState({ profiles: updated });
    expect(useAuthStore.getState().verifyStep1('user-001', 'login-aaa').ok).toBe(false);
    expect(useAuthStore.getState().verifyStep1('user-001', 'changed').ok).toBe(true);
  });

  it('プロファイル未読込時はエラーメッセージを返す', () => {
    useAuthStore.setState({ profiles: null });
    const r = useAuthStore.getState().verifyStep1('user-001', 'login-aaa');
    expect(r.ok).toBe(false);
    expect(r.error).toContain('読み込み');
  });
});
