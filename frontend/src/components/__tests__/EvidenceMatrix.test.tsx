import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EvidenceMatrix } from '../EvidenceMatrix';
import { Paper, StudyExtraction } from '../../api/client';

const mockPapers: Paper[] = [
  {
    id: 'p1',
    doi: '10.123/1',
    title: 'Paper A',
    journal: 'Journal A',
    year: 2023,
    abstract_text: 'Abstract A',
    s3_pdf_url: null,
    provenance: 'PUBMED_CENTRAL',
    created_at: '2023-01-01',
  },
  {
    id: 'p2',
    doi: '10.123/2',
    title: 'Paper B',
    journal: 'Journal B',
    year: 2022,
    abstract_text: 'Abstract B',
    s3_pdf_url: null,
    provenance: 'PUBMED_CENTRAL',
    created_at: '2023-01-01',
  }
];

const mockExtractions: StudyExtraction[] = [
  {
    id: 'e1',
    paper_id: 'p1',
    research_query: 'test',
    sample_size: 100,
    model_system: 'Human',
    intervention: 'A',
    control: 'B',
    primary_metric: 'X',
    effect_direction: 'POSITIVE',
    effect_size: 20.5,
    p_value: 0.01,
    risk_of_bias: 'LOW',
    evidence_snippet: 'Evidence A',
    extracted_by_agent: 'Agent',
    created_at: '2023-01-01',
  },
  {
    id: 'e2',
    paper_id: 'p2',
    research_query: 'test',
    sample_size: 50,
    model_system: 'Mice',
    intervention: 'C',
    control: 'D',
    primary_metric: 'Y',
    effect_direction: 'NEGATIVE',
    effect_size: -10.0,
    p_value: 0.2,
    risk_of_bias: 'HIGH',
    evidence_snippet: 'Evidence B',
    extracted_by_agent: 'Agent',
    created_at: '2023-01-01',
  }
];

describe('EvidenceMatrix', () => {
  it('renders study rows from extraction data', () => {
    render(<EvidenceMatrix papers={mockPapers} extractions={mockExtractions} />);
    expect(screen.getByText('Paper A')).toBeInTheDocument();
    expect(screen.getByText('Paper B')).toBeInTheDocument();
  });

  it('filters correctly using direction filter buttons', () => {
    render(<EvidenceMatrix papers={mockPapers} extractions={mockExtractions} />);
    
    // Filter to POSITIVE
    fireEvent.click(screen.getByText('Pos (+)'));
    expect(screen.getByText('Paper A')).toBeInTheDocument();
    expect(screen.queryByText('Paper B')).not.toBeInTheDocument();
    
    // Filter to NEGATIVE
    fireEvent.click(screen.getByText('Neg (-)'));
    expect(screen.queryByText('Paper A')).not.toBeInTheDocument();
    expect(screen.getByText('Paper B')).toBeInTheDocument();
    
    // Filter back to ALL (first 'All' button is the direction filter)
    const allButtons = screen.getAllByText('All');
    fireEvent.click(allButtons[0]);
    expect(screen.getByText('Paper A')).toBeInTheDocument();
    expect(screen.getByText('Paper B')).toBeInTheDocument();
  });

  it('changes row order when sorting', () => {
    render(<EvidenceMatrix papers={mockPapers} extractions={mockExtractions} />);
    
    const rowsBefore = screen.getAllByRole('row');
    // Initially sorted by p_value asc, so Paper A (p=0.01) is before Paper B (p=0.2)
    expect(rowsBefore[1]).toHaveTextContent('Paper A');
    expect(rowsBefore[2]).toHaveTextContent('Paper B');

    // Click on p-value header to reverse sort
    const pValueHeader = screen.getByText(/p-value/i);
    fireEvent.click(pValueHeader);

    const rowsAfter = screen.getAllByRole('row');
    // Now Paper B should be before Paper A
    expect(rowsAfter[1]).toHaveTextContent('Paper B');
    expect(rowsAfter[2]).toHaveTextContent('Paper A');
  });

  it('shows empty state when no data matches', () => {
    render(<EvidenceMatrix papers={[]} extractions={[]} />);
    expect(screen.getByText('No extracted studies matched the active filter criteria.')).toBeInTheDocument();
  });
});
