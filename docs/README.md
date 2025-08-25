# addypin 📍

> The simplest way to share locations across all map apps

addypin is a lightweight, open-source location sharing service that generates short, memorable links for GPS coordinates. Share any location via web links (`ABC123.addypin.com`) or email format (`ABC123@addypin.com`) that work with 13+ popular map applications.

<!-- Trigger deployment after VPS cleanup -->

## ✨ Features

- 🗺️ **Interactive Map**: Drag and drop pins on OpenStreetMap
- 🔗 **Dual Format Links**: Web links and email-style addresses
- 📱 **13+ Map Apps**: Google Maps, Apple Maps, Waze, HERE WeGo, and more
- 📊 **Real-time Analytics**: Track usage, countries, and engagement
- 📧 **Email Integration**: Send coordinates directly to any email
- 🔒 **Privacy Focused**: No tracking of personal data
- ⚡ **Lightning Fast**: Optimized for performance and mobile
- 🆓 **Completely Free**: Open source with no usage limits

## 🚀 Quick Start

### Development

```bash
# Clone the repository
git clone https://github.com/yourusername/addypin.git
cd addypin

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the database
npm run db:push

# Start development server
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) in your browser.

### Production Deployment

AddyPin is currently live at **[https://addypin.com](https://addypin.com)**

See [docs/deployment/](./docs/deployment/) for complete deployment guides and VPS setup instructions.

## 🌍 Supported Map Apps

AddyPin works with all major mapping services:

| Service | Mobile | Desktop | Navigation |
|---------|---------|---------|------------|
| Google Maps | ✅ | ✅ | ✅ |
| Apple Maps | ✅ | ✅ | ✅ |
| Waze | ✅ | ✅ | ✅ |
| HERE WeGo | ✅ | ✅ | ✅ |
| MapQuest | ✅ | ✅ | ✅ |
| Maps.me | ✅ | ✅ | ✅ |
| OpenStreetMap | ✅ | ✅ | - |
| Bing Maps | ✅ | ✅ | - |
| TomTom | ✅ | ✅ | ✅ |
| Citymapper | ✅ | ✅ | ✅ |
| OsmAnd | ✅ | ✅ | ✅ |
| Sygic Maps | ✅ | ✅ | ✅ |
| Badger Maps | ✅ | ✅ | - |

## 🛠️ Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Maps**: Leaflet.js with OpenStreetMap
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Drizzle ORM  
- **Email**: Resend API for reliable delivery
- **Analytics**: Custom privacy-focused tracking
- **Infrastructure**: VPS deployment with SSL (92.75% cost savings)

## 📚 API Documentation

### Create addypin
```javascript
POST /api/pins
{
  "latitude": "52.247904",
  "longitude": "4.761194"
}
```

### Get Pin
```javascript
GET /api/pins/:shortcode
```

### Get Map Links
```javascript
GET /api/map-links/:lat/:lng
```

### Send Email
```javascript
POST /api/send-location
{
  "email": "user@example.com",
  "latitude": "52.247904",
  "longitude": "4.761194",
  "shortcode": "ABC123"
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/addypin

# Email Service
RESEND_API_KEY=re_your_api_key_here

# Application
NODE_ENV=development
PORT=5000
```

### Email Setup

AddyPin uses [Resend](https://resend.com) for reliable email delivery:

1. **Sign up for Resend** (free tier available)
2. **Get your API key** from the Resend dashboard  
3. **Set `RESEND_API_KEY`** in your environment variables
4. **Configure domain** (optional) for branded emails

## 📊 Analytics

AddyPin includes comprehensive analytics:

- **Real-time Stats**: Pins created, links clicked, active countries
- **Daily Reports**: Automated email reports
- **Privacy Focused**: No personal data collection
- **Geographic Insights**: Country-based usage patterns

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📖 Use Cases

- **Event Planning**: Share meeting locations with attendees
- **Travel**: Send points of interest to travel companions
- **Business**: Share office locations with clients
- **Emergency**: Quickly share precise locations
- **Social**: Share cool spots with friends across different apps

## 🔒 Privacy & Security

- No tracking of personal information
- No storage of user locations after sharing
- Optional email functionality
- Open source and transparent
- GDPR compliant by design

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenStreetMap for free map tiles
- Leaflet.js for excellent mapping library
- All the mapping service providers
- The open source community

---

**Made with ❤️ for the open source community**

[Website](https://addypin.com) • [Documentation](./docs) • [Issues](https://github.com/yourusername/addypin/issues) • [Discussions](https://github.com/yourusername/addypin/discussions)