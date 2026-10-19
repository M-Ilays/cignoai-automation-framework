import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';

dotenv.config();

export function generateRandomId(length: number = 5): string {
  return faker.string.alpha({ length, casing: 'lower' });
}

export function generateRandomSentence(
  minWords: number = 5,
  maxWords: number = 15,
): string {
  const wordsCount = faker.number.int({ min: minWords, max: maxWords });
  return Array.from({ length: wordsCount }, () => faker.word.sample()).join(
    ' ',
  );
}

export function generateLongSentence(sentenceCount: number = 5): string {
  return Array.from({ length: sentenceCount }, () => {
    const wordsCount = faker.number.int({ min: 5, max: 15 });
    return Array.from({ length: wordsCount }, () => faker.word.sample()).join(
      ' ',
    );
  }).join(' ');
}

export function generateRandomSentenceWithTimestamp(
  minWords: number = 5,
  maxWords: number = 15,
): string {
  const wordsCount = faker.number.int({ min: minWords, max: maxWords });
  const randomSentence = Array.from({ length: wordsCount }, () =>
    faker.word.sample(),
  ).join(' ');
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, '')
    .slice(0, 14);
  return `${randomSentence} ${timestamp}`;
}

export function generateRandomHttpsUrl(): string {
  return faker.internet.url();
}

export function generateNodeString(node: string, maxLength?: number): string {
  const sessionPrefix = `${process.env.TEST_SESSION_ID} -`;
  const pagePrefix = node.substring(0, 4);
  let title = `${sessionPrefix} ${pagePrefix} ${generateRandomId()}`;
  return maxLength ? title.substring(0, maxLength) : title;
}

export function generateRandomEmail(
  usernameLength: number = 8,
  domainLength: number = 8,
): string {
  const username = faker.internet.userName().substring(0, usernameLength);
  const domain = faker.internet.domainWord().substring(0, domainLength);
  return `${username}@${domain}.${faker.internet.domainSuffix()}`;
}

export function generateRandomEmailWithSubDomain(
  subdomainLength: number = 6,
): string {
  const subdomain = faker.internet.domainWord().substring(0, subdomainLength);
  const emailWithoutSubdomain = generateRandomEmail();
  return emailWithoutSubdomain.replace('@', `@${subdomain}.`);
}

export function generateRandomEmailWithInternationalDomain(
  usernameLength: number = 8,
): string {
  const internationalDomains = [
    'co.jp',
    'com.cn',
    'fr',
    'de',
    'it',
    'co.uk',
    'com.au',
    'co.in',
    'es',
    'com.br',
  ];
  const randomDomain = faker.helpers.arrayElement(internationalDomains);
  const username = faker.internet.userName().substring(0, usernameLength);
  return `${username}@example.${randomDomain}`;
}
