import React from 'react';
import { render } from '@testing-library/react';

test('sanity check', () => {
    expect(true).toBe(true);
});

test('can import react', () => {
    expect(React).toBeDefined();
});
