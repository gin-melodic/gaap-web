import { describe, expect, it } from 'vitest';
import { UserLevelType } from '../../base/base';
import { UpdateUserProfileReq, UserInput } from './user';

// DEF-029: the base-currency switch (Settings -> Currency Management) posts exactly what
// handleSetBaseCurrency builds through /v1/user/update-profile. These tests pin the wire
// payload so a regenerated proto or client-side mapping change cannot silently drop the
// mainCurrency field (the server only persists users.main_currency when it is present).

const encodeInput = (input: UserInput) => UserInput.encode(input).finish();
const decodeInput = (bytes: Uint8Array) => UserInput.decode(bytes);
const roundTripInput = (input: UserInput) => decodeInput(encodeInput(input));

describe('update-profile payload', () => {
  const buildInput = (input: Partial<UserInput>): UserInput => UserInput.fromPartial(input);
  const buildReq = (input: Partial<UserInput>) => UpdateUserProfileReq.fromPartial({ input });

  it('sends the base-currency switch payload exactly as the UI builds it', () => {
    // Mirrors CurrencySettings.handleSetBaseCurrency for demo_user switching to USD.
    const decoded = roundTripInput(buildInput({ nickname: 'demo_user', plan: UserLevelType.USER_LEVEL_TYPE_FREE, avatar: undefined, mainCurrency: 'USD' }));
    expect(decoded.nickname).toBe('demo_user');
    expect(decoded.mainCurrency).toBe('USD');
  });

  it('keeps the plan value across encode/decode without enum mangling', () => {
    for (const plan of [UserLevelType.USER_LEVEL_TYPE_FREE, UserLevelType.USER_LEVEL_TYPE_PRO]) {
      const decoded = roundTripInput(buildInput({ nickname: 'demo_user', plan }));
      expect(decoded.plan).toBe(plan);
    }
  });

  it('writes mainCurrency on the wire when set (field 4 tag present in encoded bytes)', () => {
    const bytes = encodeInput(buildInput({ nickname: 'demo_user', mainCurrency: 'EUR' }));
    // Field 4, wire type 2 (length-delimited) carries tag byte 0x22 (=34).
    expect(Array.from(bytes).includes(0x22)).toBe(true);
    expect(decodeInput(bytes).mainCurrency).toBe('EUR');
  });

  it('omits mainCurrency when not provided so a plain profile update does not touch the base currency', () => {
    const bytes = encodeInput(buildInput({ nickname: 'demo_user' }));
    // No field-4 tag in the encoded message.
    expect(Array.from(bytes).includes(0x22)).toBe(false);

    const decoded = decodeInput(bytes);
    expect(decoded.mainCurrency).toBeUndefined();
    expect(decoded.nickname).toBe('demo_user');
  });

  it('wraps the input intact inside UpdateUserProfileReq on the wire', () => {
    const req = buildReq({ nickname: 'demo_user', plan: UserLevelType.USER_LEVEL_TYPE_FREE, mainCurrency: 'USD' });
    const bytes = UpdateUserProfileReq.encode(req).finish();
    const decodedReq = UpdateUserProfileReq.decode(bytes);

    expect(decodedReq.input).toBeDefined();
    expect(decodedReq.input!.nickname).toBe('demo_user');
    expect(decodedReq.input!.mainCurrency).toBe('USD');
    expect(decodedReq.input!.plan).toBe(UserLevelType.USER_LEVEL_TYPE_FREE);
  });
});
