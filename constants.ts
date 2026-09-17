import { Incident, Officer, Assignment, Report } from './types';

export const INITIAL_OFFICERS: Officer[] = [
  { id: '1', name: 'Assistant Commissioner Derese G.', badgeNumber: 'WG-000', rank: 'assistantCommissioner', email: 'derese.g@wgpolice.gov.et', station: 'ፍኖተ ሰላም ከተማ', phone: '0911000000', status: 'Active' },
  { id: '2', name: 'Commander Abebe Bikila', badgeNumber: 'WG-001', rank: 'commander', email: 'abebe.b@wgpolice.gov.et', station: 'ፍኖተ ሰላም ከተማ', phone: '0911223344', status: 'Active' },
  { id: '3', name: 'Deputy Commander Mulugeta Tesfaye', badgeNumber: 'WG-002', rank: 'deputyCommander', email: 'mulugeta.t@wgpolice.gov.et', station: 'ቡሬ ከተማ', phone: '0922334455', status: 'Active' },
  { id: '4', name: 'Chief Inspector Tadesse Gebre', badgeNumber: 'WG-003', rank: 'chiefInspector', email: 'tadesse.g@wgpolice.gov.et', station: 'ደምበጫ ከተማ', phone: '0933445566', status: 'Active' },
  { id: '5', name: 'Inspector Kebede Ayalew', badgeNumber: 'WG-004', rank: 'inspector', email: 'kebede.a@wgpolice.gov.et', station: 'ፍኖተ ሰላም ከተማ', phone: '0944556677', status: 'Active' },
  { id: '10', name: 'Chief Sergeant Mengesha Yimam', badgeNumber: 'WG-009', rank: 'chiefSergeant', email: 'mengesha.y@wgpolice.gov.et', station: 'ደምበጫ ከተማ', phone: '0966778899', status: 'Active' },
  { id: '13', name: 'Constable Solomon Tekle', badgeNumber: 'WG-012', rank: 'constable', email: 'solomon.t@wgpolice.gov.et', station: 'ደምበጫ ከተማ', phone: '0999001122', status: 'Active' },
];

export const INITIAL_INCIDENTS: Incident[] = [
  { id: '1', title: 'Traffic Accident - Finote Selam', status: 'Open', date: '2024-05-15', location: 'Main Highway', lat: 10.70, lng: 37.26, officerId: '2', filingStation: 'ፍኖተ ሰላም ከተማ', recordingOfficerName: 'Abebe Bikila', recordingOfficerRank: 'commander', type: 'Traffic', category: 'vehicleCollision' },
  { id: '2', title: 'Theft Report - Market Area', status: 'In Progress', date: '2024-05-18', location: 'Central Market', lat: 10.70, lng: 37.06, officerId: '5', filingStation: 'ቡሬ ከተማ', recordingOfficerName: 'Kebede Ayalew', recordingOfficerRank: 'inspector', type: 'Crime', category: 'burglary' },
];

export const INITIAL_ASSIGNMENTS: Assignment[] = [
  { id: '1', title: 'Interview Witnesses', description: 'Interview all witnesses at the scene.', status: 'Completed', dueDate: '2024-05-16', incidentId: '1', officerId: '1' },
];

export const INITIAL_REPORTS: Report[] = [
  { id: '1', title: 'Monthly Crime Statistics', status: 'Submitted', date: '2024-05-01', location: 'Zone HQ', officerId: '2', filingStation: 'Zone Headquarters', recordingOfficerName: 'Abebe Bikila', recordingOfficerRank: 'commander', type: 'Crime', category: 'other' },
];

export const EMERGENCY_CONTACTS = [
  { id: '1', nameKey: 'westGojjamZone', phone: '0587750972' },
  { id: '2', nameKey: 'trafficPoliceChief', phone: '0587751002' },
  { id: '4', nameKey: 'finoteSelamCity', phone: '0587751097' },
  { id: '5', nameKey: 'bureCity', phone: '0587741004' },
  { id: '7', nameKey: 'dembachaCity', phone: '0587730256' },
];

// ተስተካክሏል፡ ምስሉን በቀጥታ ከጌትሃብ ሰርቨር እንዲያመጣ ተደርጓል
export const APP_LOGO = "https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6";
