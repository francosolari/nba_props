import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import Leaderboard from '../Leaderboard';

// Mock axios
jest.mock('axios');

// Sample leaderboard data for testing
const mockLeaderboardData = {
  leaderboard: [
    {
      username: 'user1',
      total_points: 150,
      rank: 1,
      avatar: null
    },
    {
      username: 'user2',
      total_points: 120,
      rank: 2,
      avatar: null
    },
    {
      username: 'user3',
      total_points: 100,
      rank: 3,
      avatar: null
    }
  ]
};

describe('Leaderboard Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('renders loading state initially', () => {
    // Mock the API call to return a pending promise
    axios.get.mockImplementation(() => new Promise(() => {}));
    
    render(<Leaderboard seasonSlug="2023-2024" />);
    
    // Check if loading indicator is displayed
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('renders leaderboard data when loaded', async () => {
    // Mock the API call to return successful response
    axios.get.mockResolvedValue({ data: mockLeaderboardData });
    
    render(<Leaderboard seasonSlug="2023-2024" />);
    
    // Wait for the leaderboard to load
    await waitFor(() => {
      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
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
    axios.get.mockRejectedValue(new Error('Failed to fetch leaderboard'));
    
    render(<Leaderboard seasonSlug="2023-2024" />);
    
    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText(/error loading leaderboard/i)).toBeInTheDocument();
    });
  });

  test('calls correct API endpoint with season slug', async () => {
    // Mock the API call to return successful response
    axios.get.mockResolvedValue({ data: mockLeaderboardData });
    
    render(<Leaderboard seasonSlug="2023-2024" />);
    
    // Wait for the API call to be made
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/v2/2023-2024/leaderboard/');
    });
  });

  test('sorts leaderboard by rank', async () => {
    // Mock the API call with unordered data
    const unorderedData = {
      leaderboard: [
        {
          username: 'user3',
          total_points: 100,
          rank: 3,
          avatar: null
        },
        {
          username: 'user1',
          total_points: 150,
          rank: 1,
          avatar: null
        },
        {
          username: 'user2',
          total_points: 120,
          rank: 2,
          avatar: null
        }
      ]
    };
    
    axios.get.mockResolvedValue({ data: unorderedData });
    
    render(<Leaderboard seasonSlug="2023-2024" />);
    
    // Wait for the leaderboard to load
    await waitFor(() => {
      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    });
    
    // Get all username elements
    const usernames = screen.getAllByTestId('username');
    
    // Check if they are in the correct order
    expect(usernames[0]).toHaveTextContent('user1');
    expect(usernames[1]).toHaveTextContent('user2');
    expect(usernames[2]).toHaveTextContent('user3');
  });

  test('handles empty leaderboard data', async () => {
    // Mock the API call with empty leaderboard
    axios.get.mockResolvedValue({ data: { leaderboard: [] } });
    
    render(<Leaderboard seasonSlug="2023-2024" />);
    
    // Wait for the leaderboard to load
    await waitFor(() => {
      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    });
    
    // Check if empty message is displayed
    expect(screen.getByText(/no leaderboard data available/i)).toBeInTheDocument();
  });
});