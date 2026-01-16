import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobal } from '@/context/GlobalContext';
import { useCreateAccount, useAllAccounts, AccountType, UserLevelType } from '@/lib/hooks';
import { ACCOUNT_TYPES } from '@/lib/data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, CornerDownRight, Crown } from 'lucide-react';
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddAccountModal = ({ isOpen, onClose }: AddAccountModalProps) => {
  const { t } = useTranslation(['accounts', 'common']);
  const { currencies, addCurrency: globalAddCurrency, user } = useGlobal();
  const { accounts } = useAllAccounts();
  const createAccount = useCreateAccount();

  const [type, setType] = useState<AccountType>(AccountType.ACCOUNT_TYPE_ASSET);
  const [isGroup, setIsGroup] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [number, setNumber] = useState('');
  const [remarks, setRemarks] = useState('');

  // Simple account state
  const [currency, setCurrency] = useState('CNY');
  const [balance, setBalance] = useState('0');

  // Group account state
  const [children, setChildren] = useState(() => [
    { id: Date.now().toString(), name: '', currency: 'CNY', balance: '0', isDefault: true }
  ]);

  const [saveAndContinue, setSaveAndContinue] = useState(false);
  const [isAddingCurrency, setIsAddingCurrency] = useState(false);
  const [newCurrencyCode, setNewCurrencyCode] = useState('');

  const handleAddCurrency = () => {
    if (newCurrencyCode && newCurrencyCode.length === 3) {
      globalAddCurrency(newCurrencyCode.toUpperCase());
      setNewCurrencyCode('');
      setIsAddingCurrency(false);
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset form state when modal opens
    }
  }, [isOpen]);

  const handleAddChild = () => {
    setChildren([...children, { id: Date.now().toString(), name: '', currency: 'CNY', balance: '0', isDefault: false }]);
  };

  const handleRemoveChild = (id: string) => {
    if (children.length > 1) {
      const newChildren = children.filter(c => c.id !== id);
      if (children.find(c => c.id === id)?.isDefault) {
        newChildren[0].isDefault = true;
      }
      setChildren(newChildren);
    }
  };

  const handleChildChange = (id: string, field: string, value: string) => {
    setChildren(children.map(c => {
      if (c.id === id) {
        return { ...c, [field]: value };
      }
      return c;
    }));
  };

  const handleSetDefaultChild = (id: string) => {
    setChildren(children.map(c => ({ ...c, isDefault: c.id === id })));
  };

  const resetForm = () => {
    setName('');
    setNumber('');
    setRemarks('');
    setBalance('0');
    setChildren([{ id: Date.now().toString(), name: '', currency: 'CNY', balance: '0', isDefault: true }]);
  };

  const handleSubmit = async () => {
    if (!name) return;
    const finalDate = date || new Date().toISOString().split('T')[0];

    // FREE user ASSET limit check
    if (type === AccountType.ACCOUNT_TYPE_ASSET && user.plan === UserLevelType.USER_LEVEL_TYPE_FREE) {
      const currentAssetCount = accounts.filter(a => a.type === AccountType.ACCOUNT_TYPE_ASSET && !a.parentId).length;
      if (currentAssetCount >= 5) {
        toast.error(t('accounts:free_asset_limit_reached'));
        return;
      }
    }

    try {
      if (isGroup && (type === AccountType.ACCOUNT_TYPE_ASSET || type === AccountType.ACCOUNT_TYPE_LIABILITY)) {
        // Create parent account first
        const res = await createAccount.mutateAsync({
          name,
          type,
          isGroup: true,
          balance: 0,
          currency: 'CNY',
          date: finalDate,
          ...(number ? { number } : {}),
          ...(remarks ? { remarks } : {}),
        });

        if (res.account?.id) {
          // Create children with parentId
          for (const child of children) {
            await createAccount.mutateAsync({
              parentId: res.account.id,
              name: child.name || `${name} ${child.currency}`,
              type,
              balance: parseFloat(child.balance) || 0,
              currency: child.currency,
              isGroup: false,
              date: finalDate
            });
          }
        }
      } else {
        // Simple Account
        await createAccount.mutateAsync({
          name,
          type,
          balance: parseFloat(balance) || 0,
          currency,
          date: finalDate,
          ...(number ? { number } : {}),
          ...(remarks ? { remarks } : {}),
          isGroup: false,
        });
      }

      resetForm();
      if (!saveAndContinue) {
        onClose();
      }
    } catch {
      // Error is already handled by the hook with toast
    }
  };

  const isPro = user.plan === UserLevelType.USER_LEVEL_TYPE_PRO;
  const isPending = createAccount.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('accounts:add_account')}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Account Type */}
          <div className="grid grid-cols-4 gap-4">
            {Object.entries(ACCOUNT_TYPES).map(([key, value]) => (
              <div
                key={key}
                onClick={() => {
                  const typeVal = Number(key) as AccountType;
                  setType(typeVal);
                  if (typeVal === AccountType.ACCOUNT_TYPE_INCOME || typeVal === AccountType.ACCOUNT_TYPE_EXPENSE) setIsGroup(false);
                }}
                className={`
                  cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-all
                  ${type === Number(key) ? `border-[var(--primary)] bg-[var(--primary)]/5 ${value.color}` : 'border-transparent bg-[var(--bg-main)] text-[var(--text-muted)] hover:bg-[var(--bg-main)]/80'}
                `}
              >
                <value.icon size={24} />
                <span className="text-sm font-bold">{t(`common:${key.toLowerCase()}`)}</span>
              </div>
            ))}
          </div>

          {/* Group Toggle - PRO only */}
          {(type === AccountType.ACCOUNT_TYPE_ASSET || type === AccountType.ACCOUNT_TYPE_LIABILITY) && (
            <div className={`flex items-center space-x-2 bg-[var(--bg-main)] p-3 pr-6 rounded-lg ${!isPro ? 'opacity-60' : ''}`}>
              <Checkbox
                id="isGroup"
                checked={isGroup}
                onCheckedChange={(c: boolean) => isPro && setIsGroup(!!c)}
                disabled={!isPro}
              />
              <Label htmlFor="isGroup" className={`flex-1 whitespace-nowrap ${isPro ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-2">
                        {t('accounts:enable_group_mode')}
                        {!isPro && <Crown size={14} className="text-amber-500" />}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[300px]">
                      {isPro ? t('accounts:group_mode_desc') : t('accounts:free_group_disabled')}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('accounts:account_name')}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder={t('accounts:account_name_placeholder')} />
              </div>
              <div className="space-y-2">
                <Label>{t('accounts:account_date')}</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
            </div>

            {!isGroup && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('common:currency')}</Label>
                  <div className="flex gap-2">
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" onClick={() => setIsAddingCurrency(!isAddingCurrency)}>
                            <Plus size={16} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('accounts:quick_add_currency')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {isAddingCurrency && (
                    <div className="flex gap-2 mt-2 animate-in slide-in-from-top-2">
                      <Input
                        placeholder={t('accounts:currency_placeholder')}
                        maxLength={3}
                        className="uppercase"
                        value={newCurrencyCode}
                        onChange={e => setNewCurrencyCode(e.target.value)}
                      />
                      <Button size="sm" onClick={handleAddCurrency} disabled={newCurrencyCode.length !== 3}>{t('common:ok')}</Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('accounts:initial_balance')}</Label>
                  <Input type="number" value={balance} onChange={e => setBalance(e.target.value)} />
                  {parseFloat(balance) !== 0 && (type === AccountType.ACCOUNT_TYPE_ASSET || type === AccountType.ACCOUNT_TYPE_LIABILITY) && (
                    <p className="text-xs text-purple-600">{t('accounts:initial_balance_info')}</p>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('accounts:account_number')} <span className="text-[var(--text-muted)]">({t('common:optional')})</span></Label>
                <Input value={number} onChange={e => setNumber(e.target.value)} placeholder={t('accounts:account_number_placeholder')} />
              </div>
              <div className="space-y-2">
                <Label>{t('accounts:remarks')} <span className="text-[var(--text-muted)]">({t('common:optional')})</span></Label>
                <Input value={remarks} onChange={e => setRemarks(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Children Accounts for Group Mode */}
          {isGroup && (
            <div className="space-y-4 border rounded-xl p-4 bg-[var(--bg-main)]/50 mt-6">
              <div className="flex justify-between items-center">
                <Label className="text-base">{t('accounts:sub_accounts')}</Label>
                <Button variant="outline" size="sm" onClick={handleAddChild}><Plus size={14} className="mr-1" /> {t('common:add')}</Button>
              </div>

              <div className="space-y-3">
                {children.map((child) => (
                  <div key={child.id} className="flex gap-3 items-start animate-in slide-in-from-left-2">
                    <div className="pt-3 text-[var(--text-muted)]"><CornerDownRight size={16} /></div>
                    <div className="grid grid-cols-12 gap-2 flex-1">
                      <div className="col-span-4">
                        <Input
                          placeholder={t('accounts:sub_account_name')}
                          value={child.name}
                          onChange={e => handleChildChange(child.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="col-span-3">
                        <Select value={child.currency} onValueChange={v => handleChildChange(child.id, 'currency', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          placeholder={t('accounts:balance_placeholder')}
                          value={child.balance}
                          onChange={e => handleChildChange(child.id, 'balance', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2 flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`cursor-pointer p-2 rounded-lg ${child.isDefault ? 'text-[var(--primary)] bg-[var(--primary)]/10' : 'text-[var(--text-muted)] hover:bg-[var(--bg-main)]'}`}
                                onClick={() => handleSetDefaultChild(child.id)}
                              >
                                <div className="text-[10px] font-bold">{t('accounts:default_short')}</div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('accounts:set_as_default_desc')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {children.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleRemoveChild(child.id)}>
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2 mt-6">
            <Checkbox id="saveAndContinue" checked={saveAndContinue} onCheckedChange={(c: boolean) => setSaveAndContinue(!!c)} />
            <Label htmlFor="saveAndContinue">{t('accounts:save_and_continue')}</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common:cancel')}</Button>
          <Button onClick={handleSubmit} disabled={!name || isPending} className="bg-[var(--primary)] text-white hover:opacity-90">
            {isPending ? t('common:saving') || '保存中...' : t('common:save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddAccountModal;
