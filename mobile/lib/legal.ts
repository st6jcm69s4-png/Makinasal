/** Hukuki metinlerdeki işletmeci bilgisi (.env: EXPO_PUBLIC_LEGAL_OPERATOR_NAME / _ADDRESS, EXPO_PUBLIC_LEGAL_CONTACT_EMAIL). */
export const legalIdentity = {
  name: process.env.EXPO_PUBLIC_LEGAL_OPERATOR_NAME ?? '',
  address: process.env.EXPO_PUBLIC_LEGAL_OPERATOR_ADDRESS ?? '',
  email: process.env.EXPO_PUBLIC_LEGAL_CONTACT_EMAIL ?? '',
};
