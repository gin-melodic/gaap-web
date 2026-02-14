import { secureRequest } from '../network/secure-client';
import {
  ListAccountsReq,
  ListAccountsRes,
  GetAccountReq,
  GetAccountRes,
  CreateAccountReq,
  CreateAccountRes,
  UpdateAccountReq,
  UpdateAccountRes,
  DeleteAccountReq,
  DeleteAccountRes,
  GetAccountTransactionCountReq,
  GetAccountTransactionCountRes,
  AccountInput,
} from '../proto/account/v1/account';


export const accountService = {
  list: async (query?: ListAccountsReq['query']): Promise<ListAccountsRes> => {
    return secureRequest(
      '/account/list-accounts',
      { query },
      ListAccountsReq,
      ListAccountsRes
    );
  },

  get: async (id: string): Promise<GetAccountRes> => {
    return secureRequest(
      '/account/get-account',
      { id },
      GetAccountReq,
      GetAccountRes
    );
  },

  create: async (input: AccountInput): Promise<CreateAccountRes> => {
    return secureRequest(
      '/account/create-account',
      {
        input,
      },
      CreateAccountReq,
      CreateAccountRes
    );
  },

  update: async (id: string, input: Partial<AccountInput>): Promise<UpdateAccountRes> => {
    return secureRequest(
      '/account/update-account',
      {
        id,
        input: input as AccountInput,
      },
      UpdateAccountReq,
      UpdateAccountRes
    );
  },

  delete: async (id: string, migrationTargets?: Record<string, string>): Promise<DeleteAccountRes> => {
    return secureRequest(
      '/account/delete-account',
      {
        id,
        migrationTargets: migrationTargets || {}
      },
      DeleteAccountReq,
      DeleteAccountRes
    );
  },

  getTransactionCount: async (id: string): Promise<GetAccountTransactionCountRes> => {
    return secureRequest(
      '/account/get-account-transaction-count',
      { id },
      GetAccountTransactionCountReq,
      GetAccountTransactionCountRes
    );
  },
};

