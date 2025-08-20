#!/bin/bash
# AddyPin VPS Deployment Script - Token Authentication Version
# Replace YOUR_TOKEN with your actual GitHub Personal Access Token

set -e

echo "🚀 Starting AddyPin deployment from GitHub..."
cd /opt/addypin

# Stop service
echo "Stopping AddyPin service..."
systemctl stop addypin

# Backup current deployment
echo "Creating backup..."
cp -r app app-backup-$(date +%Y%m%d-%H%M%S)

# Clone or pull latest code
if [ ! -d "addypin-repo" ]; then
    echo "Cloning repository..."
    git clone https://YOUR_TOKEN@github.com/amrhas82/addypin.git addypin-repo
else
    echo "Updating repository..."
    cd addypin-repo
    git pull origin main
    cd ..
fi

# Build production version
echo "Building application..."
cd addypin-repo
npm install
npm run build

# Deploy built files
echo "Deploying files..."
rm -rf ../app/*
cp -r dist/* ../app/
cp package.json ../app/

# Create production server.js if needed
if [ ! -f "../app/server.js" ]; then
    cat > ../app/server.js << 'EOF'
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://addypin:addypin_secure_2024@localhost:5432/addypin',
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/stats', async (req, res) => {
  try {
    const pinsResult = await pool.query('SELECT COUNT(*) as count FROM pins');
    const clicksResult = await pool.query('SELECT COUNT(*) as count FROM map_app_clicks');
    
    res.json({
      pinsCreated: parseInt(pinsResult.rows[0].count) || 0,
      pinnedCount: parseInt(pinsResult.rows[0].count) || 0,
      linksClicked: parseInt(clicksResult.rows[0].count) || 0
    });
  } catch (error) {
    res.json({ pinsCreated: 0, pinnedCount: 0, linksClicked: 0 });
  }
});

app.post('/api/pins', async (req, res) => {
  try {
    const { latitude, longitude, email } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, error: 'Latitude and longitude are required' });
    }
    
    const shortcode = nanoid(6).toUpperCase();
    
    const result = await pool.query(
      'INSERT INTO pins (shortcode, latitude, longitude, email, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [shortcode, parseFloat(latitude), parseFloat(longitude), email || null]
    );
    
    res.json({ 
      success: true, 
      shortcode, 
      pin: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create pin' });
  }
});

app.get('/api/map-links/:lat/:lng', (req, res) => {
  const { lat, lng } = req.params;
  
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  
  const mapLinks = {
    'Google Maps': `https://maps.google.com/?q=${lat},${lng}`,
    'Apple Maps': `https://maps.apple.com/?ll=${lat},${lng}`,
    'Waze': `https://waze.com/ul?ll=${lat},${lng}`,
    'HERE WeGo': `https://wego.here.com/?map=${lat},${lng},15,normal`,
    'MapQuest': `https://mapquest.com/?q=${lat},${lng}`,
    'Bing Maps': `https://bing.com/maps?cp=${lat}~${lng}`,
    'TomTom': `https://tomtom.com/#/show-map/${lng},${lat},15`,
    'Sygic Maps': `https://maps.sygic.com/location?lat=${lat}&lon=${lng}`,
    'Badger Maps': `https://badgermapping.com/map?lat=${lat}&lng=${lng}`,
    'Citymapper': `https://citymapper.com/directions?endcoord=${lat},${lng}`,
    'OpenStreetMap': `https://openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`,
    'OsmAnd': `https://osmand.net/go?lat=${lat}&lon=${lng}&z=15`,
    'Maps.me': `https://maps.me/#!/m/route?start=&destination=${lat},${lng}`
  };
  
  res.json(mapLinks);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`AddyPin server running on port ${PORT}`);
});

process.on('SIGTERM', () => {
  pool.end(() => process.exit(0));
});

process.on('SIGINT', () => {
  pool.end(() => process.exit(0));
});
EOF
fi

# Set correct permissions
chown -R addypin:addypin /opt/addypin/app

# Install production dependencies
echo "Installing production dependencies..."
cd ../app
npm install --only=production

# Start service
echo "Starting AddyPin service..."
systemctl start addypin

# Verify deployment
echo "Verifying deployment..."
sleep 3
if curl -f https://addypin.com/api/health; then
    echo ""
    echo "✅ AddyPin deployment completed successfully!"
    echo "🌐 Live at: https://addypin.com"
else
    echo "⚠️ Health check failed - check logs with: journalctl -u addypin -f"
fi