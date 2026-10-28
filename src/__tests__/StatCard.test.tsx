import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Users, Clock, UserCheck } from 'lucide-react';
import { StatCard } from '../components/common/StatCard';

describe('StatCard Component', () => {
  it('renders title, key metric value and supporting trend text', () => {
    render(
      <StatCard
        title="Total employees"
        value={482}
        icon={Users}
        trend={{ value: '+20%', isPositive: true, label: 'This Month' }}
      />
    );

    expect(screen.getByText('Total employees')).toBeInTheDocument();
    expect(screen.getByText('482')).toBeInTheDocument();
    expect(screen.getByText('+20%')).toHaveClass('text-emerald-600');
    expect(screen.getByText('• This Month')).toBeInTheDocument();
  });

  it('renders negative trend with red styling', () => {
    render(
      <StatCard
        title="Attendance"
        value="94.2%"
        icon={Clock}
        trend={{ value: '-2%', isPositive: false, label: 'from yesterday' }}
      />
    );

    expect(screen.getByText('94.2%')).toBeInTheDocument();
    expect(screen.getByText('-2%')).toHaveClass('text-rose-500');
    expect(screen.getByText('• from yesterday')).toBeInTheDocument();
  });

  it('renders custom supportingText correctly (Active Staff Online & New Hires)', () => {
    render(
      <StatCard
        title="Active Staff"
        value={142}
        icon={UserCheck}
        supportingText={
          <span>8 Online • 2 New Hires</span>
        }
      />
    );

    expect(screen.getByText('142')).toBeInTheDocument();
    expect(screen.getByText('8 Online • 2 New Hires')).toBeInTheDocument();
  });

  it('triggers onClick handler when clicked', () => {
    const handleClick = vi.fn();
    render(
      <StatCard
        title="Total employees"
        value={482}
        icon={Users}
        onClick={handleClick}
      />
    );

    const card = screen.getByTestId('stat-card-total-employees');
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
