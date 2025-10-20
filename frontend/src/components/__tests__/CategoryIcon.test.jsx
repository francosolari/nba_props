import React from 'react';
import { render, screen } from '@testing-library/react';
import CategoryIcon from '../CategoryIcon';

describe('CategoryIcon Component', () => {
  test('renders Regular category with correct icon', () => {
    const { container } = render(<CategoryIcon category="Regular" />);

    expect(container.textContent).toContain('🏀');
    expect(screen.getByLabelText('Regular')).toBeInTheDocument();
  });

  test('renders Awards category with correct icon', () => {
    const { container } = render(<CategoryIcon category="Awards" />);

    expect(container.textContent).toContain('🏆');
    expect(screen.getByLabelText('Awards')).toBeInTheDocument();
  });

  test('renders Props category with correct icon', () => {
    const { container } = render(<CategoryIcon category="Props" />);

    expect(container.textContent).toContain('📊');
    expect(screen.getByLabelText('Props')).toBeInTheDocument();
  });

  test('renders default icon for unknown category', () => {
    // Suppress PropTypes warning for this specific test
    const originalError = console.error;
    console.error = jest.fn();

    const { container } = render(<CategoryIcon category="Unknown" />);

    expect(container.textContent).toContain('❓');

    console.error = originalError;
  });

  test('applies correct size classes', () => {
    const sizes = ['sm', 'md', 'lg'];
    const sizeClasses = [['w-5', 'h-5'], ['w-6', 'h-6'], ['w-8', 'h-8']];

    sizes.forEach((size, index) => {
      const { container, unmount } = render(<CategoryIcon category="Regular" size={size} />);
      const iconDiv = container.querySelector('.inline-flex > div');

      expect(iconDiv).toHaveClass(...sizeClasses[index]);
      unmount();
    });
  });

  test('shows label when showLabel is true', () => {
    const { container } = render(<CategoryIcon category="Awards" showLabel={true} />);

    // Check that the label span exists outside of sr-only
    const labelSpan = container.querySelector('span.ml-1');
    expect(labelSpan).toBeInTheDocument();
    expect(labelSpan).toHaveTextContent('Awards');
  });

  test('does not show visible label when showLabel is false', () => {
    const { container } = render(<CategoryIcon category="Awards" showLabel={false} />);

    // Should not have the visible label span
    const labelSpan = container.querySelector('span.ml-1');
    expect(labelSpan).not.toBeInTheDocument();
  });

  test('applies custom className', () => {
    const { container } = render(
      <CategoryIcon category="Regular" className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  test('has correct background colors for each category', () => {
    const categories = [
      { name: 'Regular', bgColor: 'bg-blue-100' },
      { name: 'Awards', bgColor: 'bg-yellow-100' },
      { name: 'Props', bgColor: 'bg-green-100' },
    ];

    categories.forEach(({ name, bgColor }) => {
      const { container, unmount } = render(<CategoryIcon category={name} />);
      // First div is the outer wrapper, second div is the icon container
      const iconDiv = container.querySelector('.inline-flex > div');

      expect(iconDiv).toHaveClass(bgColor);
      unmount();
    });
  });

  test('defaults to medium size when no size specified', () => {
    const { container } = render(<CategoryIcon category="Regular" />);
    const iconDiv = container.querySelector('.inline-flex > div');

    expect(iconDiv).toHaveClass('w-6', 'h-6');
  });
});
