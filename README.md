# Social Oracle

Social Oracle is the agentic layer that transforms how people socialize by driving social discovery through the city's hidden gems.

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

   **Frontend Environment Variables**
   
   Create a `.env.local` file in the `frontend` directory:
   ```bash
   cd frontend
   touch .env.local
   ```

   Add the following environment variables to `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   
   **Backend Environment Variables**
   
   Create a `.env` file in the `backend` directory:
   ```bash
   cd backend
   ```

   Add the following environment variables to `backend/.env`:
   ```env
   # Series Kafka Configuration
   KAFKA_BOOTSTRAP_SERVERS=your_kafka_bootstrap_servers
   KAFKA_TOPIC=your_kafka_topic
   KAFKA_CONSUMER_GROUP=your_kafka_consumer_group
   KAFKA_CLIENT_ID=your_kafka_client_id

   # SASL Authentication
   KAFKA_SASL_USERNAME=your_kafka_sasl_username
   KAFKA_SASL_PASSWORD=your_kafka_sasl_password
   KAFKA_SASL_MECHANISM=PLAIN

   # Series API Key
   SERIES_API_KEY=your_series_api_key

   # Series SMS
   SERIES_SENDER_NUMBER=your_series_sender_number

   # Supabase Configuration
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key

   # Environment
   NODE_ENV=development

   # Next.js Public Variables (if needed for backend)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   cd frontend
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
