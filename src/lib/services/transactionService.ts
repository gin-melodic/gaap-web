import { secureRequest } from '../network/secure-client';
import {
  ListTransactionsReq,
  ListTransactionsRes,
  GetTransactionReq,
  GetTransactionRes,
  CreateTransactionReq,
  CreateTransactionRes,
  UpdateTransactionReq,
  UpdateTransactionRes,
  DeleteTransactionReq,
  DeleteTransactionRes,
  TransactionInput,
} from '../proto/transaction/v1/transaction';


export const transactionService = {
  list: async (query?: ListTransactionsReq['query']): Promise<ListTransactionsRes> => {
    return secureRequest(
      '/transaction/list-transactions',
      { query },
      ListTransactionsReq,
      ListTransactionsRes
    );
  },

  get: async (id: string): Promise<GetTransactionRes> => {
    return secureRequest(
      '/transaction/get-transaction',
      { id },
      GetTransactionReq,
      GetTransactionRes
    );
  },

  create: async (input: TransactionInput): Promise<CreateTransactionRes> => {
    return secureRequest(
      '/transaction/create-transaction',
      {
        input,
      },
      CreateTransactionReq,
      CreateTransactionRes
    );
  },

  update: async (id: string, input: Partial<TransactionInput>): Promise<UpdateTransactionRes> => {
    return secureRequest(
      '/transaction/update-transaction',
      {
        id,
        input: input as TransactionInput, // Service handles partial updates, masking happens on backend usually, or we send partial object.
        // Clarification: UpdateTransactionReq expects 'input' as TransactionInput. 
        // If the backend supports partial updates with field masks or by ignoring fields, we can cast.
        // Assuming backend handles partial input effectively for update if fields are zero-valued/undefined.
      },
      UpdateTransactionReq,
      UpdateTransactionRes
    );
  },

  delete: async (id: string): Promise<DeleteTransactionRes> => {
    return secureRequest(
      '/transaction/delete-transaction',
      { id },
      DeleteTransactionReq,
      DeleteTransactionRes
    );
  },
};

