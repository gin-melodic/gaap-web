'use client';

import React, { useState } from 'react';
import { useAllTransactionsSuspense, useAllAccountsSuspense, useCreateTransaction, useUpdateTransaction, useDeleteTransaction, useCreateAccount, TransactionType, AccountType } from '@/lib/hooks';
import { useGlobal } from '@/context/GlobalContext';
import { useTranslation } from 'react-i18next';
import { Plus, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from '@/components/ui/label';

const Transactions = () => {
  const { t } = useTranslation(['transactions', 'common']);
  const { transactions } = useAllTransactionsSuspense();
  const { accounts } = useAllAccountsSuspense();
  const createTransaction = useCreateTransaction();
  const updateTransactionMutation = useUpdateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();
  const createAccount = useCreateAccount({ silent: true });

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [txToDelete, setTxToDelete] = useState<string | null>(null);
  const [isCreatingExpense, setIsCreatingExpense] = useState(false);
  const [newExpenseName, setNewExpenseName] = useState('');
  const [isCreatingIncome, setIsCreatingIncome] = useState(false);
  const [newIncomeName, setNewIncomeName] = useState('');
  const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  };

  const [newTx, setNewTx] = useState({ amount: '', note: '', from: '', to: '', date: getCurrentDateTime() });

  const formatCurrency = (amount: number, currency = 'CNY') => {
    try {
      return new Intl.NumberFormat('zh-CN', { style: 'currency', currency }).format(amount);
    } catch (e) {
      return `${currency} ${amount.toFixed(2)}`;
    }
  };

  const getCurrencySymbol = (currencyCode: string) => {
    try {
      return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: currencyCode })
        .formatToParts(0)
        .find(part => part.type === 'currency')?.value || currencyCode;
    } catch (e) {
      return currencyCode;
    }
  };

  const currentCurrency = accounts.find(a => a.id === newTx.from)?.currency || 'CNY';

  const getFullAccountName = (account: any, allAccounts: any[]) => {
    if (account.parentId) {
      const parent = allAccounts.find(a => a.id === account.parentId);
      return parent ? `${parent.name} - ${account.name}` : account.name;
    }
    return account.name;
  };

  const resetForm = () => {
    setNewTx({ amount: '', note: '', from: '', to: '', date: getCurrentDateTime() });
    setIsCreatingExpense(false);
    setNewExpenseName('');
    setIsCreatingIncome(false);
    setNewIncomeName('');
    setEditingTxId(null);
  };

  const isValid = () => {
    if (!newTx.amount || !newTx.from || !newTx.to || !newTx.date) return false;
    if (isCreatingIncome && !newIncomeName) return false;
    if (isCreatingExpense && !newExpenseName) return false;
    return true;
  };

  const formatDateForInput = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return dateStr;
    }
  };

  const formatDateForDisplay = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;

      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).format(d).replace(/\//g, '-');
    } catch (e) {
      return dateStr;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.from || !newTx.to) return;

    try {
      let finalFromAccount = newTx.from;
      let finalToAccount = newTx.to;

      if (newTx.from === 'NEW_INCOME') {
        if (!newIncomeName) return;
        const newAccount = await createAccount.mutateAsync({
          name: newIncomeName,
          type: AccountType.INCOME,
          currency: 'CNY',
          balance: 0,
          isGroup: false,
        });
        finalFromAccount = newAccount.id;
      }

      if (newTx.to === 'NEW_EXPENSE') {
        if (!newExpenseName) return;
        const sourceAcc = accounts.find(a => a.id === finalFromAccount);
        const newAccount = await createAccount.mutateAsync({
          name: newExpenseName,
          type: AccountType.EXPENSE,
          currency: sourceAcc?.currency || 'CNY',
          balance: 0,
          isGroup: false,
        });
        console.log('Created account response:', newAccount);
        finalToAccount = newAccount.id;
        console.log('finalToAccount:', finalToAccount);
      }

      const fromAccount = finalFromAccount === newTx.from ? accounts.find(a => a.id === newTx.from) : { type: AccountType.INCOME, currency: 'CNY' };
      const toAccount = finalToAccount === newTx.to ? accounts.find(a => a.id === newTx.to) : { type: AccountType.EXPENSE };

      let type = TransactionType.TRANSFER;
      if (toAccount?.type === AccountType.EXPENSE) type = TransactionType.EXPENSE;
      if (fromAccount?.type === AccountType.INCOME) type = TransactionType.INCOME;

      let finalNote = newTx.note;
      if (!finalNote) {
        const typeName = type === TransactionType.EXPENSE ? t('common:expense') : type === TransactionType.INCOME ? t('common:income') : t('transactions:transfer');
        const targetAccountName = finalToAccount === newTx.to
          ? (accounts.find(a => a.id === newTx.to)?.name || '')
          : newExpenseName;
        finalNote = `${typeName}-${targetAccountName}`;
      }

      // Ensure seconds are included and format is YYYY-MM-DD HH:mm:ss
      let dateToSend = newTx.date.replace('T', ' ');
      if (dateToSend.split(':').length === 2) {
        dateToSend += ':00';
      }

      const txData = {
        from: finalFromAccount,
        to: finalToAccount,
        amount: parseFloat(newTx.amount),
        currency: fromAccount?.currency || 'CNY',
        type,
        note: finalNote,
        date: dateToSend,
      };

      if (editingTxId) {
        await updateTransactionMutation.mutateAsync({ id: editingTxId, input: txData });
      } else {
        await createTransaction.mutateAsync(txData);
      }

      setShowAddModal(false);
      resetForm();
    } catch (error) {
      // Error is already handled by the hook with toast
    }
  };

  const handleFromChange = (val: string) => {
    setNewTx({ ...newTx, from: val });
    if (val === 'NEW_INCOME') setIsCreatingIncome(true); else setIsCreatingIncome(false);
  };

  const handleToChange = (val: string) => {
    setNewTx({ ...newTx, to: val });
    if (val === 'NEW_EXPENSE') setIsCreatingExpense(true); else setIsCreatingExpense(false);
  };

  const handleEdit = (tx: any) => {
    setNewTx({
      amount: tx.amount.toString(),
      note: tx.note,
      from: tx.from,
      to: tx.to,
      date: formatDateForInput(tx.date)
    });
    setEditingTxId(tx.id);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    setTxToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (txToDelete) {
      try {
        await deleteTransactionMutation.mutateAsync(txToDelete);
        setShowDeleteConfirm(false);
        setTxToDelete(null);
        if (editingTxId === txToDelete) {
          setShowAddModal(false);
          resetForm();
        }
      } catch (error) {
        // Error is already handled by the hook with toast
      }
    }
  };

  const renderAccountOptions = (filterFn: (a: any) => boolean) => {
    return accounts.filter(filterFn).map(a => {
      if (a.isGroup) return null;
      const label = getFullAccountName(a, accounts);
      return <SelectItem key={a.id} value={a.id}>{label}</SelectItem>;
    });
  };

  const isPending = createTransaction.isPending ||
    updateTransactionMutation.isPending ||
    deleteTransactionMutation.isPending ||
    createAccount.isPending;

  return (
    <div className="h-full flex flex-col relative pb-20 md:pb-0">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[var(--text-main)]">{t('transactions:history')}</h2>
        <Dialog open={showAddModal} onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-[var(--primary)] text-white hover:opacity-90 shadow-sm shadow-indigo-200/50">
              <Plus size={16} className="mr-2" /> {t('transactions:add_transaction')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingTxId ? t('transactions:edit_transaction') : t('transactions:new_transaction')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  {t('transactions:date')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="datetime-local"
                  step="1"
                  className="bg-white font-bold"
                  value={newTx.date}
                  onChange={e => setNewTx({ ...newTx, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase">
                  {t('transactions:amount')} <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-baseline border-b-2 border-slate-200 focus-within:border-indigo-600 transition-colors">
                  <span className="text-2xl font-bold text-slate-400 shrink-0 mr-2">
                    {getCurrencySymbol(currentCurrency)}
                  </span>
                  <Input
                    type="number"
                    autoFocus
                    placeholder="0.00"
                    className="text-3xl md:text-3xl font-bold border-none px-0 py-2 shadow-none placeholder:text-slate-300 focus-visible:ring-0 h-auto"
                    onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
                    value={newTx.amount}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-red-500 uppercase mb-1 block">
                    {t('transactions:from')}
                  </Label>
                  <Select value={newTx.from} onValueChange={handleFromChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('transactions:select_account')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>{t('transactions:asset_source')}</SelectLabel>
                        {renderAccountOptions(a => a.type === AccountType.ASSET)}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>{t('transactions:income_source')}</SelectLabel>
                        <SelectItem value="NEW_INCOME" className="font-bold text-indigo-600">{t('transactions:new_income_account')}</SelectItem>
                        {renderAccountOptions(a => a.type === AccountType.INCOME)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-emerald-600 uppercase mb-1 block">
                    {t('transactions:to')}
                  </Label>
                  <Select value={newTx.to} onValueChange={handleToChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('transactions:select_account')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>{t('transactions:expense_destination')}</SelectLabel>
                        <SelectItem value="NEW_EXPENSE" className="font-bold text-indigo-600">{t('transactions:new_expense_account')}</SelectItem>
                        {renderAccountOptions(a => a.type === AccountType.EXPENSE)}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>{t('transactions:asset_deposit')}</SelectLabel>
                        {renderAccountOptions(a => a.type === AccountType.ASSET)}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>{t('transactions:liability_repayment')}</SelectLabel>
                        {renderAccountOptions(a => a.type === AccountType.LIABILITY)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {isCreatingIncome && (
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-xs font-bold text-indigo-600 uppercase mb-1 block">
                    {t('transactions:new_income_name')} <span className="text-red-500">*</span>
                  </Label>
                  <Input type="text" className="bg-white" placeholder={t('transactions:income_placeholder')} value={newIncomeName} onChange={e => setNewIncomeName(e.target.value)} required />
                </div>
              )}
              {isCreatingExpense && (
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 animate-in fade-in slide-in-from-top-2">
                  <Label className="text-xs font-bold text-orange-600 uppercase mb-1 block">
                    {t('transactions:new_expense_name')} <span className="text-red-500">*</span>
                  </Label>
                  <Input type="text" className="bg-white" placeholder={t('transactions:expense_placeholder')} value={newExpenseName} onChange={e => setNewExpenseName(e.target.value)} required />
                </div>
              )}
              <div>
                <Label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{t('transactions:note')}</Label>
                <Input type="text" placeholder={t('transactions:note_placeholder')} value={newTx.note} onChange={e => setNewTx({ ...newTx, note: e.target.value })} />
              </div>
              <div className="pt-2 flex gap-3">
                {editingTxId && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1 py-6 rounded-xl font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 shadow-none"
                    onClick={() => handleDelete(editingTxId)}
                    disabled={isPending}
                  >
                    {t('transactions:delete_transaction')}
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={!isValid() || isPending}
                  className={`flex-[2] text-white py-6 rounded-xl font-bold hover:opacity-90 ${editingTxId ? 'bg-indigo-600' : 'bg-slate-900'} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isPending ? '处理中...' : (editingTxId ? t('common:save') : t('transactions:confirm_add'))}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-3 overflow-y-auto">
        {transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => {
          const fromAcc = accounts.find(a => a.id === tx.from);
          const toAcc = accounts.find(a => a.id === tx.to);
          return (
            <Card key={tx.id} className="bg-[var(--bg-card)] border-[var(--border)] shadow-sm cursor-pointer hover:border-indigo-300 transition-colors active:scale-[0.99]" onClick={() => handleEdit(tx)}>
              <div className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-[var(--text-main)] text-lg">{tx.note || t('transactions:unnamed_transaction')}</div>
                    <div className="text-xs text-[var(--text-muted)]">{formatDateForDisplay(tx.date)}</div>
                  </div>
                  <div className={`font-mono font-bold text-lg ${tx.type === TransactionType.EXPENSE ? 'text-[var(--text-main)]' : tx.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-[var(--primary)]'}`}>{formatCurrency(tx.amount, tx.currency)}</div>
                </div>
                <div className="flex items-center gap-2 text-sm bg-[var(--bg-main)] p-2 rounded-lg mt-1 border border-[var(--border)]">
                  <span className="text-[var(--text-muted)] truncate max-w-[45%]">{fromAcc ? getFullAccountName(fromAcc, accounts) : t('transactions:unknown_account')}</span>
                  <ArrowRightLeft size={14} className="text-slate-400 shrink-0" />
                  <span className="text-[var(--text-muted)] truncate max-w-[45%]">{toAcc ? getFullAccountName(toAcc, accounts) : t('transactions:unknown_account')}</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('transactions:confirm_delete')}</DialogTitle>
            <DialogDescription>
              {t('transactions:delete_warning')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>{t('common:cancel')}</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleteTransactionMutation.isPending}>
              {deleteTransactionMutation.isPending ? '删除中...' : t('common:delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transactions;
