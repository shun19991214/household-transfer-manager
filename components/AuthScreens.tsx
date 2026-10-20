import React, { useState } from 'react';
import { LogIn, LogOut, AlertCircle, Users } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { Button, Card } from './UIComponents';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50/30 flex items-center justify-center px-4">
    <div className="w-full max-w-sm text-center space-y-6">
      <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
        おうちのかけいぼ
      </p>
      {children}
    </div>
  </div>
);

const SignOutButton: React.FC = () => {
  const { signOut } = useFinance();
  return (
    <Button variant="secondary" onClick={() => { signOut().catch((e) => console.error('Sign-out failed', e)); }}>
      <LogOut className="w-4 h-4 mr-2" />
      ログアウト
    </Button>
  );
};

export const SignInScreen: React.FC = () => {
  const { signIn } = useFinance();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn();
    } catch (e) {
      console.error('Sign-in failed', e);
      const code = (e as { code?: string })?.code;
      setError(code === 'auth/unauthorized-domain'
        ? 'このドメインはログインが許可されていません。Firebase Authentication の承認済みドメインに追加してください。'
        : 'ログインに失敗しました。時間をおいて再度お試しください。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <Card>
        <p className="text-sm text-slate-600 mb-4">家計データはクラウドに保存されています。Google アカウントでログインしてください。</p>
        <Button onClick={handleSignIn} disabled={busy} className="w-full">
          <LogIn className="w-4 h-4 mr-2" />
          {busy ? 'ログイン中...' : 'Google でログイン'}
        </Button>
        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      </Card>
    </Shell>
  );
};

export const NoHouseholdScreen: React.FC = () => {
  const { cloudUser } = useFinance();
  return (
    <Shell>
      <Card color="amber">
        <div className="flex flex-col items-center gap-3">
          <Users className="w-8 h-8 text-amber-500" />
          <p className="text-sm text-slate-700">このアカウントはまだ世帯メンバーに登録されていません。</p>
          <p className="text-xs text-slate-500">管理者に以下のメールアドレスを伝え、世帯への追加を依頼してください。</p>
          <code className="text-xs bg-amber-100 px-2 py-1 rounded break-all">{cloudUser?.email ?? cloudUser?.uid}</code>
        </div>
      </Card>
      <SignOutButton />
    </Shell>
  );
};

export const CloudErrorScreen: React.FC = () => {
  const { cloudMessage } = useFinance();
  return (
    <Shell>
      <Card color="amber">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-sm text-slate-700">クラウドへの接続に失敗しました。</p>
          {cloudMessage && <p className="text-xs text-slate-500">{cloudMessage}</p>}
        </div>
      </Card>
      <div className="flex justify-center gap-2">
        <Button onClick={() => window.location.reload()}>再読み込み</Button>
        <SignOutButton />
      </div>
    </Shell>
  );
};
