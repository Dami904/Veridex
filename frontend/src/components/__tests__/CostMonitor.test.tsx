import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CostMonitor } from '../CostMonitor';

describe('CostMonitor', () => {
  it('renders token count, latency, cost when usage data is provided', () => {
    const mockUsage = {
      totalTokens: 1500,
      estimatedCostUsd: 0.005,
      latencyMs: 120,
    };
    render(<CostMonitor usage={mockUsage} />);
    
    expect(screen.getByText('1500')).toBeInTheDocument();
    expect(screen.getByText('120ms')).toBeInTheDocument();
    expect(screen.getByText('$0.00500')).toBeInTheDocument();
  });

  it('shows No telemetry when no usage data is provided', () => {
    render(<CostMonitor />);
    expect(screen.getByText('No telemetry')).toBeInTheDocument();
  });
});
