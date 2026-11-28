import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrellisProvider, useTrellis } from '../components/trellis/TrellisContext';
import { TrellisApp } from '../components/trellis/TrellisApp';

// This suite covers the local fixture workflow. Laravel API integration and
// failure behavior are exercised separately by adapter/API tests.
vi.mock('../services/laravelClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/laravelClient')>();
  return { ...actual, isLaravelApiConfigured: () => false };
});

describe('Citadel People Hub (Project Management Module)', () => {
  it('renders the Citadel People Hub project board with 4 columns matching the screenshots', () => {
    render(<TrellisApp />);

    expect(screen.getAllByText('Citadel People Hub').length).toBeGreaterThanOrEqual(1);
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
    expect(bayuHours).toHaveClass('text-[#111827]');
  });

  it('allows editing a task from the detail drawer and updating the board', async () => {
    render(<TrellisApp />);

    // Open detail drawer for task
    const taskCard = screen.getByText('Let users skip the location permission step');
    fireEvent.click(taskCard);

    // Click edit button in drawer header
    const editBtn = screen.getByTestId('trellis-toggle-edit-btn');
    fireEvent.click(editBtn);

    // Verify edit form fields are populated
    const titleInput = screen.getByTestId('trellis-edit-title');
    expect(titleInput).toHaveValue('Let users skip the location permission step');

    // Change title and status
    fireEvent.change(titleInput, {
      target: { value: 'Let users skip the location permission step (V2)' },
    });
    const statusSelect = screen.getByTestId('trellis-edit-status');
    fireEvent.change(statusSelect, { target: { value: 'In review' } });

    // Save changes
    const saveBtn = screen.getByTestId('trellis-save-edit-btn');
    fireEvent.click(saveBtn);

    // Verify updated title is rendered on the board under In review
    await waitFor(() => {
      expect(
        screen.getAllByText('Let users skip the location permission step (V2)').length
      ).toBeGreaterThanOrEqual(1);
    });

    const inReviewCol = screen.getByTestId('trellis-column-in-review');
    expect(inReviewCol).toHaveTextContent('Let users skip the location permission step (V2)');
  });

  it('allows deleting a task from the board card and restoring it via undo toast', async () => {
    render(<TrellisApp />);

    // Verify task initially present
    expect(
      screen.getByText('Camera crashes on Android 12 when scanning a receipt')
    ).toBeInTheDocument();

    // Click quick delete button on card
    const deleteBtn = screen.getByTestId('trellis-card-delete-PAS-219');
    fireEvent.click(deleteBtn);

    // Task is removed from board
    expect(
      screen.queryByText('Camera crashes on Android 12 when scanning a receipt')
    ).not.toBeInTheDocument();

    // Toast notification appears with undo button
    const toast = screen.getByTestId('trellis-activity-toast');
    expect(toast).toBeInTheDocument();
    expect(toast).toHaveTextContent('Deleted task');

    // Click Undo
    const undoBtn = screen.getByTestId('trellis-undo-btn');
    fireEvent.click(undoBtn);

    // Task is restored on the board
    await waitFor(() => {
      expect(
        screen.getByText('Camera crashes on Android 12 when scanning a receipt')
      ).toBeInTheDocument();
    });
  });

  it('allows deleting a task from the detail drawer via confirmation modal', async () => {
    render(<TrellisApp />);

    // Open detail drawer
    const taskCard = screen.getByText('Empty states for the Orders tab');
    fireEvent.click(taskCard);

    // Click delete button in drawer header
    const deleteBtn = screen.getByTestId('trellis-delete-task-btn');
    fireEvent.click(deleteBtn);

    // Confirmation modal opens
    const confirmModal = screen.getByTestId('trellis-delete-confirm-modal');
    expect(confirmModal).toBeInTheDocument();
    expect(confirmModal).toHaveTextContent('Delete Task');

    // Confirm deletion
    const confirmDeleteBtn = screen.getByTestId('trellis-confirm-delete-btn');
    fireEvent.click(confirmDeleteBtn);

    // Task is removed and drawer closed
    await waitFor(() => {
      expect(
        screen.queryByText('Empty states for the Orders tab')
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('trellis-delete-confirm-modal')).not.toBeInTheDocument();
    });
  });

  it('renders color-coded priority badges (Low, Medium, High, Urgent) on card views', () => {
    render(<TrellisApp />);

    // Urgent badge (PAS-219: rose color-coded badge)
    const urgentBadge = screen.getByTestId('trellis-priority-badge-PAS-219');
    expect(urgentBadge).toHaveTextContent('Urgent');
    expect(urgentBadge).toHaveAttribute('data-priority', 'Urgent');
    expect(urgentBadge).toHaveClass('bg-rose-50', 'text-rose-700');

    // High badge (PAS-218: amber color-coded badge)
    const highBadge = screen.getByTestId('trellis-priority-badge-PAS-218');
    expect(highBadge).toHaveTextContent('High');
    expect(highBadge).toHaveAttribute('data-priority', 'High');
    expect(highBadge).toHaveClass('bg-amber-50', 'text-amber-800');

    // Medium badge (PAS-227: blue color-coded badge)
    const mediumBadge = screen.getByTestId('trellis-priority-badge-PAS-227');
    expect(mediumBadge).toHaveTextContent('Medium');
    expect(mediumBadge).toHaveAttribute('data-priority', 'Medium');
    expect(mediumBadge).toHaveClass('bg-blue-50', 'text-[#174EA6]');

    // Low badge (PAS-220: slate color-coded badge)
    const lowBadge = screen.getByTestId('trellis-priority-badge-PAS-220');
    expect(lowBadge).toHaveTextContent('Low');
    expect(lowBadge).toHaveAttribute('data-priority', 'Low');
    expect(lowBadge).toHaveClass('bg-slate-100', 'text-slate-600');
  });

  it('supports selecting priority when creating a task, updating priority in detail drawer, and filtering by priority', async () => {
    render(<TrellisApp />);

    // 1. Create a new task with Urgent priority
    fireEvent.click(screen.getByTestId('trellis-new-task-btn'));
    fireEvent.change(screen.getByTestId('trellis-input-title'), {
      target: { value: 'Fix Production Payroll Webhook' },
    });
    fireEvent.click(screen.getByTestId('trellis-priority-option-Urgent'));
    fireEvent.click(screen.getByTestId('trellis-submit-new-task'));

    await waitFor(() => {
      expect(screen.getByText('Fix Production Payroll Webhook')).toBeInTheDocument();
    });

    // 2. Open task detail and change priority via detail selector
    fireEvent.click(screen.getByText('Empty states for the Orders tab'));
    const detailPrioritySelect = screen.getByTestId('trellis-detail-priority-select');
    expect(detailPrioritySelect).toHaveValue('Low');
    fireEvent.change(detailPrioritySelect, { target: { value: 'Urgent' } });

    await waitFor(() => {
      expect(screen.getByTestId('trellis-priority-badge-PAS-220')).toHaveTextContent('Urgent');
    });

    // Close detail drawer
    fireEvent.click(screen.getByTestId('trellis-close-detail-btn'));

    // 3. Filter board cards by Urgent priority
    const priorityFilter = screen.getByTestId('trellis-filter-priority');
    fireEvent.change(priorityFilter, { target: { value: 'Urgent' } });

    expect(
      screen.getByText('Camera crashes on Android 12 when scanning a receipt')
    ).toBeInTheDocument();
    expect(screen.getByText('Fix Production Payroll Webhook')).toBeInTheDocument();
    expect(
      screen.queryByText('Let users skip the location permission step')
    ).not.toBeInTheDocument();
  });

  it('displays dependency badges on cards and prevents starting a blocked task until prerequisites are Done', async () => {
    render(<TrellisApp />);

    // PAS-222 depends on PAS-224 (which is 'In progress'), so PAS-222 is Blocked
    const blockedBadge = screen.getByTestId('trellis-dependency-badge-PAS-222');
    expect(blockedBadge).toHaveAttribute('data-blocked', 'true');
    expect(blockedBadge).toHaveTextContent('Blocked by PAS-224');

    // PAS-224 blocks PAS-222 and depends on PAS-229 (which is 'Done')
    const readyBadge = screen.getByTestId('trellis-dependency-badge-PAS-224');
    expect(readyBadge).toHaveAttribute('data-blocked', 'false');
    expect(readyBadge).toHaveTextContent('Deps 1/1');
    expect(screen.getByTestId('trellis-blocks-badge-PAS-224')).toHaveTextContent('Blocks PAS-222');

    // Attempt to advance PAS-222 from 'To do' while PAS-224 is still 'In progress'
    fireEvent.click(screen.getByTestId('trellis-card-advance-PAS-222'));

    // Dependency alert banner appears and PAS-222 stays in 'To do'
    const alertBanner = screen.getByTestId('trellis-dependency-alert');
    expect(alertBanner).toHaveTextContent('Cannot start or advance "Track checkout drop-off by step" (PAS-222)');
    expect(alertBanner).toHaveTextContent('PAS-224');
    expect(screen.getByTestId('trellis-column-to-do')).toHaveTextContent('Track checkout drop-off by step');

    // Complete prerequisite PAS-224 by moving it to 'Done'
    fireEvent.click(screen.getByText('Checkout: save address for next time'));
    fireEvent.change(screen.getByTestId('trellis-detail-status-select'), {
      target: { value: 'Done' },
    });
    fireEvent.click(screen.getByTestId('trellis-close-detail-btn'));

    // Now PAS-222 dependency badge shows Deps 1/1 (unblocked) and can start
    await waitFor(() => {
      expect(screen.getByTestId('trellis-dependency-badge-PAS-222')).toHaveAttribute('data-blocked', 'false');
      expect(screen.getByTestId('trellis-dependency-badge-PAS-222')).toHaveTextContent('Deps 1/1');
    });

    fireEvent.click(screen.getByTestId('trellis-card-advance-PAS-222'));
    await waitFor(() => {
      expect(screen.getByTestId('trellis-column-in-progress')).toHaveTextContent(
        'Track checkout drop-off by step'
      );
    });
  });

  it('allows linking and unlinking prerequisite task dependencies from the detail drawer', async () => {
    render(<TrellisApp />);

    // Open PAS-220 ('To do', initially no dependencies)
    fireEvent.click(screen.getByText('Empty states for the Orders tab'));

    const depSection = screen.getByTestId('trellis-detail-dependencies-section');
    expect(depSection).toHaveTextContent('No prerequisite tasks linked');

    // Link PAS-219 ('To do') as a prerequisite for PAS-220
    const depSelect = screen.getByTestId('trellis-add-dependency-select');
    fireEvent.change(depSelect, { target: { value: 'PAS-219' } });
    fireEvent.click(screen.getByTestId('trellis-add-dependency-btn'));

    // PAS-220 is now blocked by PAS-219
    await waitFor(() => {
      expect(screen.getByTestId('trellis-prereq-item-PAS-219')).toBeInTheDocument();
      expect(screen.getByTestId('trellis-dependency-badge-PAS-220')).toHaveTextContent(
        'Blocked by PAS-219'
      );
    });

    // Unlink PAS-219 from PAS-220
    fireEvent.click(screen.getByTestId('trellis-remove-dependency-PAS-219'));

    await waitFor(() => {
      expect(screen.queryByTestId('trellis-prereq-item-PAS-219')).not.toBeInTheDocument();
      expect(screen.queryByTestId('trellis-dependency-badge-PAS-220')).not.toBeInTheDocument();
    });
  });
});
