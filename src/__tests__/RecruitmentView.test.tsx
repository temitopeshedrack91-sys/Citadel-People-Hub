import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecruitmentView } from '../components/views/RecruitmentView';
import { talentRepository, organizationRepository } from '../services';

vi.mock('../services', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    talentRepository: {
      ...actual.talentRepository,
      getRequisitions: vi.fn().mockResolvedValue([
        {
          id: 'req-01',
          requisitionCode: 'REQ-CGCC-2026-09',
          jobTitle: 'Senior Sound & Media Broadcast Engineer',
          entityId: 'entity-cgcc',
          entityName: 'Citadel Global Community Church (CGCC)',
          departmentId: 'dept-cgcc-ict',
          departmentName: 'ICT',
          openPositions: 2,
          employmentType: 'Full-Time',
          status: 'Open',
          targetDate: '2026-10-15',
          applicantsCount: 24,
          candidates: [],
        },
      ]),
      createRequisition: vi.fn().mockImplementation((req) => Promise.resolve({
        ...req,
        id: 'req-new',
        requisitionCode: 'REQ-CGCC-2026-NEW001',
      })),
      updateRequisitionStatus: vi.fn().mockImplementation((id, status) => Promise.resolve({
        id,
        requisitionCode: 'REQ-CGCC-2026-09',
        jobTitle: 'Senior Sound & Media Broadcast Engineer',
        entityId: 'entity-cgcc',
        entityName: 'Citadel Global Community Church (CGCC)',
        departmentId: 'dept-cgcc-ict',
        departmentName: 'ICT',
        openPositions: 2,
        employmentType: 'Full-Time',
        status,
        targetDate: '2026-10-15',
        applicantsCount: 24,
        candidates: [],
      })),
    },
    organizationRepository: {
      ...actual.organizationRepository,
      getEntities: vi.fn().mockResolvedValue([
        {
          id: 'entity-cgcc',
          name: 'Citadel Global Community Church (CGCC)',
          shortCode: 'CGCC',
          departmentCount: 8,
          employeeCount: 78,
          headOfEntity: 'Senior Pastor',
          isActive: true,
          description: 'Flagship church',
        },
      ]),
      getDepartments: vi.fn().mockResolvedValue([
        {
          id: 'dept-cgcc-ict',
          entityId: 'entity-cgcc',
          name: 'ICT',
          code: 'CGCC-ICT',
          headOfDepartment: 'Bayu Wirawan',
          isActive: true,
          employeeCount: 6,
        },
      ]),
    },
    employeeRepository: {
      ...actual.employeeRepository,
      getAll: vi.fn().mockResolvedValue([]),
    },
    auditRepository: {
      logAction: vi.fn().mockResolvedValue(true),
    },
  };
});

describe('RecruitmentView & CreateRequisitionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the recruitment page with the New Requisition button', async () => {
    render(<RecruitmentView />);
    
    expect(await screen.findByText('Recruitment')).toBeInTheDocument();
    const newReqBtn = screen.getByRole('button', { name: /New Requisition/i });
    expect(newReqBtn).toBeInTheDocument();
  });

  it('opens the 4-step New Requisition modal when clicking New Requisition button', async () => {
    render(<RecruitmentView />);

    const newReqBtn = await screen.findByRole('button', { name: /New Requisition/i });
    fireEvent.click(newReqBtn);

    // Modal title should appear
    expect(await screen.findByText('New Recruitment Requisition')).toBeInTheDocument();
    expect(screen.getByText('Sheet 8 Mandate')).toBeInTheDocument();

    // Step 1: Role & Entity should be visible
    expect(screen.getByText(/Step 1: Role Designation & Organization/i)).toBeInTheDocument();
  });

  it('validates required fields and navigates through the wizard steps', async () => {
    const { container } = render(<RecruitmentView />);

    const newReqBtn = await screen.findByRole('button', { name: /New Requisition/i });
    fireEvent.click(newReqBtn);

    const continueBtn = await screen.findByRole('button', { name: /Continue/i });

    // Clicking continue without job title triggers validation error
    fireEvent.click(continueBtn);
    expect(await screen.findByText(/Please provide a specific job title/i)).toBeInTheDocument();

    // Enter job title
    const jobTitleInput = screen.getByPlaceholderText(/e.g. Senior Broadcast Engineer/i);
    fireEvent.change(jobTitleInput, { target: { value: 'Lead Facilities Director' } });

    // Advance to Step 2
    fireEvent.click(continueBtn);
    expect(await screen.findByText(/Step 2: Headcount, Hiring Lead & Compensation/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/e.g. Dr. Bukola Adeleke/i), { target: { value: 'Current Manager' } });

    // Advance to Step 3
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(await screen.findByText(/Step 3: Timeline & Sheet 8 Protocol/i)).toBeInTheDocument();
    const targetDateInput = container.querySelector('input[type="date"]');
    expect(targetDateInput).not.toBeNull();
    fireEvent.change(targetDateInput as HTMLInputElement, { target: { value: '2026-12-15' } });

    // Advance to Step 4 (Verify & Submit)
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(await screen.findByText(/Step 4: Verify & Authorization Sign-Off/i)).toBeInTheDocument();
    expect(screen.getByText('Lead Facilities Director')).toBeInTheDocument();

    // Submit requisition
    const submitBtn = screen.getByRole('button', { name: /Submit Requisition for Approval/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(talentRepository.createRequisition).toHaveBeenCalledTimes(1);
    });
  });

  it('persists a requisition status change through the repository', async () => {
    render(<RecruitmentView />);
    const statusSelect = await screen.findByRole('combobox', {
      name: 'Update status for Senior Sound & Media Broadcast Engineer',
    });

    fireEvent.change(statusSelect, { target: { value: 'Interviewing' } });

    await waitFor(() => {
      expect(talentRepository.updateRequisitionStatus).toHaveBeenCalledWith('req-01', 'Interviewing');
    });
  });

  it('shows a load error without substituting seed requisitions', async () => {
    vi.mocked(talentRepository.getRequisitions).mockRejectedValueOnce(new Error('API unavailable'));
    render(<RecruitmentView />);

    expect(await screen.findByRole('alert')).toHaveTextContent('API unavailable');
    expect(screen.queryByText('Senior Sound & Media Broadcast Engineer')).not.toBeInTheDocument();
  });
});

