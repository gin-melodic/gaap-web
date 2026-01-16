'use client';

import React, { useState, useMemo } from 'react';
import { useAllAccountsSuspense, Account, AccountType, Money } from '@/lib/hooks';
import { useTranslation } from 'react-i18next';
import { ACCOUNT_TYPES, EXCHANGE_RATES } from '@/lib/data';
import { MoneyHelper } from '@/lib/utils/money';
import {
  Plus,
  Wallet,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  CornerDownRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AddAccountModal from './AddAccountModal';
import EditAccountModal from './EditAccountModal';

const Accounts = () => {
  const { t } = useTranslation(['accounts', 'common']);
  const { accounts } = useAllAccountsSuspense();
  // We use string IDs for tabs, but map them to Enums for filtering
  const [activeTab, setActiveTab] = useState('ALL');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const itemsPerPage = 10;

  const formatCurrency = (amount: number | Money, currency = 'CNY') => {
    let val = 0;
    if (typeof amount === 'number') {
      val = amount;
    } else {
      // Assume Money proto or undefined
      val = MoneyHelper.from(amount).toNumber();
    }

    try {
      return new Intl.NumberFormat('zh-CN', { style: 'currency', currency }).format(val);
    } catch {
      return `${currency} ${val.toFixed(2)}`;
    }
  };

  const tabToEnum: Record<string, AccountType | undefined> = useMemo(() => ({
    'ASSET': AccountType.ACCOUNT_TYPE_ASSET,
    'LIABILITY': AccountType.ACCOUNT_TYPE_LIABILITY,
    'INCOME': AccountType.ACCOUNT_TYPE_INCOME,
    'EXPENSE': AccountType.ACCOUNT_TYPE_EXPENSE
  }), []);

  const topLevelAccounts = useMemo(() => {
    let filtered = accounts.filter(a => !a.parentId);

    if (activeTab !== 'ALL') {
      const targetType = tabToEnum[activeTab];
      if (targetType !== undefined) {
        filtered = filtered.filter(a => a.type === targetType);
      }
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(parent => {
        if (parent.name.toLowerCase().includes(query)) return true;
        const children = accounts.filter(child => child.parentId === parent.id);
        return children.some(child => child.name.toLowerCase().includes(query));
      });
    }
    // Sort by createdAt in descending order (newest first)
    filtered.sort((a, b) => {
      // Ensure date handling is safe
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
    return filtered;
  }, [accounts, activeTab, searchQuery, tabToEnum]);

  const totalPages = Math.ceil(topLevelAccounts.length / itemsPerPage);

  const currentTopAccounts = useMemo(() => {
    const start = (page - 1) * itemsPerPage;
    return topLevelAccounts.slice(start, start + itemsPerPage);
  }, [topLevelAccounts, page, itemsPerPage]);

  const tabs = [
    { id: 'ALL', label: t('common:all') },
    { id: 'ASSET', label: t('common:asset') },
    { id: 'LIABILITY', label: t('common:liability') },
    { id: 'INCOME', label: t('common:income') },
    { id: 'EXPENSE', label: t('common:expense') }
  ];

  const AccountRow = ({ account, isChild = false, groupBalance, hasChildren = false }: { account: Account, isChild?: boolean, groupBalance?: number, hasChildren?: boolean }) => {
    const typeMeta = ACCOUNT_TYPES[account.type] || ACCOUNT_TYPES[AccountType.ACCOUNT_TYPE_ASSET];
    const TypeIcon = typeMeta.icon;

    const handleClick = () => {
      setEditAccount(account);
      setIsEditModalOpen(true);
    };

    // Safe access to currency
    const currency = account.balance?.currencyCode || 'CNY';
    // Safe access to balance value
    const balanceVal = account.balance; // Money object

    if (account.isGroup) {
      const itemBg = hasChildren ? 'bg-[var(--bg-card)]' : 'bg-[var(--bg-main)]';
      return (
        <div
          className="flex justify-between items-center p-2 w-full cursor-pointer hover:bg-[var(--bg-main)]/80 transition-colors rounded-lg"
          onClick={handleClick}
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${itemBg} text-[var(--text-muted)]`}>
              <TypeIcon size={16} />
            </div>
            <div className="font-bold text-[var(--text-main)]">{account.name}</div>
            <span className={`text-[10px] ${itemBg} px-1.5 rounded text-[var(--text-muted)]`}>{t('accounts:account_group')}</span>
          </div>
          {groupBalance !== undefined && (
            <div className="text-right">
              <div className="font-bold text-[var(--text-main)]">{formatCurrency(groupBalance, 'CNY')}</div>
              <div className="text-[10px] text-slate-400">≈ {t('common:total')}</div>
            </div>
          )}
        </div>
      );
    }
    return (
      <div
        className={`flex justify-between items-center p-2 ${isChild ? 'pl-2' : ''} cursor-pointer hover:bg-[var(--bg-main)]/80 transition-colors rounded-lg`}
        onClick={handleClick}
      >
        <div className="flex items-center gap-3">
          {!isChild && (
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeMeta.bg} ${typeMeta.color}`}>
              <TypeIcon size={20} />
            </div>
          )}
          {isChild && (
            <div className="w-8 h-8 flex items-center justify-center text-slate-300">
              <CornerDownRight size={16} />
            </div>
          )}
          <div>
            <div className="font-medium text-[var(--text-main)] flex items-center gap-2">
              {account.name}
              {currency !== 'CNY' && (
                <span className="text-[10px] bg-[var(--bg-main)] text-[var(--text-muted)] px-1.5 py-0.5 rounded font-bold">{currency}</span>
              )}
            </div>
            {!isChild && <div className="text-xs text-[var(--text-muted)] capitalize">{t('common:' + typeMeta.label.toLowerCase())}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-[var(--text-main)]">{formatCurrency(MoneyHelper.from(balanceVal).toNumber(), currency)}</div>
          {currency !== 'CNY' && (
            <div className="text-[10px] text-slate-400">≈ {formatCurrency(MoneyHelper.from(balanceVal).toNumber() * (EXCHANGE_RATES[currency] || 1), 'CNY')}</div>
          )}
        </div>
      </div>
    );
  };

  const renderAccountCard = (parentAccount: Account) => {
    const children = accounts.filter(a => a.parentId === parentAccount.id);
    const groupBalance = children.reduce((sum, child) => {
      const childIso = child.balance?.currencyCode || 'CNY';
      const rate = EXCHANGE_RATES[childIso] || 1;
      const balVal = MoneyHelper.from(child.balance).toNumber();
      return sum + (balVal * rate);
    }, 0);

    return (
      <Card key={parentAccount.id} className="bg-[var(--bg-card)] border-[var(--border)] gap-0 p-0 shadow-sm mb-3 overflow-hidden transition-all hover:shadow-md">
        <div className={`${children.length > 0 ? 'bg-[var(--bg-main)] border-b border-[var(--border)]' : 'p-2'}`}>
          <AccountRow account={parentAccount} groupBalance={groupBalance} hasChildren={children.length > 0} />
        </div>
        {children.length > 0 && (
          <div className="bg-[var(--bg-card)] p-2 flex flex-col gap-1">
            {children.map(child => (
              <AccountRow key={child.id} account={child} isChild={true} />
            ))}
          </div>
        )}
      </Card>
    );
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-[var(--text-main)]">{t('accounts:my_accounts')}</h2>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-[var(--primary)] text-white hover:opacity-90 shadow-lg shadow-indigo-200/20" size="icon">
          <Plus size={20} />
        </Button>
      </div>

      <Tabs defaultValue="ALL" onValueChange={(val) => { setActiveTab(val); setPage(1); }} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto bg-transparent p-0 h-auto gap-2 no-scrollbar">
          {tabs.map(tab => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors data-[state=active]:bg-[var(--primary)] data-[state=active]:text-white bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border)]`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="min-h-[300px]">
        {currentTopAccounts.length > 0 ? (
          currentTopAccounts.map(renderAccountCard)
        ) : (
          <div className="text-center py-12 text-[var(--text-muted)]">
            <Wallet size={48} className="mx-auto mb-2 opacity-20" />
            <p>{t('accounts:no_accounts_found')}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 mt-6 bg-[var(--bg-main)] p-3 rounded-xl border border-[var(--border)]">
        <div className="flex items-center gap-4 w-full sm:w-auto justify-center">
          <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="bg-[var(--bg-card)] border-[var(--border)] hover:bg-[var(--bg-main)]"><ChevronLeft size={18} className="text-[var(--text-main)]" /></Button>
          <span className="text-sm font-medium text-[var(--text-muted)] min-w-[60px] text-center">{t('accounts:page_info', { current: page, total: Math.max(1, totalPages) })}</span>
          <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="bg-[var(--bg-card)] border-[var(--border)] hover:bg-[var(--bg-main)]"><ChevronRight size={18} className="text-[var(--text-main)]" /></Button>
        </div>
        <div className="relative w-full sm:w-64">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Search size={16} /></div>
          <Input
            type="text"
            placeholder={t('accounts:filter_accounts')}
            className="pl-9 pr-9 bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-main)] focus-visible:ring-[var(--primary)]"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
          {searchQuery && (
            <button onClick={() => { setSearchQuery(''); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-[var(--bg-main)]"><X size={14} /></button>
          )}
        </div>
      </div>

      <AddAccountModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
      {editAccount && (
        <EditAccountModal
          isOpen={isEditModalOpen}
          onClose={() => { setIsEditModalOpen(false); setEditAccount(null); }}
          account={editAccount}
        />
      )}
    </div>
  );
};

export default Accounts;
