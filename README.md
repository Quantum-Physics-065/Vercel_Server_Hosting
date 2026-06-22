# ⚡ FileFlow Server

<div align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&size=22&pause=800&color=7C3AED&center=true&vCenter=true&width=700&lines=Fast+file+storage+API;Chunked+uploads+for+large+files;Smooth+dashboard+experience;Ready+for+Vercel+deployment" alt="animated banner" />
</div>

<div align="center">
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Vercel-Deployment-000000?logo=vercel&logoColor=white" />
  <img src="https://img.shields.io/badge/Upload-Chunked%20%2B%20Bulk-22C55E" />
</div>

<p align="center">
  A sleek file-serving and request-management server with a polished dashboard, resilient API responses, and efficient upload handling.
</p>

## ✨ Highlights

- 🚀 Fast local and cloud deployment support
- 📦 Chunked uploads for large files
- 🧺 Bulk upload workflow for multiple files
- 🛡️ Better error handling with clean 500 responses
- 📊 Live storage stats and optimized dashboards
- 🔐 Token-based request upload/download support

## 🧩 Feature Flow

```text
Client Request
   ↓
Rate Limiting + CORS validation
   ↓
Chunk / Bulk / Single Upload Handler
   ↓
Storage Service
   ↓
Response + Dashboard Status Update
```

## 🔧 Quick Start

```bash
npm install
npm run start
```

Then open:
- http://localhost:6000/dashboard
- http://localhost:6000/api/health

## 📁 API Snapshot

| Endpoint | Method | Purpose |
|---|---:|---|
| `/api/health` | GET | Health check |
| `/api/status` | GET | Server and storage info |
| `/file` | POST | Upload a file |
| `/file/chunk` | POST | Upload file in chunks |
| `/file/bulk` | POST | Upload multiple files |
| `/files` | GET | List files |
| `/token/:token/upload` | POST | Upload via token |

## 🌐 Vercel Notes

- The server is configured to use the Vercel entrypoint at [api/index.js](api/index.js).
- Startup script casing was corrected to avoid deployment issues caused by incorrect entrypoint names.
- The app now returns consistent JSON error payloads for 404/500 responses.

## 🎨 Animated UI Preview

<div align="center">
  <img width="100%" alt="dashboard preview" src="https://github.com/user-attachments/assets/fad0bd4a-73ae-49be-83bd-240a19c68b55" />
</div>

## 🧠 Why this version is smoother

- Streaming responses avoid unnecessary buffering for large downloads.
- Chunked uploads reduce memory pressure during large transfers.
- Better progress feedback makes the UI feel more responsive.
- Added health checks and clearer API responses improve reliability.

## 🤝 Contribution

Feel free to fork, improve, and submit PRs if you want to add more storage features or UI polish.

