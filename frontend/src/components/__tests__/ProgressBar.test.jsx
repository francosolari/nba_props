import React from 'react';
import { render, screen } from '@testing-library/react';
import ProgressBar from '../ProgressBar';

describe('ProgressBar Component', () => {
  test('renders with default props', () => {
    render(<ProgressBar />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  test('renders with custom value and max', () => {
    render(<ProgressBar value={50} max={200} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemax', '200');
    // Width should be 25% (50/200)
    expect(progressBar).toHaveStyle({ width: '25%' });
  });

  test('clamps value between 0 and max', () => {
    render(<ProgressBar value={150} max={100} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    expect(progressBar).toHaveStyle({ width: '100%' });

    render(<ProgressBar value={-10} max={100} />);
    const progressBarNegative = screen.getAllByRole('progressbar')[1];
    expect(progressBarNegative).toHaveAttribute('aria-valuenow', '0');
    expect(progressBarNegative).toHaveStyle({ width: '0%' });
  });

  test('displays formatted value when showValue is true', () => {
    render(<ProgressBar value={75} max={100} showValue={true} valueFormat="percent" />);
    expect(screen.getByText('75%')).toBeInTheDocument();

    render(<ProgressBar value={5} max={10} showValue={true} valueFormat="fraction" />);
    expect(screen.getByText('5/10')).toBeInTheDocument();

    render(<ProgressBar value={42} showValue={true} valueFormat="raw" />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  test('applies custom colors and sizes', () => {
    const { container } = render(
      <ProgressBar
        value={50}
        color="bg-red-500"
        bgColor="bg-black"
        size="lg"
        className="custom-class"
      />
    );

    // Check for custom class on container
    expect(container.firstChild).toHaveClass('custom-class');

    // Check for size class
    // Note: implementation details might make this tricky if classes are composed dynamically
    // We can check if the rendered HTML contains the expected classes
    expect(container.innerHTML).toContain('bg-red-500');
    expect(container.innerHTML).toContain('bg-black');
    expect(container.innerHTML).toContain('h-4'); // lg size
  });
});
