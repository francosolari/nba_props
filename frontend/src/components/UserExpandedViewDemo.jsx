// src/components/UserExpandedViewDemo.jsx
import React from 'react';
import UserExpandedView from './UserExpandedView';

/**
 * Demo component to showcase UserExpandedView with sample data
 */
const UserExpandedViewDemo = () => {
  // Sample data for demonstration purposes
  const sampleCategories = [
    {
      id: 'standings',
      type: 'Regular',
      title: 'Regular Season Standings',
      points: 15,
      maxPoints: 30,
      predictions: [
        {
          id: 's1',
          team_name: 'Boston Celtics',
          predicted_position: 1,
          actual_position: 1,
          correct: true,
          points: 3
        },
        {
          id: 's2',
          team_name: 'New York Knicks',
          predicted_position: 4,
          actual_position: 2,
          correct: false,
          points: 0
        },
        {
          id: 's3',
          team_name: 'Milwaukee Bucks',
          predicted_position: 2,
          actual_position: 3,
          correct: false,
          points: 1
        },
        {
          id: 's4',
          team_name: 'Philadelphia 76ers',
          predicted_position: 3,
          actual_position: 5,
          correct: false,
          points: 0
        },
        {
          id: 's5',
          team_name: 'Cleveland Cavaliers',
          predicted_position: 5,
          actual_position: 4,
          correct: false,
          points: 1
        },
        {
          id: 's6',
          team_name: 'Oklahoma City Thunder',
          predicted_position: 8,
          actual_position: 1,
          correct: false,
          points: 0
        },
        {
          id: 's7',
          team_name: 'Denver Nuggets',
          predicted_position: 1,
          actual_position: 2,
          correct: false,
          points: 1
        },
        {
          id: 's8',
          team_name: 'Minnesota Timberwolves',
          predicted_position: 6,
          actual_position: 3,
          correct: false,
          points: 0
        }
      ]
    },
    {
      id: 'awards',
      type: 'Awards',
      title: 'Season Awards',
      points: 12,
      maxPoints: 15,
      predictions: [
        {
          id: 'a1',
          question: 'MVP Winner',
          answer: 'Nikola Jokic',
          correct: true,
          points: 5
        },
        {
          id: 'a2',
          question: 'Rookie of the Year',
          answer: 'Victor Wembanyama',
          correct: true,
          points: 3
        },
        {
          id: 'a3',
          question: 'Defensive Player of the Year',
          answer: 'Rudy Gobert',
          correct: true,
          points: 3
        },
        {
          id: 'a4',
          question: 'Most Improved Player',
          answer: 'Tyrese Maxey',
          correct: false,
          points: 0
        },
        {
          id: 'a5',
          question: 'Sixth Man of the Year',
          answer: 'Immanuel Quickley',
          correct: null,
          points: 0
        }
      ]
    },
    {
      id: 'props',
      type: 'Props',
      title: 'Season Props',
      points: 8,
      maxPoints: 24,
      predictions: [
        {
          id: 'p1',
          question: 'Will LeBron James average over 25 ppg?',
          answer: 'Yes',
          correct: true,
          points: 2
        },
        {
          id: 'p2',
          question: 'Will the Celtics win more than 60 games?',
          answer: 'Yes',
          correct: true,
          points: 2
        },
        {
          id: 'p3',
          question: 'Will Anthony Davis play in 70+ games?',
          answer: 'No',
          correct: false,
          points: 0
        },
        {
          id: 'p4',
          question: 'Will the Warriors make the playoffs?',
          answer: 'Yes',
          correct: true,
          points: 2
        },
        {
          id: 'p5',
          question: 'Will Joel Embiid win scoring title?',
          answer: 'Yes',
          correct: false,
          points: 0
        },
        {
          id: 'p6',
          question: 'Will OKC finish top 4 in the West?',
          answer: 'No',
          correct: false,
          points: 0
        },
        {
          id: 'p7',
          question: 'Will the Lakers make the Western Conf Finals?',
          answer: 'No',
          correct: null,
          points: 0
        },
        {
          id: 'p8',
          question: 'Will the Knicks make it past the 2nd round?',
          answer: 'Yes',
          correct: true,
          points: 2
        }
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">User Expanded View</h1>
        <p className="text-gray-700 mb-4">
          This demo shows how a user's expanded view looks with category cards displayed in a grid.
          Each card shows different prediction types with appropriate formatting.
        </p>
      </div>
      
      <UserExpandedView categories={sampleCategories} />
    </div>
  );
};

export default UserExpandedViewDemo;
