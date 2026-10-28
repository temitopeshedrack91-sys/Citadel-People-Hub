import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressRing } from '../components/common/ProgressRing';

describe('ProgressRing / Leave Balance Gauge Component', () => {
  it('renders semicircular gauge with percentage and subtext ratio', () => {
    render(
      <ProgressRing
        value={65}
        max={100}
        label="65%"
        subtext="13 out of 20"
        type="semicircle"
        strokeColor="#083E34"
      />
    );

    expect(screen.getByTestId('progress-ring-semicircle')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('13 out of 20')).toBeInTheDocument();
  });

  it('renders SVG arcs with appropriate stroke color', () => {
    const { container } = render(
      <ProgressRing
        value={65}
        max={100}
        strokeColor="#083E34"
        type="semicircle"
      />
    );

    const paths = container.querySelectorAll('path');
    expect(paths.length).toBe(2);
    // Active path has stroke #083E34
    expect(paths[1].getAttribute('stroke')).toBe('#083E34');
  });

  it('supports circular ring mode', () => {
    render(
      <ProgressRing
        value={18}
        max={24}
        label="18d"
        subtext="Remaining"
        type="circle"
      />
    );

    expect(screen.getByTestId('progress-ring-circle')).toBeInTheDocument();
    expect(screen.getByText('18d')).toBeInTheDocument();
    expect(screen.getByText('Remaining')).toBeInTheDocument();
  });
});
