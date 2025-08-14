import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export default function AuthHeader() {
  return (
    <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
      <div className="flex items-center text-blue-700">
        <Globe className="w-4 h-4 mr-2" />
        <span className="text-sm font-medium">Open Access - No Login Required</span>
      </div>
    </div>
  );
}