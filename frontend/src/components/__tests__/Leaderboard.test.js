import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import Leaderboard from '../Leaderboard';

// Mock axios
jest.mock('axios');

// Sample leaderboard data for testing
const mockLeaderboardData = [
  {
    id: 1,
    display_name: 'user1',
    total_points: 150
  },
  {
    id: 2,
    display_name: 'user2',
    total_points: 120
  },
  {
    id: 3,
    display_name: 'user3',
    total_points: 100
  }
];

describe('Leaderboard Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    axios.get.mockReset();
  });

  test('renders loading state initially', () => {
    // Mock the API call to return a pending promise
    axios.get.mockImplementation(() => new Promise(() => {}));
    
    render(<Leaderboard seasonSlug="2023-2024" />);
    
    // Check if loading indicator is displayed
    expect(screen.getByText(/Loading Leaderboard/i)).toBeInTheDocument();
  });

  test('renders leaderboard data when loaded', async () => {
    // Mock the API call to return successful response
    axios.get.mockResolvedValueOnce({ data: mockLeaderboardData });
    
    render(<Leaderboard seasonSlug="2023-2024" />);
    
    // Wait for the leaderboard to load
    await waitFor(() => {
      expect(screen.getByText(/Leaderboard \(2023-2024\)/)).toBeInTheDocument();
    });
    
    // Check if user data is displayed
    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('user2')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('user3')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  test('displays error message when API call fails', async () => {
    // Mock the API call to return an error
    axios.get.mockImplementation((url) => {
      if (url.startsWith('/api/v2/leaderboards/')) {
        return Promise.reject(new Error('v2 failed'));
      }
      if (url.startsWith('/api/v2/leaderboard/')) {
        return Promise.reject(new Error('temp failed'));
      }
      return Promise.reject(new Error('v1 failed'));
    });
    
    render(<Leaderboard seasonSlug="2023-2024" />);
    
    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to load leaderboard. Please try again later.')).toBeInTheDocument();
    });
  });

  test('calls correct API endpoint with season slug', async () => {
    // Mock the API call to return successful response
    axios.get.mockResolvedValueOnce({ data: mockLeaderboardData });
    
    render(<Leaderboard seasonSlug="2023-2024" />);
    
    // Wait for the API call to be made
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v2/leaderboards/2023-2024');
    });
  });

  test('renders rows in the order they are returned', async () => {
    const orderedData = [
      { id: 3, display_name: 'userC', total_points: 90 },
      { id: 1, display_name: 'userA', total_points: 140 },
      { id: 2, display_name: 'userB', total_points: 110 },
    ];
    
    axios.get.mockResolvedValueOnce({ data: orderedData });
    
    render(<Leaderboard seasonSlug="2023-2024" />);
    
    await waitFor(() => {
      expect(screen.getByText(/Leaderboard \(2023-2024\)/)).toBeInTheDocument();
    });
    
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('userC');
    expect(rows[2]).toHaveTextContent('userA');
    expect(rows[3]).toHaveTextContent('userB');
  });

  test('handles empty leaderboard data', async () => {
    // Mock the API call with empty leaderboard
    axios.get
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: { top_users: [] } })
      .mockResolvedValueOnce({ data: { top_users: [] } });
    
    render(<Leaderboard seasonSlug="2023-2024" />);
    
    // Wait for the leaderboard to load
    await waitFor(() => {
      expect(screen.getByText(/Leaderboard \(2023-2024\)/)).toBeInTheDocument();
    });
    
    // Check if empty message is displayed
    expect(screen.getByText(/No leaderboard data available/i)).toBeInTheDocument();
  });
});
