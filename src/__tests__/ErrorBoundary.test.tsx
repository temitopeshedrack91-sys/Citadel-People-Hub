import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

const BadComponent: React.FC = () => {
  throw new Error('Test rendering crash');
};

describe('ErrorBoundary Component', () => {
  it('catches render error and displays graceful fallback UI with Try Again button', () => {
    // Suppress console.error during this intentional error test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallbackTitle="Custom Module Error">
        <BadComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Module Error')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();

    spy.mockRestore();
  });
});
