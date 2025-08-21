import { useStats } from "@/hooks/useStats";
import { MapPin, Map, MousePointer, Globe, Trophy } from "lucide-react";

export function QuickStats() {
  const { data: stats, isLoading: statsLoading } = useStats();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h2 className="text-sm font-semibold text-addypin-dark mb-3 flex items-center">
        <Trophy className="w-4 h-4 text-addypin-cyan mr-2" />
        Quick Stats
      </h2>

      <div className="grid grid-cols-2 gap-2">
        <div className="stats-card rounded-lg p-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-addypin-cyan rounded-md flex items-center justify-center mr-2">
              <MapPin className="w-3 h-3 text-white" />
            </div>
            <div>
              <p className="text-xs font-medium text-addypin-medium">Pinned</p>
              <p className="text-sm font-bold text-addypin-dark" data-testid="text-pins-pinned">
                {statsLoading ? "..." : (stats as any)?.pinnedCount || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="stats-card rounded-lg p-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center mr-2">
              <Map className="w-3 h-3 text-gray-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-addypin-medium">Total</p>
              <p className="text-sm font-bold text-addypin-dark" data-testid="text-total-pins">
                {statsLoading ? "..." : (stats as any)?.pinsCreated || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="stats-card rounded-lg p-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-green-100 rounded-md flex items-center justify-center mr-2">
              <MousePointer className="w-3 h-3 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-addypin-medium">Clicks</p>
              <p className="text-sm font-bold text-addypin-dark" data-testid="text-links-clicked">
                {statsLoading ? "..." : (stats as any)?.linksClicked || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="stats-card rounded-lg p-2">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center mr-2">
              <Globe className="w-3 h-3 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-addypin-medium">Countries</p>
              <p className="text-sm font-bold text-addypin-dark" data-testid="text-active-countries">
                {statsLoading ? "..." : (stats as any)?.activeCountries || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Map Apps */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs font-medium text-addypin-dark mb-2 flex items-center">
          <Trophy className="w-3 h-3 text-yellow-600 mr-1" />
          Top Map Apps
        </p>
        <div className="space-y-1">
          {(statsLoading ? [] : (stats as any)?.topMapApps || []).slice(0, 3).map((app: any, index: number) => (
            <div key={app.name} className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="w-4 h-4 text-xs flex items-center justify-center bg-addypin-light rounded text-addypin-dark mr-2">
                  {index + 1}
                </span>
                <span className="text-xs text-addypin-dark">{app.name}</span>
              </div>
              <span className="text-xs font-medium text-addypin-cyan">{app.clicks}</span>
            </div>
          ))}
          {statsLoading && (
            <div className="text-sm text-addypin-medium">Loading...</div>
          )}
        </div>
      </div>
    </div>
  );
}