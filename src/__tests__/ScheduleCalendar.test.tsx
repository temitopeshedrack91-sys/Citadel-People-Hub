import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScheduleCalendar } from '../components/common/ScheduleCalendar';

describe('ScheduleCalendar Component', () => {
  it('renders month navigator and highlights Wednesday 16 in dark green accent', () => {
    render(<ScheduleCalendar initialMonth="January 2026" selectedDay={16} />);

    expect(screen.getByTestId('schedule-month-label')).toHaveTextContent('January 2026');
    const day16Btn = screen.getByTestId('schedule-day-16');
    expect(day16Btn).toHaveClass('bg-[#083E34]');
    expect(day16Btn).toHaveClass('text-white');
  });

  it('triggers onSelectDay callback when a day is clicked', () => {
    const handleSelectDay = vi.fn();
    render(<ScheduleCalendar initialMonth="January 2026" selectedDay={16} onSelectDay={handleSelectDay} />);

    const day15Btn = screen.getByTestId('schedule-day-15');
    fireEvent.click(day15Btn);
    expect(handleSelectDay).toHaveBeenCalledWith(15);
  });

  it('filters events when category tabs are clicked', () => {
    render(<ScheduleCalendar />);

    expect(screen.getByText('Marketing Sync')).toBeInTheDocument();
    expect(screen.getByText('Product Review')).toBeInTheDocument();

    // Click Events tab
    const eventsTab = screen.getByTestId('schedule-tab-events');
    fireEvent.click(eventsTab);

    // GEC Leadership Session is an Event
    expect(screen.getByText('GEC Leadership Session')).toBeInTheDocument();
  });

  it('navigates months when previous and next buttons are clicked', () => {
    render(<ScheduleCalendar initialMonth="October 2026" />);

    expect(screen.getByTestId('schedule-month-label')).toHaveTextContent('October 2026');

    // Click Next month button
    const nextBtn = screen.getByLabelText('Next month');
    fireEvent.click(nextBtn);
    expect(screen.getByTestId('schedule-month-label')).toHaveTextContent('November 2026');

    // Click Previous month button twice
    const prevBtn = screen.getByLabelText('Previous month');
    fireEvent.click(prevBtn);
    expect(screen.getByTestId('schedule-month-label')).toHaveTextContent('October 2026');
    fireEvent.click(prevBtn);
    expect(screen.getByTestId('schedule-month-label')).toHaveTextContent('September 2026');
  });

  it('updates events list when selecting different days', () => {
    render(<ScheduleCalendar initialMonth="October 2026" />);

    // Default day 27 (Tuesday) has Marketing Sync
    expect(screen.getByText('Marketing Sync')).toBeInTheDocument();

    // Click Day 28 (Wednesday)
    const day28Btn = screen.getByTestId('schedule-day-28');
    fireEvent.click(day28Btn);

    // Now Day 28 events should appear
    expect(screen.getByText('Blessing Okafor Birthday Fellowship')).toBeInTheDocument();
    expect(screen.getByText('Q4 Budget Calibration')).toBeInTheDocument();
  });

  it('opens event details modal when clicking an event card', () => {
    render(<ScheduleCalendar />);

    const marketingSyncCard = screen.getByText('Marketing Sync');
    fireEvent.click(marketingSyncCard);

    // Modal opens with event details
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add to Outlook / Apple (.ics)')).toBeInTheDocument();
  });
});
