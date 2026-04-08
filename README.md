# RentFlow - Property Management System

Full-stack property management application with FastAPI + React + MongoDB.

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python seed_sample_data.py
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Docker
```bash
docker-compose up --build
```

## Default Login
- Email: admin@property.local
- Password: admin123

## Tech Stack
- **Backend:** Python FastAPI, Motor (async MongoDB), JWT auth
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Recharts
- **Database:** MongoDB

## Features
- Property & unit management
- Tenant management with ID proof tracking
- Lease creation & termination
- Payment recording with receipt generation
- Maintenance request tracking with priority levels
- Dashboard with occupancy & revenue analytics
- Reports with charts
