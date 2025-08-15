import { useStats } from "@/hooks/useStats";

export function QuickStats() {
  const { data: stats, isLoading: statsLoading } = useStats();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-addypin-dark mb-4">📊 Quick Stats</h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="stats-card rounded-lg p-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-addypin-cyan bg-opacity-10 rounded-lg flex items-center justify-center mr-3">
              📍
            </div>
            <div>
              <p className="text-xs font-medium text-addypin-medium">Pinned</p>
              <p className="text-lg font-bold text-addypin-dark" data-testid="text-pins-pinned">
                {statsLoading ? "..." : (stats as any)?.pinnedCount || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="stats-card rounded-lg p-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
              🗺️
            </div>
            <div>
              <p className="text-xs font-medium text-addypin-medium">Total</p>
              <p className="text-lg font-bold text-addypin-dark" data-testid="text-total-pins">
                {statsLoading ? "..." : (stats as any)?.pinsCreated || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="stats-card rounded-lg p-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              👆
            </div>
            <div>
              <p className="text-xs font-medium text-addypin-medium">Clicks</p>
              <p className="text-lg font-bold text-addypin-dark" data-testid="text-links-clicked">
                {statsLoading ? "..." : (stats as any)?.linksClicked || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="stats-card rounded-lg p-3">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              🌍
            </div>
            <div>
              <p className="text-xs font-medium text-addypin-medium">Countries</p>
              <p className="text-lg font-bold text-addypin-dark" data-testid="text-active-countries">
                {statsLoading ? "..." : (stats as any)?.activeCountries || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Map Apps */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm font-medium text-addypin-dark mb-3">🏆 Top Map Apps</p>
        <div className="space-y-2">
          {(statsLoading ? [] : (stats as any)?.topMapApps || []).slice(0, 3).map((app: any, index: number) => (
            <div key={app.name} className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="w-5 h-5 text-xs flex items-center justify-center bg-addypin-light rounded text-addypin-dark mr-2">
                  {index + 1}
                </span>
                <span className="text-sm text-addypin-dark">{app.name}</span>
              </div>
              <span className="text-sm font-medium text-addypin-cyan">{app.clicks}</span>
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