import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobal } from '@/context/GlobalContext';
import { useGenerate2FA, useEnable2FA, useDisable2FA } from '@/lib/hooks';
import { sha256 } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Camera,
  Lock,
  CheckCircle2,
  Github
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG } from 'qrcode.react';

export const UserProfile = ({ onBack }: { onBack: () => void }) => {
  const { t } = useTranslation(['settings', 'common', 'auth']);
  const { user, updateUser } = useGlobal();
  const [nickname, setNickname] = useState(user.nickname);
  const [show2FA, setShow2FA] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDisable2FAModal, setShowDisable2FAModal] = useState(false);

  const generate2FA = useGenerate2FA();
  const enable2FA = useEnable2FA();
  const disable2FA = useDisable2FA();

  const handleGenerate2FA = async () => {
    try {
      const data = await generate2FA.mutateAsync();
      setQrUrl(data.url);
      setSecret(data.secret);
      setShow2FA(true);
    } catch (e: any) {
      console.error(e);
      // Error handled by hook
    }
  };

  const handleEnable2FA = async () => {
    if (!code || code.length !== 6) {
      toast.error(t('settings:enter_code'));
      return;
    }
    try {
      await enable2FA.mutateAsync(code);
      updateUser({ twoFactorEnabled: true });
      setShow2FA(false);
      setCode('');
    } catch (e: any) {
      console.error(e);
      // Error handled by hook
    }
  };

  const handleDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const hashedPassword = await sha256(password);
      await disable2FA.mutateAsync({ code, password: hashedPassword });
      updateUser({ twoFactorEnabled: false });
      setShowDisable2FAModal(false);
      setCode('');
      setPassword('');
    } catch (e: any) {
      console.error(e);
      // Error handled by hook
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPasswordModal(false);
    toast.success(t('common:success'));
  };

  const isPending = generate2FA.isPending || enable2FA.isPending || disable2FA.isPending;

  return (
    <div className="animate-in slide-in-from-right duration-300">
      <div className="flex items-center gap-2 mb-6 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)]" onClick={onBack}>
        <ChevronLeft size={20} />
        <span className="text-sm font-medium">{t('common:back_to_settings')}</span>
      </div>
      <h2 className="text-2xl font-bold text-[var(--text-main)] mb-6">{t('settings:profile')}</h2>
      <div className="space-y-8">
        <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">{t('settings:basic_info')}</h3>
            <div className="flex items-center gap-6 mb-6">
              <div className="relative group cursor-pointer">
                <Avatar className="w-20 h-20 border-2 border-[var(--border)]">
                  <AvatarImage src={user.avatar || undefined} />
                  <AvatarFallback className="bg-[var(--bg-main)] text-[var(--primary)] text-2xl font-bold">
                    {user.nickname?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white w-6 h-6" />
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-[var(--text-main)] mb-1">{t('settings:nickname')}</label>
                <Input
                  type="text"
                  value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  className="max-w-xs bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border)]"
                />
              </div>
            </div>
            <Button className="bg-[var(--primary)] text-white hover:opacity-90">{t('settings:save_changes')}</Button>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm">
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Lock size={18} className="text-[var(--text-muted)]" />
                <h3 className="text-sm font-bold text-[var(--text-main)]">{t('settings:login_password')}</h3>
              </div>
              <p className="text-sm text-[var(--text-muted)]">{t('settings:password_hint')}</p>
            </div>
            <Button variant="outline" onClick={() => setShowPasswordModal(true)} className="border-[var(--border)] text-[var(--text-main)] hover:bg-[var(--bg-main)]">{t('settings:change_password')}</Button>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm">
          <CardContent className="p-6">
            <h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">{t('settings:connected_accounts')}</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Github size={20} className="text-[var(--text-main)]" />
                  <span className="text-[var(--text-main)] font-medium">GitHub</span>
                </div>
                <Button variant="outline" disabled className="border-[var(--border)] text-[var(--text-muted)]">
                  {t('settings:not_connected')}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">W</div>
                  <span className="text-[var(--text-main)] font-medium">WeChat</span>
                </div>
                <Button variant="outline" disabled className="border-[var(--border)] text-[var(--text-muted)]">
                  {t('settings:not_connected')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div><h3 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{t('settings:2fa_title')}</h3><p className="text-sm text-[var(--text-muted)] max-w-md">{t('settings:2fa_desc')}</p></div>
              <div
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${user.twoFactorEnabled ? 'bg-[var(--primary)]' : 'bg-slate-200'}`}
                onClick={() => {
                  if (user.twoFactorEnabled) {
                    setShowDisable2FAModal(true);
                  } else {
                    if (!show2FA) handleGenerate2FA();
                    else setShow2FA(false);
                  }
                }}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${user.twoFactorEnabled ? 'translate-x-6' : ''}`}></div>
              </div>
            </div>
            {(show2FA && !user.twoFactorEnabled) && (
              <div className="mt-6 bg-[var(--bg-main)] p-4 rounded-xl border border-[var(--border)] animate-in fade-in slide-in-from-top-2">
                <div className="flex flex-col md:flex-row gap-6 items-center">
                  <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                    {qrUrl && <QRCodeSVG value={qrUrl} size={120} />}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="text-sm font-medium text-[var(--text-main)]">{t('settings:scan_qr')}</div>
                    <div className="text-sm font-medium text-[var(--text-main)] mt-2">{t('settings:enter_code')}</div>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder={t('settings:enter_6_digit_code')}
                        className="w-32 text-center tracking-widest text-slate-800 bg-white"
                        maxLength={6}
                        value={code}
                        onChange={e => setCode(e.target.value)}
                      />
                      <Button onClick={handleEnable2FA} disabled={isPending} className="bg-[var(--text-main)] text-[var(--bg-card)] hover:opacity-90">
                        {isPending ? '...' : t('common:verify_enable')}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {user.twoFactorEnabled && <div className="mt-4 flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg w-fit text-sm font-medium"><CheckCircle2 size={16} /> {t('settings:2fa_activated')}</div>}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings:change_password_title')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit} className="space-y-4 py-4">
            <Input type="password" required placeholder={t('settings:current_password_placeholder')} />
            <Input type="password" required placeholder={t('settings:new_password_placeholder')} />
            <Input type="password" required placeholder={t('settings:confirm_password_placeholder')} />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowPasswordModal(false)}>{t('common:cancel')}</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">{t('settings:confirm_change')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDisable2FAModal} onOpenChange={setShowDisable2FAModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings:disable_2fa_title')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDisable2FA} className="space-y-4 py-4">
            <p className="text-sm text-slate-500">{t('settings:disable_2fa_desc')}</p>
            <Input
              type="password"
              required
              placeholder={t('settings:current_password_placeholder')}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <Input
              type="text"
              required
              placeholder={t('auth:enter_2fa_code')}
              maxLength={6}
              value={code}
              onChange={e => setCode(e.target.value)}
            />
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={() => setShowDisable2FAModal(false)}>{t('common:cancel')}</Button>
              <Button type="submit" variant="destructive" disabled={disable2FA.isPending}>
                {disable2FA.isPending ? '...' : t('settings:confirm_disable')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
