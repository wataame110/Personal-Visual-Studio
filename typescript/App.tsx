// ルーティング（Hash Router：GitHub Pages での直接アクセス・再読込に対応）
import { useEffect, useState } from 'react';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import PhotoEditorPage from './pages/PhotoEditorPage';
import { MedicalLoginStep1, MedicalLoginStep2 } from './pages/MedicalAuthPages';
import { useAuthStore } from './auth/authStore';

// 写真編集が主エディタ（photo / medical）。3Dモンタージュは追加入口（editor / medical-3d）。
export type Route =
  | { name: 'home' }
  | { name: 'photo' }
  | { name: 'editor' }
  | { name: 'medical-login' }
  | { name: 'medical-permit' }
  | { name: 'medical' }
  | { name: 'medical-3d' };

function parseHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, '');
  switch (h) {
    case 'photo':
      return { name: 'photo' };
    case 'editor':
      return { name: 'editor' };
    case 'medical-login':
      return { name: 'medical-login' };
    case 'medical-permit':
      return { name: 'medical-permit' };
    case 'medical':
      return { name: 'medical' };
    case 'medical-3d':
      return { name: 'medical-3d' };
    default:
      return { name: 'home' };
  }
}

export function navigate(route: Route['name']): void {
  window.location.hash = route === 'home' ? '/' : `/${route}`;
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash());
  const auth = useAuthStore();

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    auth.restore();
    void auth.loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 医療画面のガード：第1認証未通過なら第1画面へ、第2未通過なら第2画面へ
  useEffect(() => {
    if ((route.name === 'medical' || route.name === 'medical-3d') && !auth.authenticatedProfileId) {
      navigate(auth.step1ProfileId ? 'medical-permit' : 'medical-login');
    } else if (route.name === 'medical-permit' && !auth.step1ProfileId) {
      navigate('medical-login');
    }
  }, [route, auth.authenticatedProfileId, auth.step1ProfileId]);

  switch (route.name) {
    case 'photo':
      return <PhotoEditorPage mode="general" />;
    case 'editor':
      return <EditorPage mode="general" />;
    case 'medical-login':
      return <MedicalLoginStep1 />;
    case 'medical-permit':
      return <MedicalLoginStep2 />;
    case 'medical':
      return auth.authenticatedProfileId ? <PhotoEditorPage mode="medical" /> : null;
    case 'medical-3d':
      return auth.authenticatedProfileId ? <EditorPage mode="medical" /> : null;
    default:
      return <HomePage />;
  }
}
