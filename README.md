# sportsedge-terminal

SportsEdge Markets terminal frontend.

## Run locally

```sh
npm install
npm run dev
```

Local routes:

- `http://127.0.0.1:3000/` dashboard / operational news console
- `http://127.0.0.1:3000/#login` login screen
- `http://127.0.0.1:3000/#simple-news` simple news screen

## Environment

Copy `.env.local.example` to `.env.local` for local development when the Vite
news proxy needs direct database access. Do not commit `.env.local`.
