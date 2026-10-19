// Artillery Fixtures - Similar to Playwright fixtures but for Artillery
export async function createArtilleryFixtures(page, testInfo) {
  // Import all page classes dynamically
  const { LoginPage } = await import('../page/login/login.page.js');
  const { DMSidebar } = await import('../page/dashboard/sidebar.page.js');
  const { LeadListPage } = await import('../page/dashboard/leads/leadList.page.js');
  const { MarkInteractionLVM } = await import('../page/dashboard/patientList/mark_interaction_LVM.js');
  const { PatientEnrollmentPage } = await import('../page/dashboard/patientEnrollment/patientenrollment.page.js');
  const { SlotManagementPage } = await import('../page/dashboard/Slot_management/slot_management.page.js');
  const { PrescreenScheduledPage } = await import('../page/dashboard/patientList/prescreenscheduled.page.js');
  const { Dial_PadPage } = await import('../page/dashboard/patientList/Dial_pad.page.js');
  const { CreatePatient } = await import('../page/dashboard/create-patient.js');
  const { PatinetListSearchPage } = await import('../page/dashboard/patientList/Search-create.page.js');
  const { CreateNewPatientPoolPage } = await import('../page/dashboard/patientPool-builder/create-new.page.js');
  const { MassCommunicationPage } = await import('../page/dashboard/communication/mass-communication.page.js');

  // Create and return fixtures object
  return {
    leaderLoginPage: new LoginPage(page, testInfo),
    sidebar: new DMSidebar(page, testInfo),
    leadListPage: new LeadListPage(page, testInfo),
    markInteractionLVM: new MarkInteractionLVM(page, testInfo),
    patientEnrollmentPage: new PatientEnrollmentPage(page, testInfo),
    slotManagementPage: new SlotManagementPage(page, testInfo),
    prescreenScheduledPage: new PrescreenScheduledPage(page, testInfo),
    dialPadPage: new Dial_PadPage(page, testInfo),
    createPatient: new CreatePatient(page, testInfo),
    patinetListSearchPage: new PatinetListSearchPage(page, testInfo),
    createNewPatientPoolPage: new CreateNewPatientPoolPage(page, testInfo),
    massCommunicationPage: new MassCommunicationPage(page, testInfo),
  };
}

// Helper function to create specific fixture groups
export async function createLoginFixtures(page, testInfo) {
  const { LoginPage } = await import('../page/login/login.page.js');
  const { DMSidebar } = await import('../page/dashboard/sidebar.page.js');
  
  return {
    leaderLoginPage: new LoginPage(page, testInfo),
    sidebar: new DMSidebar(page, testInfo),
  };
}

export async function createPatientFixtures(page, testInfo) {
  const { CreatePatient } = await import('../page/dashboard/create-patient.js');
  const { PatinetListSearchPage } = await import('../page/dashboard/patientList/Search-create.page.js');
  const { MarkInteractionLVM } = await import('../page/dashboard/patientList/mark_interaction_LVM.js');
  
  return {
    createPatient: new CreatePatient(page, testInfo),
    patinetListSearchPage: new PatinetListSearchPage(page, testInfo),
    markInteractionLVM: new MarkInteractionLVM(page, testInfo),
  };
} 