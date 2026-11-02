import { beforeEach, describe, expect, it, vi } from 'vitest';

const { requestLaravelData, requestLaravel } = vi.hoisted(() => ({
  requestLaravelData: vi.fn(),
  requestLaravel: vi.fn(),
}));

vi.mock('../services/laravelClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/laravelClient')>();
  return { ...actual, requestLaravelData, requestLaravel };
});

import {
  createLaravelTask,
  getLaravelTask,
  mapLaravelTask,
  taskStatusToApi,
  updateLaravelTaskStatus,
} from '../services/trellisApi';
import { LaravelTask } from '../services/trellisApi';
import { TrellisTask } from '../components/trellis/types';

const apiTask: LaravelTask = {
  id: 42,
  title: 'Prepare Q4 rollout',
  description: 'Coordinate launch tasks',
  status: 'in_progress',
  priority: 'high',
  due_date: '2026-11-15',
  assigned_to_employee_id: 14,
  created_by_employee_id: 9,
  assignment_status: 'pending',
  labels: ['Feature', 'High'],
  estimated_hours: '3.50',
  checklist: [{ id: 'check-1', text: 'Confirm owner', done: false }],
  assignee: { id: 14, staff_id: 'CGCC/014', full_name: 'Test Employee', job_title: 'Officer' },
  creator: { id: 9, full_name: 'HR User' },
  comments: [{ id: 77, comment: 'Please review the estimate', author: { id: 9, full_name: 'HR User' } }],
};

describe('Trellis Laravel API integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('maps Laravel task IDs, statuses, assignment and persisted comments', () => {
    const task = mapLaravelTask(apiTask);

    expect(task).toMatchObject({
      id: '42', title: 'Prepare Q4 rollout', status: 'In progress', assigneeId: '14',
      assignmentStatus: 'pending', hours: 3.5, comments: [{ id: '77', text: 'Please review the estimate' }],
    });
    expect(taskStatusToApi('Done')).toBe('completed');
  });

  it('creates and reloads tasks through the Laravel API and propagates failures', async () => {
    requestLaravelData.mockResolvedValueOnce(apiTask);
    const created = await createLaravelTask({
      title: 'Prepare Q4 rollout', description: 'Coordinate launch tasks', status: 'To do',
      labels: ['Feature'], dueDate: '2026-11-15', assigneeId: '14', departmentId: '3', hours: 3.5,
    });

    expect(requestLaravelData).toHaveBeenCalledWith('/tasks', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(requestLaravelData.mock.calls[0][1].body)).toMatchObject({
      title: 'Prepare Q4 rollout', status: 'todo', assigned_to_employee_id: 14,
      department_id: null, estimated_hours: 3.5,
    });
    expect(created.id).toBe('42');

    requestLaravelData.mockRejectedValueOnce(new Error('Forbidden'));
    await expect(getLaravelTask('42')).rejects.toThrow('Forbidden');
  });

  it('persists status updates then reloads the authoritative task', async () => {
    const task = mapLaravelTask(apiTask);
    requestLaravelData.mockResolvedValueOnce(apiTask).mockResolvedValueOnce(apiTask);

    await updateLaravelTaskStatus(task as TrellisTask, 'Done');

    expect(requestLaravelData).toHaveBeenNthCalledWith(1, '/tasks/42/status', expect.objectContaining({ method: 'PATCH' }));
    expect(JSON.parse(requestLaravelData.mock.calls[0][1].body)).toEqual({ status: 'completed' });
    expect(requestLaravelData).toHaveBeenNthCalledWith(2, '/tasks/42');
  });
});
