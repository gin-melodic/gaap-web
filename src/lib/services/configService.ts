import { secureRequest } from '../network/secure-client';
import {
  ListCurrenciesReq,
  ListCurrenciesRes,
  AddCurrencyReq,
  AddCurrencyRes,
  DeleteCurrencyReq,
  DeleteCurrencyRes,
  GetExchangeRatesReq,
  GetExchangeRatesRes,
  SetExchangeRateReq,
  SetExchangeRateRes,
} from '../proto/config/v1/config';

export const configService = {
  listCurrencies: async (): Promise<ListCurrenciesRes> =>
    secureRequest('/config/list-currencies', {}, ListCurrenciesReq, ListCurrenciesRes),

  addCurrency: async (code: string): Promise<AddCurrencyRes> =>
    secureRequest('/config/add-currency', { code }, AddCurrencyReq, AddCurrencyRes),

  deleteCurrency: async (code: string): Promise<DeleteCurrencyRes> =>
    secureRequest('/config/delete-currency', { code }, DeleteCurrencyReq, DeleteCurrencyRes),

  getExchangeRates: async (): Promise<GetExchangeRatesRes> =>
    secureRequest('/config/get-exchange-rates', {}, GetExchangeRatesReq, GetExchangeRatesRes),

  setExchangeRate: async (currency: string, rate: string): Promise<SetExchangeRateRes> =>
    secureRequest('/config/set-exchange-rate', { currency, rate }, SetExchangeRateReq, SetExchangeRateRes),
};
