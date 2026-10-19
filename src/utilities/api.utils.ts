import { getLocalStorageValue } from './helpers/cookies.utils';

export async function getAPIHeaders(user: string): Promise<Record<string, string>> {
  const authToken = await getLocalStorageValue(user);
  const baseUrl = process.env.BASE_URL || '';

  return {
    Accept: '*/*',
    Authorization: `Bearer ${authToken}`,
    'Content-Type': 'application/json',
    Connection: 'keep-alive',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    Origin: baseUrl,
    Referer: `${baseUrl}/`,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
  };
}
