import type { LaborTradeDefinition, TabKey } from '../types';

export const BUILT_IN_FIREBASE_CONFIG = {
  apiKey: ['AIzaSyC_9cE', '4jY5lX_6pN', 'c904338184145855832'].join(''),
  authDomain: 'associate-engineers.firebaseapp.com',
  projectId: 'associate-engineers',
  storageBucket: 'associate-engineers.firebasestorage.app',
  messagingSenderId: '904338184145',
  appId: '1:904338184145:web:6c2a24628d186f5f9e0a6e',
};

export const STORAGE_KEYS = {
  SITES: 'AE_SITES_LIST_V2',
  SESSION: 'AE_ACTIVE_USER_SESSION_V2',
  THEME: 'AE_THEME_MODE',
  LOGS_PREFIX: 'AE_LOGS_',
  DRAFT_PREFIX: 'AE_DAILY_LOG_DRAFT_',
  MACHINERY_PREFIX: 'AE_MACHINERY_',
  MILESTONES_PREFIX: 'AE_MILESTONES_',
  MATERIALS_PREFIX: 'AE_MATERIALS_',
} as const;

export const DEFAULT_TRADES: LaborTradeDefinition[] = [
  { id: 'electrician', label: 'Electricians' },
  { id: 'plumber', label: 'Plumbers' },
  { id: 'mason', label: 'Masons (Raj / Mistri)' },
  { id: 'labour', label: 'General Labour / Helpers' },
  { id: 'carpenter', label: 'Carpenters (Shuttering)' },
  { id: 'steelfixer', label: 'Steel Fixers (Sariya)' },
  { id: 'painter', label: 'Painters' },
  { id: 'welder', label: 'Welders / Fabricators' },
];

export const WEATHER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Sunny / Clear', label: 'Clear / Sunny' },
  { value: 'Hot / Extreme Heat', label: 'Hot / Extreme Heat' },
  { value: 'Cloudy', label: 'Cloudy' },
  { value: 'Light Rain / Drizzling', label: 'Light Rain / Drizzling' },
  { value: 'Heavy Rain / Storm', label: 'Heavy Rain / Storm' },
];

export const EQUIPMENT_SUGGESTIONS: string[] = [
  'Concrete Mixer (Batching)',
  'Excavator (JCB / CAT)',
  'Tower Crane',
  'Transit Mixer Truck',
  'Concrete Pump',
  'Dump Truck / Tipper',
  'Generator (KV Set)',
  'Steel Bar Cutter / Bender',
  'Forklift',
  'De-watering Pump',
];

export const MILESTONE_SUGGESTIONS: string[] = [
  'Site Clearing & Excavation',
  'Foundation & Footings Concrete',
  'Ground Floor Slab & Plinth Beam',
  '1st Floor Structure & Columns',
  '2nd Floor Slab & Roof Deck',
  'Brickwork & Masonry Partitions',
  'Electrical & Plumbing Rough-in',
  'Internal & External Plastering',
  'Tiles, Marble & Flooring',
  'Paint, Fixtures & Handover',
];

export const SITE_STORAGE_CATEGORIES: string[] = [
  'Civil & Structural',
  'Steel & Rebar',
  'Finishing & Tiles',
  'MEP & Electrical',
  'Plumbing & Sanitary',
  'Safety & PPE',
  'General Tools',
];

export interface QuickMaterialPreset {
  label: string;
  name: string;
  category: string;
  unit: string;
}

export const QUICK_MATERIAL_PRESETS: QuickMaterialPreset[] = [
  {
    label: 'Deformed Steel 60-Grade',
    name: 'Deformed Steel 60-Grade',
    category: 'Steel & Rebar',
    unit: 'Tons',
  },
  {
    label: 'Crush / Aggregate (1/2" Margalla)',
    name: 'Crush / Aggregate (1/2" Margalla)',
    category: 'Civil & Structural',
    unit: 'Cft',
  },
  {
    label: 'Cement (OPC - 50kg Bags)',
    name: 'Cement (OPC - 50kg Bags)',
    category: 'Civil & Structural',
    unit: 'Bags',
  },
  {
    label: 'Steel Rebar Grade 60 (1/2")',
    name: 'Steel Rebar Grade 60 (1/2")',
    category: 'Steel & Rebar',
    unit: 'Tons',
  },
];

export const MATERIAL_NAME_SUGGESTIONS: string[] = [
  'Deformed Steel 60-Grade',
  'Crush / Aggregate (1/2" Margalla)',
  'Cement (OPC - 50kg Bags)',
  'Steel Rebar Grade 60 (1/2")',
  'Red Bricks (Standard First Class)',
  'River Sand (Chenab / Lawrencepur)',
  'Porex / Water Proofing Chemical',
  'Binding Wire (20-Gauge)',
];

export const UNIT_SUGGESTIONS: string[] = [
  'Bags',
  'Tons',
  'Cft',
  'Nos',
  'Kg',
  'Liters',
  'Sq.ft',
  'Rft',
  'Meters',
  'Trucks / Dumpers',
];

export const SUPPLIER_SUGGESTIONS: string[] = [
  'Bestway Cement',
  'Lucky Cement',
  'Maple Leaf Cement',
  'DG Khan Cement',
  'Amreli Steels',
  'Mughal Steel',
  'Agha Steel',
  'Margalla Crush Quarry',
  'Chenab Sand Supplier',
  'Local Hardware & Sanitary Store',
];

export const PAGE_META: Record<
  TabKey,
  { crumb: string; title: string; subtitle: string }
> = {
  entry: {
    crumb: 'DAILY SITE LOG',
    title: 'Daily Site Log',
    subtitle: 'Capture the work completed, resources deployed, and what comes next.',
  },
  history: {
    crumb: 'LOG ARCHIVE',
    title: 'Log Archive',
    subtitle: 'Find, review, and manage previously submitted site reports.',
  },
  machinery: {
    crumb: 'PLANT & MACHINERY',
    title: 'Plant & Machinery',
    subtitle: 'Track equipment usage, operating hours, and fuel records.',
  },
  milestones: {
    crumb: 'PROJECT MILESTONES',
    title: 'Project Milestones',
    subtitle: 'Monitor planned activities and overall project completion.',
  },
  analytics: {
    crumb: 'INSIGHTS & ANALYTICS',
    title: 'Insights & Analytics',
    subtitle: 'Turn daily field activity into a clear project performance picture.',
  },
  materials: {
    crumb: 'SITE STORE & MATERIALS',
    title: 'Site Store & Materials',
    subtitle: 'Manage site inventory, inward received, site usage, and stock balance.',
  },
};

export const PAGE_SIZES = {
  HISTORY: 12,
  MATERIALS: 12,
  BALANCE_SHEET: 20,
  MACHINERY: 12,
  MILESTONES: 12,
} as const;
