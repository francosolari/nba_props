import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import CourtSelect from '../CourtSelect';

describe('CourtSelect', () => {
  test('uses a themed listbox instead of a native browser select', () => {
    const onChange = jest.fn();
    const { container } = render(
      <CourtSelect label="Season" showLabel={false} value="2025-26" onChange={onChange}>
        <option value="2025-26">2025-26</option>
        <option value="2024-25">2024-25</option>
      </CourtSelect>,
    );

    expect(container.querySelector('select')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Season' }));
    expect(screen.getByRole('listbox', { name: 'Season' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: '2024-25' }));

    expect(onChange.mock.calls[0][0].target.value).toBe('2024-25');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
