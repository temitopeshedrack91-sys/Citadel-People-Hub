import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ListDetailLayout, ListItem } from '../components/common/ListDetailLayout';

interface MockDoctor {
  id: string;
  name: string;
  role: string;
  status: string;
}

const mockDoctors: ListItem<MockDoctor>[] = [
  {
    id: 'doc-1',
    title: 'Dr. Sarah Lee',
    subtitle: 'Chief Medical Officer',
    timestamp: '2m ago',
    data: { id: 'doc-1', name: 'Dr. Sarah Lee', role: 'Chief Medical Officer', status: 'Online' },
  },
  {
    id: 'doc-2',
    title: 'Dr. Alisa Ashcroft',
    subtitle: 'Prescription for March 26',
    timestamp: '14:20',
    data: { id: 'doc-2', name: 'Dr. Alisa Ashcroft', role: 'Lead Pharmacist', status: 'In Review' },
  },
];

describe('ListDetailLayout Component (Pillio Pattern)', () => {
  it('renders list items and active detail panel', () => {
    render(
      <ListDetailLayout<MockDoctor>
        items={mockDoctors}
        selectedId="doc-1"
        onSelectItem={vi.fn()}
        renderDetail={(item) => (
          <div data-testid="detail-view">
            <h2>{item.data.name}</h2>
            <p>{item.data.role}</p>
          </div>
        )}
      />
    );

    expect(screen.getAllByText('Dr. Sarah Lee').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Dr. Alisa Ashcroft')).toBeInTheDocument();
    expect(screen.getByTestId('detail-view')).toHaveTextContent('Chief Medical Officer');
  });

  it('highlights the selected list item with dark green accent border', () => {
    render(
      <ListDetailLayout<MockDoctor>
        items={mockDoctors}
        selectedId="doc-1"
        onSelectItem={vi.fn()}
        renderDetail={() => <div>Detail</div>}
      />
    );

    const item1 = screen.getByTestId('list-item-doc-1');
    expect(item1).toHaveClass('border-[#083E34]');
  });

  it('triggers onSelectItem when an item is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <ListDetailLayout<MockDoctor>
        items={mockDoctors}
        selectedId="doc-1"
        onSelectItem={handleSelect}
        renderDetail={() => <div>Detail</div>}
      />
    );

    const item2 = screen.getByTestId('list-item-doc-2');
    fireEvent.click(item2);
    expect(handleSelect).toHaveBeenCalledWith(mockDoctors[1]);
  });
});
