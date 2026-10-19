import {
  PatientRequestBody,
  PatientResponseBody,
} from "../../interface/api/api.interface";
import { getAPIHeaders } from "../../utilities/api.utils";

export async function createPatient(
  patientData: PatientRequestBody
): Promise<number> {
  const headers = await getAPIHeaders("admin"); // Replace 'admin' with the appropriate user if needed
  const response = await fetch(
    "https://comtrak.qa.be.dmclinical.com/api/v1/Patient?GetType=add",
    {
      method: "POST",
      headers: headers,
      body: JSON.stringify([patientData]),
    }
  );
  await new Promise((resolve) => setTimeout(resolve, 5000));
  if (!response.ok) {
    throw new Error(`Error creating patient: ${response.statusText}`);
  }

  const data: PatientResponseBody = await response.json();
  console.log("Patient created successfully:", data.Id);
  return data.Id;
}
