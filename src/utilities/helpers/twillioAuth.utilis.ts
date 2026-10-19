import pkg from 'twilio';
const { Twilio } = pkg;
import { getEnvVariable } from './env.utils';

const accountSid = getEnvVariable('TWILIO_ACCOUNT_SID');
const authToken = getEnvVariable('TWILIO_AUTH_TOKEN');

export const client = new Twilio(accountSid, authToken);
