# Water Polo Platform

A local Next.js application scaffold using TypeScript and the App Router.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open the app in the browser:

```
http://localhost:3000
```

## VS Code Setup

- Recommended extensions:
  - `ESLint` (`dbaeumer.vscode-eslint`)
  - `Prettier` (`esbenp.prettier-vscode`)
- A `.vscode` workspace folder has been added with tasks and a launch config.

## Environment Variables

Create a `.env.local` file with your Supabase settings:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # required for server-side API routes
```

You can copy the example file at `.env.local.example` and fill in your real values.

## Development Flow

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start development server:
   ```bash
   npm run dev
   ```
3. Use the VS Code debug launch config: `Launch Next.js Dev Server`.

## Notes

- This project requires Node.js and npm.
- If npm is not currently available in your shell, install Node.js first and then run `npm install`.
