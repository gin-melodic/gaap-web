import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobal } from '@/context/GlobalContext';
import { useUpdateAccount, useDeleteAccount, useCreateAccount, useAllAccounts, AccountType, Account } from '@/lib/hooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
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
import { Plus, Trash2, CornerDownRight, AlertTriangle } from 'lucide-react';
import { toast } from "sonner";

interface EditAccountFormProps {
  account: Account;
  onClose: () => void;
}

interface ChildAccount {
  id: string;
  name: string;
  currency: string;
  balance: string;
  isDefault?: boolean;
  isNew?: boolean;
}

const EditAccountForm = ({ account, onClose }: EditAccountFormProps) => {
  const { t } = useTranslation(['accounts', 'common']);
  const { currencies } = useGlobal();
  const { accounts } = useAllAccounts();
  const updateAccountMutation = useUpdateAccount();
  const deleteAccountMutation = useDeleteAccount();
  const createAccountMutation = useCreateAccount();

  const [name, setName] = useState(account.name);
  const [date, setDate] = useState(account.date || new Date().toISOString().split('T')[0]);
  const [number, setNumber] = useState(account.number || '');
  const [remarks, setRemarks] = useState(account.remarks || '');
  const [balance, setBalance] = useState(account.balance?.toString() || '0');
  const [currency, setCurrency] = useState(account.currency || 'CNY');

  // Group account state
  const isGroup = account.isGroup;
  const [children, setChildren] = useState<ChildAccount[]>(() => {
    if (isGroup) {
      const accountChildren = accounts.filter(a => a.parentId === account.id);
      return accountChildren.map(c => ({
        id: c.id,
        name: c.name,
        currency: c.currency,
        balance: c.balance.toString(),
        isDefault: false,
        isNew: false
      }));
    }
    return [];
  });

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [migrationTargets, setMigrationTargets] = useState<Record<string, string>>({});

  const handleAddChild = () => {
    setChildren([...children, {
      id: `new_${Date.now()}`,
      name: '',
      currency: 'CNY',
      balance: '0',
      isDefault: false,
      isNew: true
    }]);
  };

  const handleRemoveChild = (id: string) => {
    const child = children.find(c => c.id === id);
    if (child?.isNew) {
      setChildren(children.filter(c => c.id !== id));
    } else {
      toast.error(t('accounts:delete_child_hint', { defaultValue: 'To delete a sub-account, please go to its specific page or delete the parent account.' }));
    }
  };

  const handleChildChange = (id: string, field: keyof ChildAccount, value: string | boolean) => {
    setChildren(children.map(c => {
      if (c.id === id) {
        return { ...c, [field]: value };
      }
      return c;
    }));
  };

  const handleSaveWithChildren = async () => {
    try {
      // Update Parent
      await updateAccountMutation.mutateAsync({
        id: account.id,
        input: {
          name,
          date,
          number,
          remarks,
          ...(!isGroup ? { balance: parseFloat(balance), currency } : {})
        }
      });

      if (isGroup) {
        for (const child of children) {
          if (child.isNew) {
            await createAccountMutation.mutateAsync({
              parentId: account.id,
              name: child.name,
              type: account.type as AccountType,
              balance: parseFloat(child.balance) || 0,
              currency: child.currency,
              isGroup: false,
            });
          } else {
            await updateAccountMutation.mutateAsync({
              id: child.id,
              input: {
                name: child.name,
                balance: parseFloat(child.balance)
              }
            });
          }
        }
      }

      onClose();
    } catch {
      // Error is already handled by the hook with toast
    }
  };

  const getAvailableTargets = (curr: string) => {
    let accountsToDeleteIds = [account.id];
    if (isGroup) {
      accountsToDeleteIds = [...accountsToDeleteIds, ...accounts.filter(a => a.parentId === account.id).map(a => a.id)];
    }

    return accounts.filter(a =>
      a.currency === curr &&
      a.type === account.type && // Filter by same account type
      !accountsToDeleteIds.includes(a.id) &&
      !a.isGroup
    );
  };

  const prepareDelete = () => {
    setMigrationTargets({});
    setIsDeleteAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      // For group accounts, the backend handles children deletion as part of the task
      // Just create one migration task that includes all child accounts
      await deleteAccountMutation.mutateAsync({
        id: account.id,
        migrationTargets
      });

      setIsDeleteAlertOpen(false);
      onClose();
    } catch {
      // Error is already handled by the hook with toast
    }
  };

  const isPending = updateAccountMutation.isPending ||
    deleteAccountMutation.isPending ||
    createAccountMutation.isPending;

  // Calculate if we have any blocked currencies (no targets available)
  const requiredCurrencies = Object.keys(
    [account, ...(isGroup ? children : [])].reduce((acc, curr) => {
      if (curr && curr.currency) acc[curr.currency] = true;
      return acc;
    }, {} as Record<string, boolean>)
  );

  const blockedCurrencies = requiredCurrencies.filter(curr => getAvailableTargets(curr).length === 0);
  const hasBlockedCurrencies = blockedCurrencies.length > 0;

  // Check if all required fields are selected (for non-blocked currencies)
  const isMigrationComplete = requiredCurrencies
    .filter(curr => !blockedCurrencies.includes(curr))
    .every(curr => !!migrationTargets[curr]);

  return (
    <>
      <div className="grid gap-6 py-4">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('accounts:account_name')}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
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
                <Select value={currency} onValueChange={setCurrency} disabled>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('accounts:balance')}</Label>
                <Input
                  type="number"
                  value={balance}
                  onChange={e => setBalance(e.target.value)}
                  disabled={account?.type === 'EXPENSE' || account?.type === 'INCOME'}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('accounts:account_number')}</Label>
              <Input value={number} onChange={e => setNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('accounts:remarks')}</Label>
              <Input value={remarks} onChange={e => setRemarks(e.target.value)} />
            </div>
          </div>
        </div>

        {isGroup && (
          <div className="space-y-4 border rounded-xl p-4 bg-[var(--bg-main)]/50 mt-6">
            <div className="flex justify-between items-center">
              <Label className="text-base">{t('accounts:sub_accounts')}</Label>
              <Button variant="outline" size="sm" onClick={handleAddChild}><Plus size={14} className="mr-1" /> {t('common:add')}</Button>
            </div>

            <div className="space-y-3">
              {children.map((child) => (
                <div key={child.id} className="flex gap-3 items-start">
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
                      <Select value={child.currency} onValueChange={v => handleChildChange(child.id, 'currency', v)} disabled={!child.isNew}>
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
                      {child.isNew && (
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
      </div>

      <DialogFooter className="flex justify-between sm:justify-between">
        <Button variant="destructive" onClick={prepareDelete} disabled={isPending} className="gap-2">
          <Trash2 size={16} /> {t('common:delete')}
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>{t('common:cancel')}</Button>
          <Button onClick={handleSaveWithChildren} disabled={isPending} className="bg-[var(--primary)] text-white hover:opacity-90">
            {isPending ? t('common:saving') || '保存中...' : t('common:save')}
          </Button>
        </div>
      </DialogFooter>

      <Dialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accounts:delete_account_title')}</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 text-muted-foreground text-sm">
                <p>{t('accounts:delete_account_confirm')}</p>
                <div className="space-y-4">
                  {requiredCurrencies.map(curr => {
                    const targets = getAvailableTargets(curr);
                    const isTargetMissing = targets.length === 0;

                    return (
                      <div key={curr} className="space-y-2">
                        <Label>{t('accounts:migrate_balance_for', { currency: curr, defaultValue: `Migrate ${curr} balance to:` })}</Label>

                        {isTargetMissing ? (
                          <div className="text-sm text-red-500 flex items-center gap-2 border border-red-200 bg-red-50 p-2 rounded-md">
                            <AlertTriangle size={14} className="shrink-0" />
                            <span>
                              {t('accounts:no_available_funding_accounts', {
                                type: account?.type,
                                defaultValue: `No available ${account?.type} funding accounts, please create one before proceeding with deletion`
                              })}
                            </span>
                          </div>
                        ) : (
                          <Select
                            value={migrationTargets[curr]}
                            onValueChange={(val) => setMigrationTargets(prev => ({ ...prev, [curr]: val }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('accounts:select_account')} />
                            </SelectTrigger>
                            <SelectContent>
                              {targets.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name} ({t.currency})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteAlertOpen(false)}>{t('common:cancel')}</Button>
            <Button
              variant="destructive"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                if (!hasBlockedCurrencies && isMigrationComplete) handleDeleteConfirm();
              }}
              disabled={isPending || hasBlockedCurrencies || !isMigrationComplete}
            >
              {isPending ? t('common:deleting') || '删除中...' : t('common:delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface EditAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
}

const EditAccountModal = ({ isOpen, onClose, account }: EditAccountModalProps) => {
  const { t } = useTranslation(['accounts', 'common']);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('accounts:edit_account')}</DialogTitle>
        </DialogHeader>
        {account && <EditAccountForm key={account.id} account={account} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
};

export default EditAccountModal;
