import { PatientRequestBody } from '../../interface/api/api.interface';

interface ApiCreatePatientData {
  patientData: PatientRequestBody;
}

const apiGetData: { [key: string]: ApiCreatePatientData } = {
  // Add API test data here
};

export function getApiCreatePatientData(key: string): ApiCreatePatientData {
  const data = apiGetData[key];
  if (!data) {
    throw new Error(`Test case data not found for: ${key}`);
  }
  return data;
}
