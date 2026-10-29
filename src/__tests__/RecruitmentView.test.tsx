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
      createRequisition: vi.fn().mockImplementation((req) => Promise.resolve(req)),
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
    render(<RecruitmentView />);

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

    // Advance to Step 3
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));
    expect(await screen.findByText(/Step 3: Timeline & Sheet 8 Protocol/i)).toBeInTheDocument();

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
});
