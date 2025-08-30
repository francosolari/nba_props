"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { ChevronDown, ChevronUp, Trophy, TrendingUp, Target, Award, Users, Star } from "lucide-react"

// Mock data for the leaderboard
const leaderboardData = [
  {
    id: 1,
    rank: 1,
    username: "CourtVision23",
    avatar: "/placeholder.svg?height=40&width=40",
    totalPoints: 2847,
    accuracy: 78,
    categories: {
      "Regular Season Standings": {
        points: 890,
        maxPoints: 1200,
        predictions: [
          { question: "Lakers will finish top 4 in West", correct: true, points: 150 },
          { question: "Celtics will win Atlantic Division", correct: true, points: 120 },
          { question: "Warriors miss playoffs", correct: false, points: 0 },
          { question: "Nuggets finish 1st seed", correct: true, points: 200 },
        ],
      },
      "Player Awards": {
        points: 720,
        maxPoints: 900,
        predictions: [
          { question: "Jokic wins MVP", correct: true, points: 300 },
          { question: "Wembanyama wins ROTY", correct: true, points: 250 },
          { question: "Smart wins DPOY", correct: false, points: 0 },
        ],
      },
      "Props & Yes/No": {
        points: 1237,
        maxPoints: 1500,
        predictions: [
          { question: "LeBron averages 25+ PPG", correct: true, points: 100 },
          { question: "Curry makes 300+ threes", correct: true, points: 150 },
          { question: "Giannis plays 70+ games", correct: false, points: 0 },
          { question: "Tatum scores 50+ in a game", correct: true, points: 120 },
        ],
      },
    },
  },
  {
    id: 2,
    rank: 2,
    username: "HoopsMaster",
    avatar: "/placeholder.svg?height=40&width=40",
    totalPoints: 2756,
    accuracy: 74,
    categories: {
      "Regular Season Standings": {
        points: 1050,
        maxPoints: 1200,
        predictions: [
          { question: "Lakers will finish top 4 in West", correct: true, points: 150 },
          { question: "Celtics will win Atlantic Division", correct: true, points: 120 },
          { question: "Warriors miss playoffs", correct: true, points: 180 },
          { question: "Nuggets finish 1st seed", correct: false, points: 0 },
        ],
      },
      "Player Awards": {
        points: 550,
        maxPoints: 900,
        predictions: [
          { question: "Jokic wins MVP", correct: false, points: 0 },
          { question: "Wembanyama wins ROTY", correct: true, points: 250 },
          { question: "Smart wins DPOY", correct: true, points: 300 },
        ],
      },
      "Props & Yes/No": {
        points: 1156,
        maxPoints: 1500,
        predictions: [
          { question: "LeBron averages 25+ PPG", correct: true, points: 100 },
          { question: "Curry makes 300+ threes", correct: false, points: 0 },
          { question: "Giannis plays 70+ games", correct: true, points: 130 },
          { question: "Tatum scores 50+ in a game", correct: true, points: 120 },
        ],
      },
    },
  },
  {
    id: 3,
    rank: 3,
    username: "BallIQ_Pro",
    avatar: "/placeholder.svg?height=40&width=40",
    totalPoints: 2689,
    accuracy: 71,
    categories: {
      "Regular Season Standings": {
        points: 920,
        maxPoints: 1200,
        predictions: [
          { question: "Lakers will finish top 4 in West", correct: false, points: 0 },
          { question: "Celtics will win Atlantic Division", correct: true, points: 120 },
          { question: "Warriors miss playoffs", correct: true, points: 180 },
          { question: "Nuggets finish 1st seed", correct: true, points: 200 },
        ],
      },
      "Player Awards": {
        points: 800,
        maxPoints: 900,
        predictions: [
          { question: "Jokic wins MVP", correct: true, points: 300 },
          { question: "Wembanyama wins ROTY", correct: true, points: 250 },
          { question: "Smart wins DPOY", correct: true, points: 250 },
        ],
      },
      "Props & Yes/No": {
        points: 969,
        maxPoints: 1500,
        predictions: [
          { question: "LeBron averages 25+ PPG", correct: false, points: 0 },
          { question: "Curry makes 300+ threes", correct: true, points: 150 },
          { question: "Giannis plays 70+ games", correct: false, points: 0 },
          { question: "Tatum scores 50+ in a game", correct: false, points: 0 },
        ],
      },
    },
  },
]

const categoryIcons = {
  "Regular Season Standings": Trophy,
  "Player Awards": Award,
  "Props & Yes/No": Target,
}

export default function LeaderboardPage() {
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState<number>(20) // Default to showing 20 players initially

  const toggleUserExpansion = (userId: number) => {
    const newExpanded = new Set(expandedUsers)
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId)
    } else {
      newExpanded.add(userId)
    }
    setExpandedUsers(newExpanded)
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />
    if (rank === 2) return <Star className="w-5 h-5 text-gray-400" />
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />
    return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold">{rank}</span>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">NBA Predictions Leaderboard</h1>
          <p className="text-slate-300 text-lg">Track your predictions and compete with other fans</p>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">1,247</div>
                <div className="text-slate-400">Total Players</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <Target className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">156</div>
                <div className="text-slate-400">Total Predictions</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">73%</div>
                <div className="text-slate-400">Avg Accuracy</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Leaderboard */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Season Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-2">
              {leaderboardData.slice(0, visibleCount).map((user) => (
                <div key={user.id} className="border-b border-slate-700 last:border-b-0">
                  {/* Main Row */}
                  <div
                    className="p-4 hover:bg-slate-700/30 transition-colors cursor-pointer"
                    onClick={() => toggleUserExpansion(user.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                          {getRankIcon(user.rank)}
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={user.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-white">{user.username}</div>
                            <div className="text-sm text-slate-400">Accuracy: {user.accuracy}%</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">{user.totalPoints.toLocaleString()}</div>
                          <div className="text-sm text-slate-400">Total Points</div>
                        </div>

                        <div className="flex items-center gap-2">
                          {Object.entries(user.categories).map(([category, data]) => {
                            const percentage = (data.points / data.maxPoints) * 100
                            return (
                              <div key={category} className="text-center">
                                <div className="text-xs text-slate-400 mb-1">{category.split(" ")[0]}</div>
                                <div className="w-12 h-2 bg-slate-600 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                                <div className="text-xs text-white mt-1">{data.points}</div>
                              </div>
                            )
                          })}
                        </div>

                        {expandedUsers.has(user.id) ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedUsers.has(user.id) && (
                    <div className="px-4 pb-4 bg-slate-800/30">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {Object.entries(user.categories).map(([categoryName, categoryData]) => {
                          const IconComponent = categoryIcons[categoryName as keyof typeof categoryIcons]
                          const percentage = (categoryData.points / categoryData.maxPoints) * 100

                          return (
                            <Card key={categoryName} className="bg-slate-700/50 border-slate-600">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm text-white flex items-center gap-2">
                                  <IconComponent className="w-4 h-4" />
                                  {categoryName}
                                </CardTitle>
                                <div className="flex items-center justify-between">
                                  <span className="text-lg font-bold text-white">
                                    {categoryData.points}/{categoryData.maxPoints}
                                  </span>
                                  <Badge variant="secondary" className="bg-slate-600">
                                    {percentage.toFixed(0)}%
                                  </Badge>
                                </div>
                                <Progress value={percentage} className="h-2" />
                              </CardHeader>
                              <CardContent className="pt-0">
                                <div className="space-y-2">
                                  {categoryData.predictions.map((prediction, idx) => (
                                    <div
                                      key={idx}
                                      className={`p-2 rounded text-sm flex items-center justify-between ${
                                        prediction.correct
                                          ? "bg-green-900/30 border border-green-700/50"
                                          : "bg-red-900/30 border border-red-700/50"
                                      }`}
                                    >
                                      <span className="text-white text-xs">{prediction.question}</span>
                                      <div className="flex items-center gap-2">
                                        <Badge
                                          variant={prediction.correct ? "default" : "destructive"}
                                          className="text-xs"
                                        >
                                          {prediction.correct ? "✓" : "✗"}
                                        </Badge>
                                        <span className="text-white font-semibold text-xs">+{prediction.points}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Load More */}
        {visibleCount < leaderboardData.length && (
          <div className="text-center">
            <Button 
              variant="outline" 
              className="bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
              onClick={() => setVisibleCount(prevCount => prevCount + 20)} // Show 20 more players when clicked
            >
              Load More Players
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
