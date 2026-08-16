import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PrismaExportModal } from '../PrismaExportModal';

describe('PrismaExportModal', () => {
  const mockOnClose = vi.fn();

  it('does not render when closed', () => {
    const { container } = render(<PrismaExportModal isOpen={false} onClose={mockOnClose} researchQuery="test" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal when open', () => {
    render(<PrismaExportModal isOpen={true} onClose={mockOnClose} researchQuery="test" />);
    expect(screen.getByText('PRISMA 2020 Systematic Review & Citation Export')).toBeInTheDocument();
  });

  it('has export buttons for BibTeX, RIS, JSON, and Markdown', () => {
    render(<PrismaExportModal isOpen={true} onClose={mockOnClose} researchQuery="test" />);
    
    expect(screen.getByText('BibTeX (.bib)')).toBeInTheDocument();
    expect(screen.getByText('EndNote (.ris)')).toBeInTheDocument();
    expect(screen.getByText('JSON')).toBeInTheDocument();
    expect(screen.getByText('Download .md')).toBeInTheDocument();
  });

  it('closes on close button click', () => {
    render(<PrismaExportModal isOpen={true} onClose={mockOnClose} researchQuery="test" />);
    
    const closeButtons = screen.getAllByRole('button');
    // The X button is one of the buttons, let's find it.
    // It has a specific class or we can just click the first button
    fireEvent.click(closeButtons[0]);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
