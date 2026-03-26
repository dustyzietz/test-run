# Momentum Calendar

Momentum Calendar is a single-user calendar app for tracking day-to-day events alongside money and wellness signals. You can add one-time entries, mark them as money spent or earned, organize them by category, and tag each one as healthy or not healthy.

## What It Does

- Browse events in a monthly calendar view
- Create, edit, and delete one-time events
- Track `spent` and `earned` amounts
- Filter by category, health status, and transaction type
- See monthly totals for earned, spent, and net
- Store data in MongoDB through Next.js route handlers

## Stack

- Next.js 16 with the App Router
- React 19
- TypeScript
- Tailwind CSS 4 + DaisyUI 5
- MongoDB + Mongoose
- Zod for request validation
- date-fns for calendar/date utilities

## Project Structure

```text
src/
  app/
    api/events/          API endpoints for event CRUD
    page.tsx             Home route
  components/
    calendar-app.tsx     Main client UI
  lib/
    db.ts                Mongo connection helpers
    events.ts            Event data access helpers
    validation.ts        Zod schema for event payloads
  models/
    Event.ts             Mongoose model
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure MongoDB

Create a local environment file and add your Mongo connection string:

```bash
cp .env.example .env.local
```

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/calendar-app
```

The app checks `MONGODB_URI` first and also supports `MONGO_URI` as a fallback.

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

Notes:

- `npm run build` uses `next build --webpack`
- `npm run start` runs the production server after a successful build

## Environment Behavior

If MongoDB is not configured:

- the app still loads
- existing events are not fetched
- create, update, and delete actions are disabled at the API layer
- the UI shows a warning that storage is unavailable

## API Routes

The app exposes the following route handlers:

- `GET /api/events`
- `POST /api/events`
- `PATCH /api/events/:id`
- `DELETE /api/events/:id`

Request payloads are validated with Zod before database writes.

## Event Shape

Each event includes:

- `title`
- `description`
- `date`
- `amount`
- `transactionType` as `spent` or `earned`
- `category`
- `isHealthy`

## Default Categories

The UI starts with these categories:

- Work
- Food
- Fitness
- Health
- Family
- Social
- Travel
- Shopping
- Bills
- Home
- Learning
- Side Hustle
