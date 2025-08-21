import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Calendar, GitBranch, Users, Zap } from "lucide-react";

interface VersionEntry {
  version: string;
  date: string;
  type: "major" | "minor" | "patch";
  title: string;
  description: string;
  features: string[];
  improvements: string[];
  fixes: string[];
}

const versions: VersionEntry[] = [
  {
    version: "1.0.0",
    date: "2025-08-14",
    type: "major",
    title: "Initial Release",
    description: "addypin launches as a complete location sharing service with dual-format URLs and comprehensive analytics.",
    features: [
      "Interactive map with draggable pins using Leaflet.js",
      "6-character auto-generated shortcodes (ABC123 format)",
      "Dual format support: web links and email format",
      "13+ map app integrations including Google Maps, Apple Maps, Waze",
      "Real-time statistics dashboard",
      "Email integration with location sharing",
      "PostgreSQL database with analytics tracking"
    ],
    improvements: [
      "Responsive design optimized for all devices",
      "Clean, lightweight architecture",
      "Privacy-focused approach with no recent pins display"
    ],
    fixes: []
  }
];

export default function VersionPage() {
  const getTypeColor = (type: string) => {
    switch (type) {
      case "major": return "bg-red-100 text-red-800 border-red-200";
      case "minor": return "bg-blue-100 text-blue-800 border-blue-200";
      case "patch": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "major": return <Zap className="w-4 h-4" />;
      case "minor": return <GitBranch className="w-4 h-4" />;
      case "patch": return <Users className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-addypin-light">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-3" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
          
          <h1 className="text-2xl font-bold text-addypin-dark mb-2">Version History</h1>
          <p className="text-sm text-addypin-medium">
            Track the evolution of AddyPin with detailed release notes and feature updates.
          </p>
        </div>

        {/* Version Timeline */}
        <div className="space-y-4">
          {versions.map((version, index) => (
            <Card key={version.version} className="border-l-4 border-l-addypin-cyan" data-testid={`version-${version.version}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getTypeColor(version.type)} flex items-center space-x-1 text-xs`}>
                      {getTypeIcon(version.type)}
                      <span>{version.type}</span>
                    </Badge>
                    <CardTitle className="text-addypin-dark text-lg">
                      v{version.version} - {version.title}
                    </CardTitle>
                  </div>
                  <div className="flex items-center text-addypin-medium text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {version.date}
                  </div>
                </div>
                <CardDescription className="text-sm">{version.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Features */}
                  {version.features.length > 0 && (
                    <div>
                      <h4 className="font-medium text-addypin-dark mb-1 flex items-center text-sm">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        New Features
                      </h4>
                      <ul className="space-y-0.5 ml-4">
                        {version.features.map((feature, idx) => (
                          <li key={idx} className="text-addypin-medium text-xs flex items-start">
                            <span className="text-green-500 mr-2">+</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvements */}
                  {version.improvements.length > 0 && (
                    <div>
                      <h4 className="font-medium text-addypin-dark mb-1 flex items-center text-sm">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        Improvements
                      </h4>
                      <ul className="space-y-0.5 ml-4">
                        {version.improvements.map((improvement, idx) => (
                          <li key={idx} className="text-addypin-medium text-xs flex items-start">
                            <span className="text-blue-500 mr-2">↗</span>
                            {improvement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Fixes */}
                  {version.fixes.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-addypin-dark mb-2 flex items-center">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                        Bug Fixes
                      </h4>
                      <ul className="space-y-1 ml-4">
                        {version.fixes.map((fix, idx) => (
                          <li key={idx} className="text-addypin-medium text-sm flex items-start">
                            <span className="text-orange-500 mr-2">×</span>
                            {fix}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Open Source Section */}
        <div className="mt-12">
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="text-addypin-dark flex items-center">
                <GitBranch className="w-5 h-5 mr-2 text-green-500" />
                Open Source Technologies
              </CardTitle>
              <CardDescription>
                AddyPin is built with these amazing open source technologies and tools.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-addypin-dark mb-2">Frontend</h4>
                  <ul className="space-y-1 text-sm text-addypin-medium">
                    <li>• React 18 - UI library</li>
                    <li>• TypeScript - Type safety</li>
                    <li>• Vite - Build tool</li>
                    <li>• Tailwind CSS - Styling</li>
                    <li>• Leaflet.js - Interactive maps</li>
                    <li>• Wouter - Lightweight routing</li>
                    <li>• TanStack Query - State management</li>
                    <li>• shadcn/ui - Component library</li>
                    <li>• Radix UI - Accessible primitives</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-addypin-dark mb-2">Backend & Database</h4>
                  <ul className="space-y-1 text-sm text-addypin-medium">
                    <li>• Node.js - Runtime</li>
                    <li>• Express.js - Web framework</li>
                    <li>• PostgreSQL - Database</li>
                    <li>• Drizzle ORM - Type-safe queries</li>
                    <li>• Neon Database - Serverless hosting</li>
                    <li>• Zod - Schema validation</li>
                    <li>• Nodemailer - Email service</li>
                    <li>• OpenStreetMap - Geocoding API</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-addypin-dark mb-2">Connect With Us</h3>
            <p className="text-addypin-medium text-sm mb-4">
              Follow our journey and get updates on new features.
            </p>
            <div className="flex justify-center space-x-4">
              <a 
                href="https://www.linkedin.com/company/10224951/admin/products/cairenes-solutions-addypin/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-addypin-cyan hover:underline text-sm"
                data-testid="link-linkedin"
              >
                LinkedIn Company Page
              </a>
            </div>
            <p className="text-addypin-medium text-xs mt-4">
              Visit our main page to use AddyPin and see the latest features in action.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}