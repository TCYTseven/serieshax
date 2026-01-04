# Social Oracle

Social Oracle is the agentic layer that transforms how people socialize by driving social discovery through the city's hidden gems.
**Demo Video**: https://youtu.be/daIanfRRzvQ

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- A Supabase account and project (or use the provided credentials)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/TCYTseven/serieshax
   cd serieshackathon
   ```

2. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the `frontend` directory:
   ```bash
   cd frontend
   touch .env.local
   ```

   Add the following environment variables to `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

## 📁 Project Structure

```
serieshackathon/
├── frontend/                 # Next.js frontend application
│   ├── app/                  # Next.js app directory
│   │   ├── home/            # Main application page
│   │   ├── business-partner/ # Business partner page
│   │   ├── dashboard/       # Business dashboard
│   │   └── event-results/   # Event results page
│   ├── components/          # React components
│   │   └── onboarding/     # Onboarding flow components
│   ├── contexts/           # React context providers
│   ├── lib/                # Utility functions and services
│   └── .env.local         # Environment variables (create this)
├── backend/                # Backend services (Kafka, etc.)
└── README.md              # This file
```

## 🛠️ Technologies Used

### Frontend
- **Next.js 15** - React framework with App Router
- **HeroUI v2** - Component library
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Supabase** - Authentication and database
- **TypeScript** - Type safety
- **Recharts** - Data visualization

### Backend
- **Supabase** - PostgreSQL database and authentication
- **Kafka** - Event streaming (backend)
