export interface ClientSearchScenario {
  searchTerm: string;
  clientLabelToSelect: string;
}

export interface ClientSearchNegativeScenario {
  nonExistentClientName: string;
}
