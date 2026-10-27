// 医療版の二画面認証（第1画面: ID+ログインパスワード / 第2画面: 使用許可パスワード）
import { useState } from 'react';
import { navigate } from '../App';
import { useAuthStore } from '../auth/authStore';

export function MedicalLoginStep1() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const auth = useAuthStore();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = auth.verifyStep1(userId.trim(), password);
    if (result.ok) {
      navigate('medical-permit');
    } else {
      setError(result.error ?? '認証に失敗しました。');
    }
  };

  return (
    <div className="home">
      <form className="auth-box" onSubmit={submit}>
        <h2>医療機関モード ログイン</h2>
        <div className="auth-step">第1認証（2段階のうち 1 段階目）</div>
        <div>
          <label htmlFor="auth-userid">ユーザーID</label>
          <input id="auth-userid" type="text" autoComplete="username" value={userId}
            onChange={(e) => setUserId(e.target.value)} autoFocus />
        </div>
        <div>
          <label htmlFor="auth-password">ログインパスワード</label>
          <input id="auth-password" type="password" autoComplete="current-password" value={password}
            onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="auth-error" role="alert">{error || auth.loadError}</div>
        <button type="submit" className="primary">次へ（第2認証）</button>
        <button type="button" onClick={() => navigate('home')}>トップへ戻る</button>
        <div className="notice danger" style={{ margin: 0 }}>
          この認証は開発・検証用の簡易アクセスゲートです。実患者情報の保護には使用できません。
        </div>
      </form>
    </div>
  );
}

export function MedicalLoginStep2() {
  const [permit, setPermit] = useState('');
  const [error, setError] = useState('');
  const auth = useAuthStore();

  // 第1認証未通過の直接アクセスは App 側のガードでリダイレクトされる

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = auth.verifyStep2(permit);
    if (result.ok) {
      navigate('medical');
    } else {
      setError(result.error ?? '認証に失敗しました。');
    }
  };

  return (
    <div className="home">
      <form className="auth-box" onSubmit={submit}>
        <h2>使用許可パスワードの入力</h2>
        <div className="auth-step">第2認証（2段階のうち 2 段階目）</div>
        <div>
          <label htmlFor="auth-permit">使用許可パスワード</label>
          <input id="auth-permit" type="password" value={permit}
            onChange={(e) => setPermit(e.target.value)} autoFocus />
        </div>
        <div className="auth-error" role="alert">{error}</div>
        <button type="submit" className="primary">医療モードを開始</button>
        <button type="button" onClick={() => { auth.logout(); navigate('medical-login'); }}>
          第1認証へ戻る
        </button>
      </form>
    </div>
  );
}
