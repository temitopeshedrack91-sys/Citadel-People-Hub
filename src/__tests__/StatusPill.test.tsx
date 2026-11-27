import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusPill } from '../components/common/StatusPill';

describe('StatusPill Component', () => {
  it('renders Pending status pill with gold styling and explicit text', () => {
    render(<StatusPill status="pending" label="Pending" />);
    const pill = screen.getByText('Pending');
    expect(pill).toBeInTheDocument();
    expect(pill.parentElement).toHaveClass('bg-[#FAF5EB]');
    expect(pill.parentElement).toHaveClass('text-[#B88A24]');
  });

  it('renders Confirmed status pill with royal blue styling and explicit text', () => {
    render(<StatusPill status="confirmed" label="Confirmed" />);
    const pill = screen.getByText('Confirmed');
    expect(pill).toBeInTheDocument();
    expect(pill.parentElement).toHaveClass('bg-[#EFF6FF]');
    expect(pill.parentElement).toHaveClass('text-[#174EA6]');
  });

  it('renders Rejected status pill with charcoal black styling and explicit text', () => {
    render(<StatusPill status="rejected" label="Rejected" />);
    const pill = screen.getByText('Rejected');
    expect(pill).toBeInTheDocument();
    expect(pill.parentElement).toHaveClass('bg-[#F5F7FA]');
    expect(pill.parentElement).toHaveClass('text-[#111827]');
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
