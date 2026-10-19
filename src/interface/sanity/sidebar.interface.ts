export interface DMLeftNav {
    pageName: string;
    tabName: string;
    subTabName?: string;
}
export interface DMRandomData {
    FirstName?: string;
    lastName?: string;
    Email?: string;
    Phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    dateOfBirth?: string;
    gender?: string;
    race?: string;
    CrioId?: string;
    comtrakId?: string;
    patientPoolName?: string;
    recruiterName?: string;
    numberOfPatients?: string;
    study?: string;
    status?: string;
    subStatus?: string;
    notes?: string;
    site?: string;
    title?: string;
    updatedtitle?: string;
    campaign?: string;
    referalSource?: string;
    type_of_communication?: TypeOfCommunication;
    department?: string;
    sender_PhoneNumber?: sendPhoneNumber;
    hashtags?: string;
    communicationFrequency?: TypeOfCommunicationFrequency;
    responseType?: string;
    type_of_schedule?: TypeOfSchedule;
    language?: string;
    script?: string;
    triggerType?: string;
    repeatFrequency?: string;
    repeatUntil?: string;
    studyVisitType?: string;
    interval?: string;
    compareSMS?: string;
    filePath?: string;
    commDirectionType?: string;
    commDate?: string;
    Id?: number;
    subScript?:string;
    subScriptTitle?:string;
    responseOption?:string;
    responseConfirmationStatus?:string;
    goToScriptOption?:string;

}

  
export enum sendPhoneNumber{
    chicago = '+12133156377 - Chicago',
    houston = '+13617333627 - Houston'
}
export enum TypeOfCommunication {
    SMS = 'SMS',
    Email = 'Email',
  }
export enum TypeOfCommunicationFrequency {
    OneTime = 'One-time',
    Recurring = 'Recurring',
}
export enum TypeOfSchedule {
now= 'Now',
Schedule= 'Schedule',


}
export enum siteName{
    chicago = 'Chicago',
    bellaire = 'Bellaire',
}


