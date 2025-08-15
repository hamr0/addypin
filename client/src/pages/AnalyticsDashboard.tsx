import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, MapPin, Globe, TrendingUp } from "lucide-react";
import { getCountryFromCoords } from "@shared/utils";

interface AnalyticsData {
  pinsCreated: number;
  pinnedCount: number;
  linksClicked: number;
  emailsSent: number;
  activeCountries: number;
  totalPins: number;
  dailyUsers: number;
  registeredUsers: number;
  topMapApps: Array<{ name: string; clicks: number }>;
}

export default function AnalyticsDashboard() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/stats"],
    refetchInterval: 300000, // 5 minutes for dashboard
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = analytics || {
    pinsCreated: 0, pinnedCount: 0, linksClicked: 0, emailsSent: 0,
    activeCountries: 0, totalPins: 0, dailyUsers: 0, registeredUsers: 0, topMapApps: []
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">addypin Analytics</h1>
          <p className="text-xl text-gray-600">Privacy-focused location sharing insights</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pins</CardTitle>
              <MapPin className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.pinsCreated}</div>
              <p className="text-xs text-gray-600">
                {stats.pinnedCount} registered, {stats.pinsCreated - stats.pinnedCount} anonymous
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.linksClicked}</div>
              <p className="text-xs text-gray-600">Across all map services</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Countries</CardTitle>
              <Globe className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.activeCountries}</div>
              <p className="text-xs text-gray-600">Geographic reach</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Registered Users</CardTitle>
              <Users className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">{stats.registeredUsers}</div>
              <p className="text-xs text-gray-600">With permanent pins</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Map Services */}
          <Card className="bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                Most Popular Map Services
              </CardTitle>
              <CardDescription>Click distribution across mapping platforms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topMapApps.map((app, index) => (
                  <div key={app.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        #{index + 1}
                      </Badge>
                      <span className="font-medium">{app.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-gray-200 rounded-full h-2 w-24">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ 
                            width: `${Math.max(10, (app.clicks / Math.max(...stats.topMapApps.map(a => a.clicks))) * 100)}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{app.clicks}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* System Health */}
          <Card className="bg-white/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                System Performance
              </CardTitle>
              <CardDescription>Key performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Click-through Rate</span>
                  <Badge variant="outline">
                    {stats.pinsCreated > 0 ? ((stats.linksClicked / stats.pinsCreated) * 100).toFixed(1) : '0'}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Registration Rate</span>
                  <Badge variant="outline">
                    {stats.pinsCreated > 0 ? ((stats.pinnedCount / stats.pinsCreated) * 100).toFixed(1) : '0'}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Average Clicks per Pin</span>
                  <Badge variant="outline">
                    {stats.pinsCreated > 0 ? (stats.linksClicked / stats.pinsCreated).toFixed(1) : '0'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Countries per Pin</span>
                  <Badge variant="outline">
                    {stats.pinsCreated > 0 ? (stats.activeCountries / stats.pinsCreated).toFixed(1) : '0'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Privacy-focused analytics • Data updated every 5 minutes</p>
          <p className="mt-1">
            Built with addypin's custom analytics system • No cookies, no tracking
          </p>
        </div>
      </div>
    </div>
  );
}