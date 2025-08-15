import Logo from "@/components/Logo";
import { Link } from "wouter";
import { MapPin, Globe, Share, Clock, Shield, Smartphone } from "lucide-react";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Logo />
            </Link>
            <div className="flex items-center space-x-6">
              <nav className="hidden md:flex space-x-6">
                <Link href="/" className="text-addypin-medium hover:text-addypin-dark transition-colors">
                  Home
                </Link>
                <span className="text-addypin-cyan font-medium">Features</span>
                <a href="#" className="text-addypin-medium hover:text-addypin-dark transition-colors">
                  API
                </a>
                <a href="#contact" className="text-addypin-medium hover:text-addypin-dark transition-colors">
                  Help
                </a>
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-addypin-dark mb-6">
            Features that make location sharing simple
          </h1>
          <p className="text-xl text-addypin-medium mb-8">
            AddyPin transforms complex GPS coordinates into memorable, shareable links that work everywhere.
          </p>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Interactive Map */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="w-12 h-12 bg-addypin-cyan bg-opacity-10 rounded-xl flex items-center justify-center mb-6">
                <MapPin className="w-6 h-6 text-addypin-cyan" />
              </div>
              <h3 className="text-xl font-semibold text-addypin-dark mb-4">Interactive Map</h3>
              <ul className="space-y-2 text-addypin-medium">
                <li>• Click anywhere to create instant pins</li>
                <li>• Drag pins to adjust coordinates precisely</li>
                <li>• Built on OpenStreetMap for accuracy</li>
                <li>• Real-time coordinate display</li>
                <li>• Works on mobile, tablet, and desktop</li>
              </ul>
            </div>

            {/* Short Memorable Links */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                <Share className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-addypin-dark mb-4">Short Memorable Links</h3>
              <ul className="space-y-2 text-addypin-medium">
                <li>• 6-character codes like ABC123</li>
                <li>• Two formats: ABC123.addypin.com</li>
                <li>• Email style: ABC123@addypin.com</li>
                <li>• Easy to remember and share</li>
                <li>• No complex GPS coordinates to copy</li>
              </ul>
            </div>

            {/* Universal Map Apps */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-addypin-dark mb-4">Universal Map Apps</h3>
              <ul className="space-y-2 text-addypin-medium">
                <li>• Works with Google Maps, Apple Maps</li>
                <li>• Supports Waze, HERE WeGo, MapQuest</li>
                <li>• Includes OpenStreetMap, Bing Maps</li>
                <li>• One-click access to any map app</li>
                <li>• Automatically generates proper URLs</li>
              </ul>
            </div>

            {/* Smart Expiration */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-addypin-dark mb-4">Smart Expiration</h3>
              <ul className="space-y-2 text-addypin-medium">
                <li>• No email = 72-hour auto-deletion</li>
                <li>• With email = permanent storage</li>
                <li>• Prevents database clutter</li>
                <li>• Automatic cleanup system</li>
                <li>• Perfect for temporary sharing</li>
              </ul>
            </div>

            {/* Secure Editing */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-addypin-dark mb-4">Secure Editing</h3>
              <ul className="space-y-2 text-addypin-medium">
                <li>• OTP-based email verification</li>
                <li>• Edit coordinates anytime</li>
                <li>• No password requirements</li>
                <li>• Secure 6-digit verification codes</li>
                <li>• Full control over your pins</li>
              </ul>
            </div>

            {/* Mobile Optimized */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                <Smartphone className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-addypin-dark mb-4">Mobile Optimized</h3>
              <ul className="space-y-2 text-addypin-medium">
                <li>• Touch-friendly map interface</li>
                <li>• Responsive design for all screens</li>
                <li>• GPS location detection</li>
                <li>• Fast loading on mobile networks</li>
                <li>• Works in any mobile browser</li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* Privacy & Analytics */}
      <section className="bg-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-addypin-dark mb-4">
              Privacy & Analytics
            </h2>
            <p className="text-lg text-addypin-medium">
              Built with privacy in mind, powered by smart analytics
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-50 rounded-xl p-8">
              <h3 className="text-xl font-semibold text-addypin-dark mb-4">Privacy First</h3>
              <ul className="space-y-2 text-addypin-medium">
                <li>• No recent pins display for privacy</li>
                <li>• Optional email storage only</li>
                <li>• No tracking without consent</li>
                <li>• Automatic data cleanup</li>
                <li>• Minimal data collection</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-8">
              <h3 className="text-xl font-semibold text-addypin-dark mb-4">Smart Analytics</h3>
              <ul className="space-y-2 text-addypin-medium">
                <li>• Real-time usage statistics</li>
                <li>• Popular map app tracking</li>
                <li>• Country usage insights</li>
                <li>• Performance monitoring</li>
                <li>• Anonymous usage patterns</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* DDoS Protection */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-addypin-dark mb-8">
            Enterprise-Grade Protection
          </h2>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h3 className="text-xl font-semibold text-addypin-dark mb-6">Advanced Security Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <ul className="space-y-2 text-addypin-medium">
                <li>• IP-based rate limiting (5 pins/hour, 15/day)</li>
                <li>• Multi-layer bot protection</li>
                <li>• User agent filtering</li>
                <li>• Honeypot field detection</li>
              </ul>
              <ul className="space-y-2 text-addypin-medium">
                <li>• Request timing analysis</li>
                <li>• Real-time security monitoring</li>
                <li>• Automated threat blocking</li>
                <li>• Comprehensive security logging</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-addypin-dark py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to simplify location sharing?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Start creating memorable location links in seconds
          </p>
          <Link 
            href="/"
            className="inline-block bg-addypin-cyan hover:bg-cyan-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Start Creating Pins
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Logo />
            <p className="text-sm text-addypin-medium">© 2025 AddyPin. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}