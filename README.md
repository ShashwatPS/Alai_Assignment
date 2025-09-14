This project is an Express-based application that integrates with Firecrawl and GetAlai to scrape website data and create AI-generated presentations. It leverages WebSockets to create slides and variants based on key website content.

## Setup

1. **Clone the Repository**

   Make sure you have cloned the repository to your local machine.

2. **Copy the Environment File**

   The project requires API keys and other credentials. Copy the sample environment file and fill in your values:
   
   ```bash
   cp .env.example .env
   ```
   
   Then open `.env` and set:
   
   - `FIRECRAWL_API_KEY` – Your Firecrawl API key.
   - `ALAI_EMAIL` – Your GetAlai email.
   - `ALAI_PASSWORD` – Your GetAlai password.
   - Optionally set `PORT` if you want a custom port (default is 3000).

3. **Install Dependencies**

   Use npm to install all required packages:
   
   ```bash
   npm install
   ```

4. **Build and Start the Application**

   The project is written in TypeScript. To compile the project and run the server, run:
   
   ```bash
   npm run dev
   ```
   
   This command runs `npx tsc` to compile the TypeScript files into the `dist` folder and then starts the server (`node dist/app.js`).

## Codebase Overview

- **/src/app.ts**  
  The main application file that sets up the Express server and configures routes.

- **/src/routes/firecrawl.ts**  
  Defines the API route (`/api/scrape`) to trigger the website scraping process.

- **/src/controllers/scrape.ts**  
  Contains the controller logic. It uses Firecrawl to scrape the website and GetAlai helpers (in `/src/helpers/getalai.ts`) to generate presentation slides.

- **/src/helpers/getalai.ts**  
  Implements functions for:
  - Fetching and caching access tokens from GetAlai.
  - Creating presentations and slides via REST API calls and WebSocket connections.
  - Managing slide variants and status.

- **/src/interfaces/Slide.ts**  
  Contains TypeScript interfaces for slides and images.

- **/src/helpers/constants.ts**  
  Provides constant values like instructions text and helper functions (e.g., for date formatting).

## API Usage

To use the scraping API, send a `POST` request to `/api/scrape` with a JSON body. Example payload:

```json
{
  "url": "https://example.com"
}
```

The controller will:
- Scrape the site using Firecrawl.
- Process the scraped content and images.
- Generate a presentation using GetAlai.
- Return a URL like `https://app.getalai.com/presentation/<presentation_id>`.

## Development

- Use `npm run dev` while you make changes. TypeScript will recompile your code and you can use tools like nodemon for automatic reloads.
- The project follows a modular structure. The GetAlai logic is separated into its own helper file, and routes/controllers are clearly defined for easy maintenance.
