import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusPill } from '../components/common/StatusPill';

describe('StatusPill Component', () => {
  it('renders Pending status pill with yellow/amber styling and explicit text', () => {
    render(<StatusPill status="pending" label="Pending" />);
    const pill = screen.getByText('Pending');
    expect(pill).toBeInTheDocument();
    expect(pill.parentElement).toHaveClass('bg-[#FFFBEB]');
    expect(pill.parentElement).toHaveClass('text-[#D97706]');
  });

  it('renders Confirmed status pill with light green styling and explicit text', () => {
    render(<StatusPill status="confirmed" label="Confirmed" />);
    const pill = screen.getByText('Confirmed');
    expect(pill).toBeInTheDocument();
    expect(pill.parentElement).toHaveClass('bg-[#ECFDF5]');
    expect(pill.parentElement).toHaveClass('text-[#059669]');
  });

  it('renders Rejected status pill with red styling and explicit text', () => {
    render(<StatusPill status="rejected" label="Rejected" />);
    const pill = screen.getByText('Rejected');
    expect(pill).toBeInTheDocument();
    expect(pill.parentElement).toHaveClass('bg-[#FEF2F2]');
    expect(pill.parentElement).toHaveClass('text-[#DC2626]');
  });

  it('renders status dot when showDot is true', () => {
    render(<StatusPill status="online" label="Online" showDot />);
    expect(screen.getByTestId('status-pill-dot')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('renders away status with time duration', () => {
    render(<StatusPill status="away" label="22 min" showDot />);
    expect(screen.getByText('22 min')).toBeInTheDocument();
  });
});
