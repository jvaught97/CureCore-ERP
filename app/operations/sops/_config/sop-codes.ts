/**
 * Configuration for structured SOP codes
 *
 * SOPs use a 3-part code structure: {DEPT_ABBREV}-{PROCESS_ABBREV}-{NUMBER}
 * Examples: QA-QC-001, MFG-PWD-001, ENG-EQP-003
 */

export interface Department {
  name: string;
  abbrev: string;
  label: string; // Display label: "{name} ({abbrev})"
}

export interface ProcessType {
  name: string;
  abbrev: string;
  label: string; // Display label: "{name} ({abbrev})"
  departmentAbbrev: string; // Which department this belongs to
}

/**
 * Available departments for SOPs
 * Includes all GMP/QMS standard departments for enterprise pharma operations
 */
export const DEPARTMENTS: Department[] = [
  {
    name: 'Manufacturing',
    abbrev: 'MFG',
    label: 'Manufacturing (MFG)'
  },
  {
    name: 'Quality Assurance',
    abbrev: 'QA',
    label: 'Quality Assurance (QA)'
  },
  {
    name: 'Engineering',
    abbrev: 'ENG',
    label: 'Engineering (ENG)'
  },
  {
    name: 'Training & Competency',
    abbrev: 'TRN',
    label: 'Training & Competency (TRN)'
  },
  {
    name: 'Supplier Management',
    abbrev: 'SUP',
    label: 'Supplier Management (SUP)'
  },
  {
    name: 'Facilities',
    abbrev: 'FAC',
    label: 'Facilities (FAC)'
  },
  {
    name: 'Safety',
    abbrev: 'SAF',
    label: 'Safety (SAF)'
  },
  {
    name: 'Regulatory Affairs',
    abbrev: 'REG',
    label: 'Regulatory Affairs (REG)'
  },
  {
    name: 'Research & Development',
    abbrev: 'RND',
    label: 'Research & Development (RND)'
  },
  {
    name: 'Information Technology',
    abbrev: 'IT',
    label: 'Information Technology (IT)'
  },
  {
    name: 'Human Resources',
    abbrev: 'HR',
    label: 'Human Resources (HR)'
  },
  {
    name: 'Finance',
    abbrev: 'FIN',
    label: 'Finance (FIN)'
  }
];

/**
 * Available process types for each department
 * Comprehensive GMP/QMS process types for enterprise pharma operations
 */
export const PROCESS_TYPES: ProcessType[] = [
  // Manufacturing (MFG)
  {
    name: 'Powder Manufacturing',
    abbrev: 'PWD',
    label: 'Powder Manufacturing (PWD)',
    departmentAbbrev: 'MFG'
  },
  {
    name: 'Cream/Emulsion Manufacturing',
    abbrev: 'CRM',
    label: 'Cream/Emulsion Manufacturing (CRM)',
    departmentAbbrev: 'MFG'
  },
  {
    name: 'Liquid Manufacturing',
    abbrev: 'LIQ',
    label: 'Liquid Manufacturing (LIQ)',
    departmentAbbrev: 'MFG'
  },
  {
    name: 'Packaging Operations',
    abbrev: 'PKG',
    label: 'Packaging Operations (PKG)',
    departmentAbbrev: 'MFG'
  },
  {
    name: 'Warehouse & Inventory',
    abbrev: 'WH',
    label: 'Warehouse & Inventory (WH)',
    departmentAbbrev: 'MFG'
  },

  // Quality Assurance (QA)
  {
    name: 'Quality Control Testing',
    abbrev: 'QC',
    label: 'Quality Control Testing (QC)',
    departmentAbbrev: 'QA'
  },
  {
    name: 'Document Control',
    abbrev: 'DOC',
    label: 'Document Control (DOC)',
    departmentAbbrev: 'QA'
  },
  {
    name: 'Sanitation & Hygiene',
    abbrev: 'SAN',
    label: 'Sanitation & Hygiene (SAN)',
    departmentAbbrev: 'QA'
  },
  {
    name: 'Release & Quarantine',
    abbrev: 'REL',
    label: 'Release & Quarantine (REL)',
    departmentAbbrev: 'QA'
  },
  {
    name: 'Internal/External Audits',
    abbrev: 'AUD',
    label: 'Internal/External Audits (AUD)',
    departmentAbbrev: 'QA'
  },

  // Engineering (ENG)
  {
    name: 'Equipment Operation',
    abbrev: 'EQP',
    label: 'Equipment Operation (EQP)',
    departmentAbbrev: 'ENG'
  },
  {
    name: 'Maintenance Procedures',
    abbrev: 'MTN',
    label: 'Maintenance Procedures (MTN)',
    departmentAbbrev: 'ENG'
  },
  {
    name: 'Validation Procedures',
    abbrev: 'VAL',
    label: 'Validation Procedures (VAL)',
    departmentAbbrev: 'ENG'
  },

  // Training & Competency (TRN)
  {
    name: 'SOP Training',
    abbrev: 'SOP',
    label: 'SOP Training (SOP)',
    departmentAbbrev: 'TRN'
  },
  {
    name: 'GMP Training',
    abbrev: 'GMP',
    label: 'GMP Training (GMP)',
    departmentAbbrev: 'TRN'
  },
  {
    name: 'Safety Training',
    abbrev: 'SAF',
    label: 'Safety Training (SAF)',
    departmentAbbrev: 'TRN'
  },

  // Supplier Management (SUP)
  {
    name: 'Supplier Qualification',
    abbrev: 'QUAL',
    label: 'Supplier Qualification (QUAL)',
    departmentAbbrev: 'SUP'
  },
  {
    name: 'Purchasing Controls',
    abbrev: 'PUR',
    label: 'Purchasing Controls (PUR)',
    departmentAbbrev: 'SUP'
  },

  // Facilities (FAC)
  {
    name: 'Environmental Monitoring',
    abbrev: 'ENV',
    label: 'Environmental Monitoring (ENV)',
    departmentAbbrev: 'FAC'
  },
  {
    name: 'Facility Cleaning',
    abbrev: 'CLN',
    label: 'Facility Cleaning (CLN)',
    departmentAbbrev: 'FAC'
  },

  // Safety (SAF)
  {
    name: 'Emergency Response',
    abbrev: 'EMR',
    label: 'Emergency Response (EMR)',
    departmentAbbrev: 'SAF'
  },
  {
    name: 'Hazard Communication',
    abbrev: 'HAZ',
    label: 'Hazard Communication (HAZ)',
    departmentAbbrev: 'SAF'
  },

  // Regulatory Affairs (REG)
  {
    name: 'Regulatory Submissions',
    abbrev: 'SUB',
    label: 'Regulatory Submissions (SUB)',
    departmentAbbrev: 'REG'
  },
  {
    name: 'Labeling Compliance',
    abbrev: 'LBL',
    label: 'Labeling Compliance (LBL)',
    departmentAbbrev: 'REG'
  },
  {
    name: 'Regulatory Audits',
    abbrev: 'RAU',
    label: 'Regulatory Audits (RAU)',
    departmentAbbrev: 'REG'
  },

  // Research & Development (RND)
  {
    name: 'Formulation Development',
    abbrev: 'FRM',
    label: 'Formulation Development (FRM)',
    departmentAbbrev: 'RND'
  },
  {
    name: 'Stability Testing',
    abbrev: 'STB',
    label: 'Stability Testing (STB)',
    departmentAbbrev: 'RND'
  },
  {
    name: 'Pilot Batch Trials',
    abbrev: 'PIL',
    label: 'Pilot Batch Trials (PIL)',
    departmentAbbrev: 'RND'
  },

  // Information Technology (IT)
  {
    name: 'System Administration',
    abbrev: 'SYS',
    label: 'System Administration (SYS)',
    departmentAbbrev: 'IT'
  },
  {
    name: 'Software Validation',
    abbrev: 'SVAL',
    label: 'Software Validation (SVAL)',
    departmentAbbrev: 'IT'
  },
  {
    name: 'Data Integrity',
    abbrev: 'DI',
    label: 'Data Integrity (DI)',
    departmentAbbrev: 'IT'
  },

  // Human Resources (HR)
  {
    name: 'Competency Records',
    abbrev: 'COMP',
    label: 'Competency Records (COMP)',
    departmentAbbrev: 'HR'
  },
  {
    name: 'Training Documentation',
    abbrev: 'TRD',
    label: 'Training Documentation (TRD)',
    departmentAbbrev: 'HR'
  },
  {
    name: 'Hiring & Onboarding',
    abbrev: 'HOB',
    label: 'Hiring & Onboarding (HOB)',
    departmentAbbrev: 'HR'
  },

  // Finance (FIN)
  {
    name: 'Cost Control Procedures',
    abbrev: 'COST',
    label: 'Cost Control Procedures (COST)',
    departmentAbbrev: 'FIN'
  },
  {
    name: 'Budgeting Processes',
    abbrev: 'BUD',
    label: 'Budgeting Processes (BUD)',
    departmentAbbrev: 'FIN'
  },
  {
    name: 'Financial Reporting Controls',
    abbrev: 'FINR',
    label: 'Financial Reporting Controls (FINR)',
    departmentAbbrev: 'FIN'
  }
];

/**
 * Helper function to get process types for a specific department
 */
export function getProcessTypesForDepartment(departmentAbbrev: string): ProcessType[] {
  return PROCESS_TYPES.filter(pt => pt.departmentAbbrev === departmentAbbrev);
}

/**
 * Helper function to build SOP code from components
 */
export function buildSOPCode(
  departmentAbbrev: string,
  processTypeAbbrev: string,
  sequenceNumber: string
): string {
  // Pad sequence number to 3 digits
  const paddedNumber = sequenceNumber.padStart(3, '0');
  return `${departmentAbbrev}-${processTypeAbbrev}-${paddedNumber}`;
}

/**
 * Helper function to parse SOP code into components
 * Returns null if code doesn't match expected format
 */
export function parseSOPCode(code: string): {
  departmentAbbrev: string;
  processTypeAbbrev: string;
  sequenceNumber: string;
} | null {
  const parts = code.split('-');
  if (parts.length !== 3) {
    return null;
  }
  return {
    departmentAbbrev: parts[0],
    processTypeAbbrev: parts[1],
    sequenceNumber: parts[2]
  };
}

/**
 * Helper function to find department by abbreviation
 */
export function findDepartmentByAbbrev(abbrev: string): Department | undefined {
  return DEPARTMENTS.find(d => d.abbrev === abbrev);
}

/**
 * Helper function to find process type by abbreviation and department
 */
export function findProcessType(
  processTypeAbbrev: string,
  departmentAbbrev: string
): ProcessType | undefined {
  return PROCESS_TYPES.find(
    pt => pt.abbrev === processTypeAbbrev && pt.departmentAbbrev === departmentAbbrev
  );
}
