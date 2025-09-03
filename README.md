# Instagram Follower Analyzer

A full-stack web application that analyzes your Instagram follower relationships by processing your Instagram data export.

## 🚀 Features

- **Upload Instagram Data**: Drag-and-drop ZIP file upload for Instagram exports
- **Smart Analysis**: Categorizes your connections into:
  - 👥 Mutual followers (follow each other)
  - 👤 Followers only (they follow you, you don't follow back)
  - 👀 Following only (you follow them, they don't follow back)
- **Interactive Dashboard**: Visual representation of follower statistics
- **Search & Filter**: Find specific users across all categories
- **Export Results**: Download analysis as CSV
- **Privacy-Focused**: Session-based analysis with no permanent data storage

## 🛠 Tech Stack

### Backend
- Node.js + Express.js
- SQLite database
- Multer for file uploads
- JSZip for ZIP processing

### Frontend
- React.js
- Tailwind CSS
- Axios for API calls
- React Dropzone for file uploads
- Lucide React for icons

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/tushrpal0/instagram-follower-analyzer.git
   cd instagram-follower-analyzer
   ```

2. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install Frontend Dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start the Backend Server**
   ```bash
   cd ../backend
   npm start
   ```

5. **Start the Frontend Development Server**
   ```bash
   cd ../frontend
   npm start
   ```

6. **Access the Application**
   Open your browser and navigate to `http://localhost:3000`

## 📱 How to Use

1. **Export Instagram Data**
   - Go to Instagram Settings > Security > Download Data
   - Request a download of your data
   - Download the ZIP file when ready

2. **Upload to Analyzer**
   - Drag and drop your Instagram export ZIP file
   - Wait for processing to complete

3. **View Analysis**
   - Browse different follower categories
   - Search for specific users
   - Export results as needed

## 🔧 API Endpoints

- `POST /api/upload` - Upload and process Instagram ZIP file
- `GET /api/analysis/:sessionId` - Retrieve analysis results
- `GET /api/search/:sessionId` - Search within results

## 🚀 Deployment

### Using Docker

```bash
# Build and run with Docker Compose
docker-compose up --build
```

### Manual Deployment

1. Set environment variables for production
2. Build the frontend: `npm run build`
3. Start the backend in production mode
4. Serve the built frontend files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This tool is for personal use only. It processes Instagram data locally and does not store your data permanently. Always follow Instagram's Terms of Service when using your data.