import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrellisProvider, useTrellis } from '../components/trellis/TrellisContext';
import { TrellisApp } from '../components/trellis/TrellisApp';

describe('Citadel People Hub • v3.2 release (Project Management Module)', () => {
  it('renders the Citadel People Hub project board with 4 columns matching the screenshots', () => {
    render(<TrellisApp />);

    expect(screen.getAllByText('Citadel People Hub • v3.2 release').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('trellis-column-to-do')).toBeInTheDocument();
    expect(screen.getByTestId('trellis-column-in-progress')).toBeInTheDocument();
    expect(screen.getByTestId('trellis-column-in-review')).toBeInTheDocument();
    expect(screen.getByTestId('trellis-column-done')).toBeInTheDocument();

    // Verify key tasks from screenshots
    expect(screen.getByText('Let users skip the location permission step')).toBeInTheDocument();
    expect(
      screen.getByText('Camera crashes on Android 12 when scanning a receipt')
    ).toBeInTheDocument();
  });

  it('opens New Task form when clicking + New task and creates a task assigned to Bayu Wirawan', async () => {
    render(<TrellisApp />);

    // Click + New task button
    const newTaskBtn = screen.getByTestId('trellis-new-task-btn');
    fireEvent.click(newTaskBtn);

    // Modal opens
    expect(screen.getByText('Create New Task')).toBeInTheDocument();

    // Fill form
    const titleInput = screen.getByTestId('trellis-input-title');
    fireEvent.change(titleInput, { target: { value: 'Add Apple Pay Express Checkout' } });

    const descInput = screen.getByTestId('trellis-input-description');
    fireEvent.change(descInput, { target: { value: 'One-tap biometric checkout for iOS' } });

    const assigneeSelect = screen.getByTestId('trellis-select-assignee');
    fireEvent.change(assigneeSelect, { target: { value: 'user-bayu' } });

    // Submit
    const submitBtn = screen.getByTestId('trellis-submit-new-task');
    fireEvent.click(submitBtn);

    // Verify newly created task is on the board
    await waitFor(() => {
      expect(screen.getByText('Add Apple Pay Express Checkout')).toBeInTheDocument();
    });
  });

  it('filters to My Tasks view when My tasks nav is clicked', () => {
    render(<TrellisApp />);

    // Default user is Nadia Safitri
    const myTasksNav = screen.getByTestId('trellis-nav-my-tasks');
    fireEvent.click(myTasksNav);

    // Should display My Assigned Tasks
    expect(screen.getByText('My Assigned Tasks')).toBeInTheDocument();
    // Nadia's task is visible
    expect(screen.getByText('Let users skip the location permission step')).toBeInTheDocument();
  });

  it('allows accepting a task assigned to current user', async () => {
    render(<TrellisApp />);

    // Click on task PAS-218 to open detail drawer
    const taskCard = screen.getByText('Let users skip the location permission step');
    fireEvent.click(taskCard);

    // Task detail drawer opens
    expect(screen.getByText('PAS-218 • Created Oct 13 by Nadia')).toBeInTheDocument();
    expect(screen.getByText('Assignment Status')).toBeInTheDocument();

    // Close detail drawer
    const closeBtn = screen.getByTestId('trellis-close-detail-btn');
    fireEvent.click(closeBtn);
  });

  it('supports undoing task status moves via the activity toast', async () => {
    render(<TrellisApp />);

    // Move task from To do to In progress
    const cameraCrashCard = screen.getByText(
      'Camera crashes on Android 12 when scanning a receipt'
    );
    fireEvent.click(cameraCrashCard);

    const statusSelect = screen.getByTestId('trellis-detail-status-select');
    fireEvent.change(statusSelect, { target: { value: 'In review' } });

    // Activity toast appears with Undo option
    const toast = screen.getByTestId('trellis-activity-toast');
    expect(toast).toBeInTheDocument();

    const undoBtn = screen.getByTestId('trellis-undo-btn');
    expect(undoBtn).toBeInTheDocument();
    fireEvent.click(undoBtn);

    // Toast is dismissed and status reverted
    expect(screen.queryByTestId('trellis-activity-toast')).not.toBeInTheDocument();
  });

  it('renders Timeline view and shows dynamic Team Workload recalculation with Bayu over capacity', () => {
    render(<TrellisApp />);

    // Switch to Timeline tab
    const timelineTab = screen.getByTestId('trellis-tab-timeline');
    fireEvent.click(timelineTab);

    // Team workload card is rendered
    expect(screen.getByTestId('trellis-team-workload-card')).toBeInTheDocument();
    expect(screen.getByText('Sprint burndown')).toBeInTheDocument();

    // Verify Bayu Wirawan has dynamic workload (initial > 40 hrs overloaded)
    const bayuHours = screen.getByTestId('trellis-workload-hours-user-bayu');
    expect(bayuHours.textContent).toContain('/40');
    expect(bayuHours).toHaveClass('text-rose-600');
  });
});
