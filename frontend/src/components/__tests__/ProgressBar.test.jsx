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

  test('calculates correct percentage width', () => {
    render(<ProgressBar value={50} max={100} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle({ width: '50%' });
  });

  test('handles value exceeding max', () => {
    render(<ProgressBar value={150} max={100} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    expect(progressBar).toHaveStyle({ width: '100%' });
  });

  test('handles negative value', () => {
    render(<ProgressBar value={-10} max={100} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    expect(progressBar).toHaveStyle({ width: '0%' });
  });

  test('handles zero max value', () => {
    render(<ProgressBar value={50} max={0} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle({ width: '0%' });
  });

  test('displays percentage value when showValue is true', () => {
    render(<ProgressBar value={75} max={100} showValue={true} valueFormat="percent" />);

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  test('displays fraction value format', () => {
    render(<ProgressBar value={30} max={50} showValue={true} valueFormat="fraction" />);

    expect(screen.getByText('30/50')).toBeInTheDocument();
  });

  test('displays raw value format', () => {
    render(<ProgressBar value={42} max={100} showValue={true} valueFormat="raw" />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  test('does not display value when showValue is false', () => {
    render(<ProgressBar value={50} max={100} showValue={false} valueFormat="percent" />);

    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  test('applies custom color classes', () => {
    const { container } = render(<ProgressBar value={50} color="bg-green-500" bgColor="bg-gray-300" />);

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-green-500');

    const track = container.querySelector('.bg-gray-300');
    expect(track).toBeInTheDocument();
  });

  test('applies size variant classes', () => {
    const { container } = render(<ProgressBar size="lg" />);

    const track = container.querySelector('.h-4');
    expect(track).toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(<ProgressBar className="custom-progress" />);

    expect(container.firstChild).toHaveClass('custom-progress');
  });

  test('has transition animation', () => {
    const { container } = render(<ProgressBar value={50} />);

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('transition-all', 'duration-300', 'ease-in-out');
  });

  test('rounds percentage correctly', () => {
    render(<ProgressBar value={33} max={100} showValue={true} valueFormat="percent" />);

    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  test('handles decimal values', () => {
    render(<ProgressBar value={25.7} max={100} showValue={true} valueFormat="percent" />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveStyle({ width: '25.7%' });
    expect(screen.getByText('26%')).toBeInTheDocument(); // Rounded
  });
});
