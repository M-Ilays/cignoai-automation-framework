import { faker } from '@faker-js/faker';
import { addDays, format } from 'date-fns';

/** Static test data helpers (no Playwright page dependency). */
export class GeneralUtils {
  public static generatePersonFirstName(): string {
    return faker.person.firstName();
  }

  public static generatePersonLastName(): string {
    return faker.person.lastName();
  }

  public static GenerateNumber(): number {
    return faker.number.int({ min: 10000, max: 99999 });
  }

  public static generateSubject(): string {
    return faker.commerce.productName();
  }

  public static getCurrentDate(formatStr: string = 'MM/dd/yyyy', dateInput: string = 'today'): string {
    let offsetDays = 0;

    const match = dateInput.match(/today([+-]\d+)?/i);

    if (match) {
      offsetDays = match[1] ? parseInt(match[1], 10) : 0;
    } else if (dateInput.toLowerCase() === 'yesterday') {
      offsetDays = -1;
    } else if (dateInput.toLowerCase() === 'tomorrow') {
      offsetDays = 1;
    } else {
      throw new Error(`Received date value "${dateInput}" is not recognized`);
    }

    const date = addDays(new Date(), offsetDays);

    return format(date, formatStr);
  }

  public static generateReferenceId(): string {
    return faker.string.uuid();
  }

  public static generateControlNumber(): string {
    return faker.string.uuid();
  }

  public static generateRiskAssessment(): string {
    return faker.lorem.word();
  }

  public static generateAdditionalNotes(): string {
    return faker.lorem.word();
  }

  public static generateEmail(): string {
    return faker.internet.exampleEmail();
  }

  public static generateAddress(): string {
    return faker.location.streetAddress();
  }

  public static generatePhoneNumber(): string {
    const real = faker.phone.number({ style: 'international' });
    return real.replace('+1', '');
  }

  public static generateCompanyName(): string {
    return faker.company.name();
  }

  public static generateDate(): Date {
    return faker.date.past();
  }

  public static generateSentence(): string {
    return faker.lorem.sentence();
  }

  public static generateParagraph(): string {
    return faker.lorem.paragraph();
  }

  public static generateProductName(): string {
    return faker.commerce.productName();
  }

  public static generatePrice(): string {
    return faker.commerce.price();
  }

  public static generateBoolean(): boolean {
    return faker.datatype.boolean();
  }

  public static generateWord(): string {
    return faker.lorem.word();
  }

  public static generateColor(): string {
    return faker.color.human();
  }

  public static generateFormattedDate(): string {
    const randomDate = faker.date.past();
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(randomDate);
  }
}
