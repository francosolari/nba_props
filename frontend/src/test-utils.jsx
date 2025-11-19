import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const createTestQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            cacheTime: 0,
        },
    },
});

export function renderWithProviders(ui, { route = '/' } = {}) {
    const queryClient = createTestQueryClient();

    return {
        ...render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={[route]}>
                    {ui}
                </MemoryRouter>
            </QueryClientProvider>
        ),
        queryClient,
    };
}
