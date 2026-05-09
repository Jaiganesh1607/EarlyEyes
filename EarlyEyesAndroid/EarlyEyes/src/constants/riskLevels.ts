export type RiskLevel = 'urgent' | 'monitor' | 'ok';

export const riskLevelColors: Record<RiskLevel, string> = {
  urgent: '#E53935',
  monitor: '#FB8C00',
  ok: '#43A047',
};

export const riskLevelLabels: Record<RiskLevel, string> = {
  urgent: 'Urgent',
  monitor: 'Monitor',
  ok: 'OK',
};
