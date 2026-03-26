## Momentum Calendar

A single-user calendar app built with Next.js, MongoDB, and DaisyUI. It lets you:

- create, edit, and delete one-time events
- track money as `spent` or `earned`
- assign a category from defaults or type your own
- mark any event as healthy or not healthy
- browse events in a monthly calendar with totals and filters
- load nicely varied sample events for demos and local testing

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create an environment file:

```bash
cp .env.example .env.local
```

3. Set `MONGODB_URI` in `.env.local`.

Example:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/calendar-app
```

4. Start the dev server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000).

## Sample Data

The local database can be populated with around 40 sample events across the next month for demo purposes.

The seeded data mix includes:

- paid jobs and freelance gigs
- errands and bills
- healthy activities
- funny and offbeat events

Recent sample entries included items like:

- `Ghostwrite speeches for the neighborhood cat mayor`
- `Try the underground ramen jazz club`
- `Buy a ridiculous lamp shaped like a shrimp`

If you want to regenerate sample data again later, run a small Mongo seed against the `Event` collection using the same schema in [src/models/Event.ts](/Users/dustyzietz/Desktop/DEMO/test-run/src/models/Event.ts).

## Tech

- Next.js App Router
- MongoDB with Mongoose
- Tailwind CSS + DaisyUI
- date-fns
- Zod validation
