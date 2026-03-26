## Momentum Calendar

A single-user calendar app built with Next.js, MongoDB, and DaisyUI. It lets you:

- create, edit, and delete one-time events
- track money as `spent` or `earned`
- assign a category from defaults or type your own
- mark any event as healthy or not healthy
- browse events in a monthly calendar with totals and filters

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

## Tech

- Next.js App Router
- MongoDB with Mongoose
- Tailwind CSS + DaisyUI
- date-fns
- Zod validation
# test-run
