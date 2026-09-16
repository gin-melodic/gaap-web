import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGlobal } from '@/context/GlobalContext';
import { useUpdateAccount, useDeleteAccount, useCreateAccount, useAllAccounts, AccountType, Account } from '@/lib/hooks';
import { accountService } from '@/lib/services';
import { MoneyHelper } from '@/lib/utils/money';
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
  const { currencies, baseCurrency } = useGlobal();
  const { accounts } = useAllAccounts();
  const updateAccountMutation = useUpdateAccount();
  const deleteAccountMutation = useDeleteAccount();
  const createAccountMutation = useCreateAccount({ silent: true });

  const [name, setName] = useState(account.name);
  const [date, setDate] = useState(account.date || new Date().toISOString().split('T')[0]);
  const [number, setNumber] = useState(account.number || '');
  const [remarks, setRemarks] = useState(account.remarks || '');
  const [balance, setBalance] = useState(() => account.balance ? MoneyHelper.from(account.balance).format(9) : '0');
  const [currency, setCurrency] = useState(account.balance?.currencyCode || baseCurrency);

  // Group account state
  const isGroup = account.isGroup;
  const [children, setChildren] = useState<ChildAccount[]>(() => {
    if (isGroup) {
      const accountChildren = accounts.filter(a => a.parentId === account.id);
      return accountChildren.map(c => ({
        id: c.id,
        name: c.name,
        currency: c.balance?.currencyCode || baseCurrency,
        balance: c.balance ? MoneyHelper.from(c.balance).format(9) : '0',
        isDefault: false,
        isNew: false
      }));
    }
    return [];
  });

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [transactionCount, setTransactionCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);

  const handleAddChild = () => {
    setChildren([...children, {
      id: `new_${Date.now()}`,
      name: '',
      currency: baseCurrency,
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
          type: account.type,
          date,
          number,
          remarks,
          ...(!isGroup ? { balance: balance || '0', currency } : {})
        }
      });

      if (isGroup) {
        for (const child of children) {
          if (child.isNew) {
            await createAccountMutation.mutateAsync({
              parentId: account.id,
              name: child.name,
              type: account.type as AccountType,
              balance: child.balance || '0',
              currency: child.currency,
              isGroup: false,
              date
            });
          } else {
            await updateAccountMutation.mutateAsync({
              id: child.id,
              input: {
                name: child.name,
                balance: child.balance || '0'
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

  const prepareDelete = async () => {
    setIsLoadingCount(true);
    setTransactionCount(null);
    try {
      // Get transaction count for this account and all children
      const accountIds = [account.id, ...children.filter(c => !c.isNew).map(c => c.id)];
      let totalCount = 0;
      for (const id of accountIds) {
        const { count } = await accountService.getTransactionCount(id);
        totalCount += count;
      }
      setTransactionCount(totalCount);
    } catch {
      // Fail closed: an unknown count must never expose the delete action.
      setTransactionCount(1);
    } finally {
      setIsLoadingCount(false);
    }
    setIsDeleteAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (transactionCount !== 0) return;
    try {
      await deleteAccountMutation.mutateAsync({
        id: account.id,
        migrationTargets: {}
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
                  disabled={account?.type === AccountType.ACCOUNT_TYPE_EXPENSE || account?.type === AccountType.ACCOUNT_TYPE_INCOME || account?.type === AccountType.ACCOUNT_TYPE_EQUITY}
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => handleRemoveChild(child.id)}>
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
            {isPending ? t('common:saving') : t('common:save')}
          </Button>
        </div>
      </DialogFooter>

      <Dialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('accounts:delete_account_title')}</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 text-muted-foreground text-sm">
                {isLoadingCount ? (
                  <p>{t('common:loading')}</p>
                ) : transactionCount === 0 ? (
                  // No transactions - simple confirmation
                  <p>{t('accounts:delete_no_transactions_confirm')}</p>
                ) : (
                  <div className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2 border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-md">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span>{t('accounts:delete_with_transactions_beta_blocked')}</span>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteAlertOpen(false)}>{t('common:cancel')}</Button>
            {transactionCount === 0 ? (
              // No transactions - direct delete button
              <Button
                variant="destructive"
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  handleDeleteConfirm();
                }}
                disabled={isPending || isLoadingCount}
              >
                {isPending ? t('common:deleting') : t('common:delete')}
              </Button>
            ) : null}
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
          <DialogDescription>{t('accounts:edit_account_desc')}</DialogDescription>
        </DialogHeader>
        {account && <EditAccountForm key={account.id} account={account} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
};

export default EditAccountModal;
