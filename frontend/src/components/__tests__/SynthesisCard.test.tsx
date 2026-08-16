import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SynthesisCard } from '../SynthesisCard';
import { Aggregate } from '../../api/client';

const mockAggregate: Aggregate = {
  research_query: 'test query',
  total_studies: 10,
  positive_count: 5,
  negative_count: 3,
  neutral_or_mixed_count: 2,
  avg_effect_size: 15.5,
  significant_count: 8,
  risk_of_bias_breakdown: { LOW: 6, MODERATE: 3, HIGH: 1 },
  open_contradictions: 1,
  resolved_contradictions: 2,
  confidence_tier: 'HIGH',
};

describe('SynthesisCard', () => {
  it('renders confidence tier badge with correct text', () => {
    render(<SynthesisCard aggregate={mockAggregate} narrative="Narrative text" />);
    expect(screen.getByText('HIGH CERTAINTY')).toBeInTheDocument();
  });

  it('renders all 6 metric cards', () => {
    render(<SynthesisCard aggregate={mockAggregate} narrative="Narrative text" />);
    expect(screen.getByText('Total Studies')).toBeInTheDocument();
    expect(screen.getByText('Consensus')).toBeInTheDocument();
    expect(screen.getByText('Mean Effect')).toBeInTheDocument();
    expect(screen.getByText('p ≤ 0.05 Sig.')).toBeInTheDocument();
    expect(screen.getByText('Contradictions')).toBeInTheDocument();
    expect(screen.getByText('Risk of Bias')).toBeInTheDocument();
  });

  it('shows narrative text', () => {
    render(<SynthesisCard aggregate={mockAggregate} narrative="Narrative text test" />);
    expect(screen.getByText('Narrative text test')).toBeInTheDocument();
  });

  it('opens and closes the rubric modal', () => {
    render(<SynthesisCard aggregate={mockAggregate} narrative="Narrative" />);
    
    // Open modal
    const helpButton = screen.getByTitle('Inspect deterministic confidence tier algorithm & thresholds');
    fireEvent.click(helpButton);
    expect(screen.getByText('Deterministic Confidence Rubric')).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByText('Close Rubric');
    fireEvent.click(closeButton);
    expect(screen.queryByText('Deterministic Confidence Rubric')).not.toBeInTheDocument();
  });
});
