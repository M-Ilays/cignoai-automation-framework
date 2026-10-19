import { getAPIHeaders } from "../../utilities/api.utils";

export async function getPatientRecord(RecordId:number): Promise<number[]> {
    const headers = await getAPIHeaders("admin"); // Replace 'admin' with the appropriate user if needed
    const response = await fetch(
        "https://comtrak.qa.be.dmclinical.com/api/v1/RecruiterCallList?getType=GetAll&startDate=null&endDate=null&siteID=-1&studyID=-1&statusID=-1&pageno=0&pagesize=0&searchString=",
        {
            method: "GET",
            headers: headers,
        }
    );

    if (!response.ok) {
        throw new Error(`Error fetching recruiter list: ${response.statusText}`);
    }

    const data = await response.json();
    const ids = data
        .filter((item: any) => item.Id == RecordId && item.Id !== undefined)
       

    console.log("Recruiter IDs: ", ids );
    return ids[0];
}