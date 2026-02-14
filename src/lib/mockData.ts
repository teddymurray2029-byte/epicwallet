// Mock data displayed as placeholder when no real data exists

export const MOCK_REWARDS_SUMMARY = {
  totalEarned: 1_247.50,
  thisMonth: 382.00,
  thisWeek: 94.50,
  pendingRewards: 45.00,
  confirmedRewards: 1_202.50,
};

export const MOCK_REWARDS_BY_EVENT_TYPE = [
  { eventType: 'Encounter Note', amount: 540.00, count: 36 },
  { eventType: 'Discharge Summary', amount: 315.00, count: 21 },
  { eventType: 'Medication Reconciliation', amount: 168.00, count: 14 },
  { eventType: 'Problem List Update', amount: 96.00, count: 12 },
  { eventType: 'Preventive Care', amount: 72.50, count: 5 },
  { eventType: 'Coding Finalized', amount: 56.00, count: 7 },
];

export const MOCK_RECENT_ACTIVITY = [
  { id: 'mock-1', eventType: 'Encounter Note', amount: 13.50, status: 'confirmed', createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), eventHash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2' },
  { id: 'mock-2', eventType: 'Discharge Summary', amount: 20.25, status: 'confirmed', createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), eventHash: '0xf1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2' },
  { id: 'mock-3', eventType: 'Medication Reconciliation', amount: 10.80, status: 'pending', createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(), eventHash: '0xc1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2' },
  { id: 'mock-4', eventType: 'Problem List Update', amount: 8.10, status: 'confirmed', createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), eventHash: '0xd1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2' },
  { id: 'mock-5', eventType: 'Preventive Care', amount: 14.40, status: 'confirmed', createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(), eventHash: '0xe1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2' },
  { id: 'mock-6', eventType: 'Encounter Note', amount: 13.50, status: 'pending', createdAt: new Date(Date.now() - 1000 * 60 * 420).toISOString(), eventHash: '0xf2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3' },
  { id: 'mock-7', eventType: 'Coding Finalized', amount: 8.10, status: 'confirmed', createdAt: new Date(Date.now() - 1000 * 60 * 600).toISOString(), eventHash: '0xa3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4' },
  { id: 'mock-8', eventType: 'Intake Completed', amount: 5.40, status: 'confirmed', createdAt: new Date(Date.now() - 1000 * 60 * 900).toISOString(), eventHash: '0xb4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5' },
];

export const MOCK_TRANSACTION_HISTORY = [
  { id: 'mock-tx-1', amount: 13.50, status: 'confirmed', txHash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(), confirmedAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(), recipientType: 'provider' },
  { id: 'mock-tx-2', amount: 20.25, status: 'confirmed', txHash: '0xf1e2d3c4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2', createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), confirmedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(), recipientType: 'provider' },
  { id: 'mock-tx-3', amount: 10.80, status: 'pending', txHash: null, createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(), confirmedAt: null, recipientType: 'provider' },
  { id: 'mock-tx-4', amount: 8.10, status: 'confirmed', txHash: '0xd1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2', createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(), confirmedAt: new Date(Date.now() - 1000 * 60 * 175).toISOString(), recipientType: 'provider' },
  { id: 'mock-tx-5', amount: 14.40, status: 'confirmed', txHash: null, createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(), confirmedAt: new Date(Date.now() - 1000 * 60 * 295).toISOString(), recipientType: 'provider' },
  { id: 'mock-tx-6', amount: 13.50, status: 'pending', txHash: null, createdAt: new Date(Date.now() - 1000 * 60 * 420).toISOString(), confirmedAt: null, recipientType: 'provider' },
];

export const MOCK_REWARD_POLICIES = [
  { id: 'mock-rp-1', event_type: 'encounter_note', base_reward: 15, provider_split: 60, organization_split: 25, patient_split: 15, daily_limit_per_provider: 100, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'mock-rp-2', event_type: 'discharge_summary', base_reward: 15, provider_split: 60, organization_split: 25, patient_split: 15, daily_limit_per_provider: 100, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'mock-rp-3', event_type: 'medication_reconciliation', base_reward: 12, provider_split: 60, organization_split: 25, patient_split: 15, daily_limit_per_provider: 100, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'mock-rp-4', event_type: 'problem_list_update', base_reward: 8, provider_split: 60, organization_split: 25, patient_split: 15, daily_limit_per_provider: 100, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'mock-rp-5', event_type: 'preventive_care', base_reward: 10, provider_split: 60, organization_split: 25, patient_split: 15, daily_limit_per_provider: 100, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'mock-rp-6', event_type: 'coding_finalized', base_reward: 8, provider_split: 60, organization_split: 25, patient_split: 15, daily_limit_per_provider: 100, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];
