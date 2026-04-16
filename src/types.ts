export type SafetyStatus = 'SAFE' | 'CAUTION' | 'UNSAFE';

export interface IngredientAnalysis {
  name: string;
  status: SafetyStatus;
  explanation: string;
  category?: string;
  healthHazards?: string[];
  benefits?: string[];
}

export interface ProductAnalysis {
  productName: string;
  brandName?: string;
  overallStatus: SafetyStatus;
  summary: string;
  ingredients: IngredientAnalysis[];
  regulatoryNotes?: string;
}

export interface BrandIntelligence {
  brandName: string;
  reputationStatus: SafetyStatus;
  summary: string;
  recallHistory: string[];
  manufacturingStandards: string;
}

export interface ChemicalInfo {
  name: string;
  formula?: string;
  commonUses: string[];
  hazards: string[];
  benefits?: string[];
  regulations: string;
  safetyVerdict: SafetyStatus;
}
