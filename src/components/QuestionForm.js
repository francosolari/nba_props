// src/components/QuestionForm.js

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { getCSRFToken } from '../utils/csrf';
import SelectComponent from "./SelectComponent";


const QuestionForm = ({ seasonSlug }) => {
  const [questions, setQuestions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [istStandings, setIstStandings] = useState([])
  const [answers, setAnswers] = useState({});
  const [errors, setErrors] = useState({}); // State for tracking validation errors
  const [loading, setLoading] = useState(true); // State for tracking validation errors


  /**
   * Retrieves the CSRF token from cookies.
   */
  const getCookie = useCallback((name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + '=')) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }, []);

      useEffect(() => {
        if (seasonSlug) {
          const fetchData = async () => {
            setLoading(true); // Start loading

            try {
              // Fetch all data in parallel
              const [
                questionsResponse,
                playersResponse,
                teamsResponse,
                istResponse,
              ] = await Promise.all([
                axios.get(`/api/questions/${seasonSlug}/`),
                axios.get('/api/players/'),
                axios.get('/api/teams/'),
                axios.get(`/api/ist-standings/${seasonSlug}/`),
              ]);

              // Set Questions
              setQuestions(questionsResponse.data?.questions || []);
              setPlayers(playersResponse.data?.players || []);
              setTeams(teamsResponse.data?.teams || []);
              setIstStandings(istResponse.data || {});  // Ensure this matches your API structure
            } catch (error) {
              console.error('Error fetching data:', error);
            } finally {
              setLoading(false); // Stop loading when done
            }
          };

          fetchData();
        }
      }, [seasonSlug]); // Dependency array ensures effect runs when seasonSlug changes
  // if (loading) {
  //   return <div>Loading...</div>;
  // }
  // Handle changes in answers and clear errors if any
  const handleChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));

    // Clear error for this question if it exists
    if (errors[questionId]) {
      setErrors(prevErrors => {
        const updatedErrors = { ...prevErrors };
        delete updatedErrors[questionId];
        return updatedErrors;
      });
    }
  };

const handleSubmit = useCallback((e) => {
    e.preventDefault();

    // Initialize a new errors object
    const newErrors = {};

    // Iterate through questions to check for answers
    questions.forEach(question => {
        if (question.question_type === 'superlative' && !answers[question.id]) {
            newErrors[question.id] = 'This question is required.';
        }
        if (question.question_type === 'head_to_head' && !answers[question.id]) {
            newErrors[question.id] = 'Please select a team.';
        }
        if (question.question_type === 'prop_over_under' && !answers[question.id]) {
            newErrors[question.id] = 'Please select Over or Under.';
        }
        if (question.question_type === 'prop_yes_no' && !answers[question.id]) {
            newErrors[question.id] = 'Please select Yes or No.';
        }
        if (question.question_type === 'player_stat_prediction' && !answers[question.id]) {
            newErrors[question.id] = 'Please enter a value.';
        }
        if (question.question_type === 'ist') {
            const predType = question.prediction_type;
            if ((predType === 'group_winner' || predType === 'wildcard' || predType === 'conference_winner') && !answers[question.id]) {
                newErrors[question.id] = 'Please select a team.';
            }
            if (predType === 'tiebreaker' && (!answers[question.id] || isNaN(answers[question.id]) || answers[question.id] <= 0)) {
                newErrors[question.id] = 'Please enter a valid positive number.';
            }
        }
        // Add additional validation for other question types if necessary
    });


    // If there are any errors, update the state and prevent submission
    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        // Optionally, scroll to the first error
        const firstErrorId = Object.keys(newErrors)[0];
        const errorElement = document.getElementById(`question_${firstErrorId}`);
        if (errorElement) {
            errorElement.scrollIntoView({behavior: 'smooth', block: 'center'});
        }
        alert('Please fix the errors before submitting.');
        return;
    }
    // Prepare the payload as an array of { question, answer } objects
    const payload = {
        answers: Object.entries(answers).map(([question_id, answer]) => ({
            question: parseInt(question_id), // Ensure question_id is an integer
            answer: answer
        }))
    };

    console.log('Submitting Payload:', payload); // For debugging purposes

    // Submit the answers to the backend
    axios.post(`/api/submit-answers/${seasonSlug}/`, payload, {
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken('csrftoken'), // Include CSRF token
        }
    })
        .then(response => {
            if (response.data.status === 'success') {
                alert('Answers submitted successfully!');
                setAnswers({});
                setErrors({});
            } else{
                setErrors(response.data.errors || {});
                alert('There were errors submitting your answers.');
            }
        })
        .catch(error => {
            console.error('Error submitting answers:', error);
            if (error.response && error.response.data && error.response.data.errors) {
                setErrors(error.response.data.errors);
            }
            alert('Failed to submit answers.');
        });
}, [answers, getCookie, questions, seasonSlug]);

  const renderInput = (question) => {
    // Determine if there's an error for this question
    const hasError = errors[question.id];

    switch (question.question_type) {
      case 'superlative':
        // Map players to react-select options
        const playerOptions = players.map(player => ({
          value: player.id,
          label: player.name,
        }));
        // Sort options alphabetically for better UX
        const sortedPlayerOptions = playerOptions.sort((a, b) => a.label.localeCompare(b.label));
        const selectedPlayerOption = sortedPlayerOptions.find(option => option.value === answers[question.id]) || null;

        return (
            <SelectComponent
              options={players.map(player => ({ value: player.id, label: player.name }))}
              value={selectedPlayerOption}
              onChange={(selectedOption) => handleChange(question.id,
                  selectedOption ? selectedOption.value : '')}
              placeholder="Select Player"
              hasError={hasError}
            />
        );

      case 'prop_over_under':
        return (
          <div className="mt-1 flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name={`question_${question.id}`}
                value="over"
                onChange={(e) => handleChange(question.id, e.target.value)}
                required
                className="form-radio h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-xs sm:text-sm">Over</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name={`question_${question.id}`}
                value="under"
                onChange={(e) => handleChange(question.id, e.target.value)}
                className="form-radio h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-xs sm:text-sm">Under</span>
            </label>
          </div>
        );

      case 'prop_yes_no':
        return (
          <div className="mt-1 flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                name={`question_${question.id}`}
                value="yes"
                onChange={(e) => handleChange(question.id, e.target.value)}
                required
                className="form-radio h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-xs sm:text-sm">Yes</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                name={`question_${question.id}`}
                value="no"
                onChange={(e) => handleChange(question.id, e.target.value)}
                className="form-radio h-4 w-4 text-blue-600"
              />
              <span className="ml-2 text-xs sm:text-sm">No</span>
            </label>
          </div>
        );
      case 'head_to_head': // New case for HeadToHeadQuestion
        return (
          <div className="mt-1 flex flex-col items-center">
            <div className="flex items-center space-x-4">
              {question.team1 && (
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    value={question.team1}
                    onChange={(e) => handleChange(question.id, e.target.value)}
                    required
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-xs sm:text-sm">{question.team1}</span>
                </label>
              )}
              {question.team2 && (
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name={`question_${question.id}`}
                    value={question.team2}
                    onChange={(e) => handleChange(question.id, e.target.value)}
                    className="form-radio h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2 text-xs sm:text-sm">{question.team2}</span>
                </label>
              )}
            </div>
          </div>
        );

      case 'player_stat_prediction':
        return (
          <input
            type="number"
            id={`question_${question.id}`}
            min="1"
            value={answers[question.id] || ''}
            onChange={(e) => handleChange(question.id, e.target.value)}
            className={`mt-1 block w-full border ${
              errors[question.id] ? 'border-red-500' : 'border-gray-300'
            } rounded-md shadow-sm px-2 py-1 text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
            required
          />
        );
    case 'ist':
      let teamOptions = [];

      // Group Winners Dropdown
      if (question.prediction_type === 'group_winner') {
        const groupStandings = istStandings[question.ist_group.includes('East') ? 'East' : 'West'][question.ist_group];
        if (groupStandings) {
          teamOptions = groupStandings.map(standing => ({
            value: standing.team_id,
            label: standing.team_name,
          }));
        } else {
          console.error(`No standings found for ${question.ist_group}`);
        }
      }

      // Wildcards or Conference Winners Dropdown
      if (question.prediction_type === 'wildcard' || question.prediction_type === 'conference_winner') {
        const filteredTeams = teams.filter(team => team.conference === question.ist_group);
        teamOptions = filteredTeams.map(team => ({
          value: team.id,
          label: team.name,
        }));
      }

      // Tiebreakers (render as an integer input)
      if (question.prediction_type === 'tiebreaker') {
        return (
          <>
            <input
              type="number"
              id={`question_${question.id}`}
              min="1"
              value={answers[question.id] || ''}
              onChange={(e) => handleChange(question.id, e.target.value)}
              className={`mt-1 block w-full text-sm ${errors[question.id] ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 px-3 py-2`}
              placeholder="Enter the final score"
              required
            />
            {errors[question.id] && (
              <span className="mt-1 text-xs text-red-500">
                {errors[question.id]}
              </span>
            )}
          </>
        );
      }

      // Use react-select dropdown for teams (same styling as superlative dropdowns)
      return (
          <SelectComponent
            options={teamOptions}
            value={teamOptions.find(option => option.value === answers[question.id]) || null}
            onChange={(selectedOption) => handleChange(question.id,
                selectedOption ? selectedOption.value : '')}
            placeholder="Select a team"
            hasError={errors[question.id]}
          />
        );

        default:
            return (
                <input
                    type="text"
                    id={`question_${question.id}`}
                    value={answers[question.id] || ''}
                    onChange={(e) => handleChange(question.id, e.target.value)}
                    className={`mt-1 block w-full border ${
                        errors[question.id] ? 'border-red-500' : 'border-gray-300'
                    } rounded-md shadow-sm px-2 py-1 text-xs focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                    required
                />
            );
    }
  };

    // Categorize questions by type
  const superlativeQuestions = questions.filter(q => q.question_type === 'superlative');
  const istTournamentQuestions = questions.filter(q => q.question_type === 'ist');
  const nbaFinalsQuestions = questions.filter(q => q.question_type === 'nba_finals');

  const otherQuestions = questions.filter(q => q.question_type !== 'superlative' && q.question_type !== 'ist'
  && q.question_type!= 'nba_finals');  // Further categorize otherQuestions into Player Props and General Props
  // Assuming player-specific questions have 'related_player' field
  const playerName = 'Lebron James Jr'; // Define the player name to filter
  const playerProps = otherQuestions.filter(q =>
  q.related_player === playerName
    );
  const generalProps = otherQuestions.filter(q =>
      !q.related_player || q.related_player !== playerName
    );

  return (
      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto p-4">
          {/* Superlative Questions */}
          {superlativeQuestions.length > 0 && (
              <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Superlatives</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      {superlativeQuestions.map(question => (
                          <div
                              key={question.id}
                              className="p-4 border border-gray-200 rounded-md shadow-sm flex flex-col justify-between min-h-48"
                          >
                              <div>
                                  <label htmlFor={`question_${question.id}`}
                                         className="block text-gray-700 mb-2 text-sm">
                                      {question.text}
                                  </label>
                                  {renderInput(question)}
                                  {/* Point Value Display */}
                                  <span className="mt-2 text-xs italic text-gray-500 text-center">
                    {question.point_value} {question.point_value === 1 ? 'point' : 'points'} for correct answer{' '}
                                      <br/>{question.point_value / 2} {question.point_value / 2 === 1 ? 'point' : 'points'} for runner-up
                  </span>
                                  {/* Error Message */}
                                  {errors[question.id] && (
                                      <span className="mt-1 text-xs text-red-500">
                      {errors[question.id]}
                    </span>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
          {/* NBA Finals Section */}
          {nbaFinalsQuestions.length > 0 && (
              <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">NBA Finals Predictions</h2>
                  <p className="text-gray-500 mb-4">
                      1 point for correct team, 1 point for correct wins, game score used as tiebreaker.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Eastern Conference Finals */}
                      <div className="p-4 border border-gray-200 rounded-md shadow-sm flex flex-col">
                          <h3 className="text-lg font-semibold mb-2">Eastern Conference Finals</h3>
                          {/* Team Selection for East */}
                          {nbaFinalsQuestions
                              .filter(q => q.group_name === 'finals_east' && q.text.toLowerCase().includes('team'))
                              .map(question => {
                                  // Generate team options for Eastern Conference
                                  const teamOptions = teams
                                      .filter(team => team.conference === 'East')
                                      .map(team => ({value: team.id, label: team.name}));

                                  // Find the selected team option based on the stored answer
                                  const selectedTeamOption = teamOptions.find(option => option.value === answers[question.id]) || null;

                                  return (
                                      <div key={question.id} className="mb-4">
                                          <label
                                              className="block text-sm font-medium text-gray-700">{question.text}</label>
                                          <SelectComponent
                                              options={teamOptions}
                                              value={selectedTeamOption} // Pass the entire option object
                                              onChange={(selectedOption) =>
                                                  handleChange(question.id, selectedOption ? selectedOption.value : '')
                                              }
                                              placeholder="Select East Team"
                                              hasError={errors[question.id]}
                                          />
                                          {errors[question.id] && (
                                              <span className="text-xs text-red-500">{errors[question.id]}</span>
                                          )}
                                      </div>
                                  );
                              })}
                          {/* Wins Selection for East */}
                          {nbaFinalsQuestions
                              .filter(q => q.group_name === 'finals_east' && q.text.toLowerCase().includes('wins'))
                              .map(question => {
                                  // Generate wins options
                                  const winsOptions = question.wins_choices.map(wins => ({
                                      value: wins,
                                      label: `${wins} wins`,
                                  }));

                                  // Find the selected wins option based on the stored answer
                                  const selectedWinsOption = winsOptions.find(option => option.value === answers[question.id]) || null;

                                  return (
                                      <div key={question.id} className="mb-4">
                                          <label
                                              className="block text-sm font-medium text-gray-700">{question.text}</label>
                                          <SelectComponent
                                              options={winsOptions}
                                              value={selectedWinsOption} // Pass the entire option object
                                              onChange={(selectedOption) =>
                                                  handleChange(question.id, selectedOption ? selectedOption.value : '')
                                              }
                                              placeholder="Select Wins"
                                              hasError={errors[question.id]}
                                          />
                                          {errors[question.id] && (
                                              <span className="text-xs text-red-500">{errors[question.id]}</span>
                                          )}
                                      </div>
                                  );
                              })}
                      </div>

                      {/* Western Conference Finals */}
                      <div className="p-4 border border-gray-200 rounded-md shadow-sm flex flex-col">
                          <h3 className="text-lg font-semibold mb-2">Western Conference Finals</h3>
                          {/* Team Selection for West */}
                          {nbaFinalsQuestions
                              .filter(q => q.group_name === 'finals_west' && q.text.toLowerCase().includes('team'))
                              .map(question => {
                                  // Generate team options for Western Conference
                                  const teamOptions = teams
                                      .filter(team => team.conference === 'West')
                                      .map(team => ({value: team.id, label: team.name}));

                                  // Find the selected team option based on the stored answer
                                  const selectedTeamOption = teamOptions.find(option => option.value === answers[question.id]) || null;

                                  return (
                                      <div key={question.id} className="mb-4">
                                          <label
                                              className="block text-sm font-medium text-gray-700">{question.text}</label>
                                          <SelectComponent
                                              options={teamOptions}
                                              value={selectedTeamOption} // Pass the entire option object
                                              onChange={(selectedOption) =>
                                                  handleChange(question.id, selectedOption ? selectedOption.value : '')
                                              }
                                              placeholder="Select West Team"
                                              hasError={errors[question.id]}
                                          />
                                          {errors[question.id] && (
                                              <span className="text-xs text-red-500">{errors[question.id]}</span>
                                          )}
                                      </div>
                                  );
                              })}
                          {/* Wins Selection for West */}
                          {nbaFinalsQuestions
                              .filter(q => q.group_name === 'finals_west' && q.text.toLowerCase().includes('wins'))
                              .map(question => {
                                  // Generate wins options
                                  const winsOptions = question.wins_choices.map(wins => ({
                                      value: wins,
                                      label: `${wins} wins`,
                                  }));

                                  // Find the selected wins option based on the stored answer
                                  const selectedWinsOption = winsOptions.find(option => option.value === answers[question.id]) || null;

                                  return (
                                      <div key={question.id} className="mb-4">
                                          <label
                                              className="block text-sm font-medium text-gray-700">{question.text}</label>
                                          <SelectComponent
                                              options={winsOptions}
                                              value={selectedWinsOption} // Pass the entire option object
                                              onChange={(selectedOption) =>
                                                  handleChange(question.id, selectedOption ? selectedOption.value : '')
                                              }
                                              placeholder="Select Wins"
                                              hasError={errors[question.id]}
                                          />
                                          {errors[question.id] && (
                                              <span className="text-xs text-red-500">{errors[question.id]}</span>
                                          )}
                                      </div>
                                  );
                              })}
                      </div>
                  </div>
              </div>
          )}
          {/* Other Questions (Props) */}
          {generalProps.length > 0 && (
              <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">Props</h2>
                  {/* Adjust the grid to have more columns on larger screens */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {generalProps.map(question => (
                          <div
                              key={question.id}
                              className="p-3 border border-gray-200 rounded-md
                shadow-sm flex flex-col items-center h-36" // Set fixed height
                          >
                              <div className="flex flex-col items-center justify-center h-full text-center">
                                  <label htmlFor={`question_${question.id}`}
                                         className="block text-gray-700 mb-1 text-xs sm:text-sm break-words">
                                      {question.text}
                                  </label>
                                  {/* Display the line for Over/Under questions */}
                                  {question.question_type === 'prop_over_under' && (
                                      <span className="mt-1 text-xs italic text-gray-500">
                      Line: {question.line}
                    </span>
                                  )}
                                  {renderInput(question)}
                                  {/* Point Value Display */}
                                  <span className="mt-1 text-xs italic text-gray-500 text-center">
                    {question.point_value} {question.point_value === 1 ? 'point' : 'points'}
                  </span>
                                  {/* Optional: Error Message for Props (if validation is added) */}
                                  {errors[question.id] && (
                                      <span className="mt-1 text-xxs text-red-500">
                      {errors[question.id]}
                    </span>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
          {/* Player-Specific Props */}
          {playerProps.length > 0 && (
              <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-semibold">The Baby GOAT: Bronny James</h2>
                      {/* Image to the right of the header */}
                      <img
                          src="https://fanatics.frgimages.com/los-angeles-lakers/bronny-james-los-angeles-lakers-autographed-16-x-20-stylized-photograph-with-lakeshow-inscription-limited-edition-of-12_ss5_p-202035074+u-0yqp2m3rk6yaaa5chlfk+v-wkgdfmzl4pdes9xsfgtq.jpg?_hv=2&w=900" // Replace with your image URL
                          alt="Bronny James"
                          className="w-16 h-16 rounded-full object-cover"
                      />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {playerProps.map(question => (
                          <div
                              key={question.id}
                              className="p-3 border border-gray-200 rounded-md shadow-sm flex flex-col items-center h-36" // Set fixed height
                          >
                              <div className="flex flex-col items-center justify-center h-full text-center">
                                  <label htmlFor={`question_${question.id}`}
                                         className="block text-gray-700 mb-1 text-xs sm:text-sm break-words">
                                      {question.text}
                                  </label>
                                  {renderInput(question)}
                                  {/* Display the line for Over/Under questions */}
                                  {question.question_type === 'prop_over_under' && (
                                      <span className="mt-1 text-xs italic text-gray-500">
                      Line: {question.line}
                    </span>
                                  )}
                                  {/* Point Value Display */}
                                  <span className="mt-1 text-xs italic text-gray-500 text-center">
                    {question.point_value} {question.point_value === 1 ? 'point' : 'points'}
                  </span>
                                  {/* Optional: Error Message for Props */}
                                  {errors[question.id] && (
                                      <span className="mt-1 text-xs text-red-500">
                      {errors[question.id]}
                    </span>
                                  )}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}
          {/* IST Questions */}
          {istTournamentQuestions.length > 0 && (
              <div className="mb-8">
                  <h2 className="text-2xl font-semibold mb-4">NBA Cup Predictions</h2>
                  <body>The following DOES NOT count towards your final point total
                  The winner of the NBA Cup prediction receives a supplementary pool of $50 following the Championship
                  Game
                  </body>
                  {/* Group Winners */}
                  <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-2">Group Winners</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {istTournamentQuestions.filter(q => q.prediction_type === 'group_winner').map(question => (
                              <div
                                  key={question.id}
                                  className="p-3 border border-gray-200 rounded-md shadow-sm flex flex-col items-center"
                              >
                                  <label htmlFor={`question_${question.id}`}
                                         className="block text-gray-700 mb-1 text-xs sm:text-sm text-center">
                                      {question.text}
                                  </label>
                                  {renderInput(question)}
                                  {errors[question.id] && (
                                      <span className="mt-1 text-xs text-red-500">
                        {errors[question.id]}
                      </span>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Wildcards */}
                  <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-2">Wildcards</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                          {istTournamentQuestions.filter(q => q.prediction_type === 'wildcard').map(question => (
                              <div
                                  key={question.id}
                                  className="p-3 border border-gray-200 rounded-md shadow-sm flex flex-col items-center"
                              >
                                  <label htmlFor={`question_${question.id}`}
                                         className="block text-gray-700 mb-1 text-xs sm:text-sm text-center">
                                      {question.text}
                                  </label>
                                  {renderInput(question)}
                                  {errors[question.id] && (
                                      <span className="mt-1 text-xs text-red-500">
                        {errors[question.id]}
                      </span>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Conference Winners */}
                  <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-2">Conference Winners</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                          {istTournamentQuestions.filter(q => q.prediction_type === 'conference_winner').map(question => (
                              <div
                                  key={question.id}
                                  className="p-3 border border-gray-200 rounded-md shadow-sm flex flex-col items-center"
                              >
                                  <label htmlFor={`question_${question.id}`}
                                         className="block text-gray-700 mb-1 text-xs sm:text-sm text-center">
                                      {question.text}
                                  </label>
                                  {renderInput(question)}
                                  {errors[question.id] && (
                                      <span className="mt-1 text-xs text-red-500">
                        {errors[question.id]}
                      </span>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>

                  {/* Tiebreakers */}
                  <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-2">Tiebreakers</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                          {istTournamentQuestions.filter(q => q.prediction_type === 'tiebreaker').map(question => (
                              <div
                                  key={question.id}
                                  className="p-3 border border-gray-200 rounded-md shadow-sm flex flex-col items-center"
                              >
                                  <label htmlFor={`question_${question.id}`}
                                         className="block text-gray-700 mb-1 text-xs sm:text-sm text-center">
                                      {question.text}
                                  </label>
                                  {renderInput(question)}
                                  {errors[question.id] && (
                                      <span className="mt-1 text-xs text-red-500">
                        {errors[question.id]}
                      </span>
                                  )}
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          )}
              <div className="flex justify-center">
                  <button
                      type="submit"
                      className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 transition-colors duration-150"
                  >
                      Submit Answers
                  </button>
              </div>
      </form>
  );
};

export default QuestionForm;