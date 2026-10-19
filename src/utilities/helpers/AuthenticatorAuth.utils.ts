import * as OTPAuth from 'otpauth';
import { getEnvVariable } from './env.utils';

const GoogleSecret = getEnvVariable('AUTHENTICATOR');

export const totp = new OTPAuth.TOTP({
  issuer: 'Google',
  label: 'Google',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  secret: GoogleSecret,
});
