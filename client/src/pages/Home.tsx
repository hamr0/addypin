import { useState } from "react";
import { Link } from "wouter";
import MapSection from "@/components/MapSection";
import Sidebar from "@/components/Sidebar";
import Logo from "@/components/Logo";
import { EditModal } from "@/components/EditModal";
import { UserPinsList } from "@/components/UserPinsList";
import { QuickStats } from "@/components/QuickStats";
import { ContactForm } from "@/components/ContactForm";
import type { Pin } from "@shared/schema";

export default function Home() {
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [generatedLink, setGeneratedLink] = useState<{ webLink: string; emailLink: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPin, setEditingPin] = useState<Pin | undefined>();
  const [isEditing, setIsEditing] = useState(false);
  const [originalCoordinates, setOriginalCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Logo />
            <div className="flex items-center space-x-6">
              <nav className="hidden md:flex space-x-6">
                <Link href="/features" className="text-addypin-medium hover:text-addypin-dark transition-colors">
                  Features
                </Link>
                <a href="#" className="text-addypin-medium hover:text-addypin-dark transition-colors">
                  API
                </a>
                <a href="#contact" className="text-addypin-medium hover:text-addypin-dark transition-colors">
                  Help
                </a>
              </nav>

            </div>
            <button className="md:hidden text-addypin-medium" data-testid="mobile-menu">
              <i className="fas fa-bars text-xl"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <MapSection 
              coordinates={coordinates}
              onCoordinatesChange={setCoordinates}
              generatedLink={generatedLink}
              editingPin={editingPin}
              isEditing={isEditing}
              onEditComplete={(newCoords) => {
                if (editingPin && newCoords) {
                  // Save the new coordinates
                  setCoordinates(newCoords);
                  setIsEditing(false);
                  setEditingPin(undefined);
                  // Clear the generated link to avoid confusion
                  setGeneratedLink(null);
                }
              }}
            />
          </div>
          <div className="space-y-4">
            <QuickStats />
            <Sidebar 
              coordinates={coordinates}
              generatedLink={generatedLink}
              onLinkGenerated={setGeneratedLink}
              isMapWidth={false}
            />
            <UserPinsList
              onPinSelect={(pin) => {
                // Reset editing state when selecting a new pin
                setIsEditing(false);
                setEditingPin(pin);
                setOriginalCoordinates({
                  lat: Number(pin.latitude),
                  lng: Number(pin.longitude)
                });
                setCoordinates({
                  lat: Number(pin.latitude),
                  lng: Number(pin.longitude)
                });
                // Clear any existing generated link
                setGeneratedLink(null);
              }}
              onStartEditing={() => {
                setIsEditing(true);
                // Force immediate UI update
                setCoordinates(prevCoords => prevCoords ? {...prevCoords} : prevCoords);
              }}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="col-span-1 md:col-span-2">
              <div className="mb-2">
                <Logo />
              </div>
              <p className="text-addypin-medium text-xs">
                The simplest way to share locations across all map apps. 
                Open source and privacy-focused.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-addypin-dark mb-2 text-sm">Resources</h3>
              <ul className="space-y-1 text-xs text-addypin-medium">
                <li><Link href="/features" className="hover:text-addypin-cyan transition-colors">Features</Link></li>
                <li><a href="#" className="hover:text-addypin-cyan transition-colors">API Documentation</a></li>
                <li><Link href="/versions" className="hover:text-addypin-cyan transition-colors" data-testid="link-version-history-footer">Version History</Link></li>
                <li><a href="#" className="hover:text-addypin-cyan transition-colors">Help Center</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-addypin-dark mb-2 text-sm">Legal</h3>
              <ul className="space-y-1 text-xs text-addypin-medium">
                <li><a href="#" className="hover:text-addypin-cyan transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-addypin-cyan transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-addypin-cyan transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between items-center">
            <p className="text-xs text-addypin-medium flex items-center">
              © 2025 addypin
              <a 
                href="https://www.linkedin.com/company/10224951/admin/products/cairenes-solutions-addypin/"
                target="_blank"
                rel="noopener noreferrer"
                className="ml-3 text-addypin-medium hover:text-addypin-cyan transition-colors"
                data-testid="link-linkedin-home"
              >
                <i className="fab fa-linkedin text-sm"></i>
              </a>
            </p>
          </div>
        </div>
      </footer>
      
      <EditModal 
        isOpen={showEditModal} 
        onClose={() => setShowEditModal(false)}
        onPinSelect={(pin) => {
          setEditingPin(pin);
          setOriginalCoordinates({
            lat: Number(pin.latitude),
            lng: Number(pin.longitude)
          });
          setCoordinates({
            lat: Number(pin.latitude),
            lng: Number(pin.longitude)
          });
        }}
        onStartEditing={() => {
          setIsEditing(true);
        }}
      />
    </div>
  );
}
