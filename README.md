# AddyPin 📍

> The simplest way to share locations across all map apps

AddyPin is a lightweight, open-source location sharing service that generates short, memorable links for GPS coordinates. Share any location via web links (`ABC123.addypin.com`) or email format (`ABC123@addypin.com`) that work with 13+ popular map applications.

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

See [DOMAIN_SETUP.md](./DOMAIN_SETUP.md) for complete deployment instructions.

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

- **Frontend**: React + TypeScript + Tailwind CSS
- **Maps**: Leaflet.js with OpenStreetMap
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Drizzle ORM
- **Email**: Nodemailer (SMTP)
- **Analytics**: Custom tracking system

## 📚 API Documentation

### Create Pin
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

# Email (optional)
EMAIL_USER=your@gmail.com
EMAIL_PASS=your-app-password

# Application
NODE_ENV=development
PORT=5000
```

### Email Setup

For email functionality, you can use:

1. **Gmail** (recommended for development):
   - Create App Password in Gmail settings
   - Set `EMAIL_USER` and `EMAIL_PASS`

2. **Custom SMTP**:
   - Modify `server/services/email.ts`
   - Configure your SMTP settings

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