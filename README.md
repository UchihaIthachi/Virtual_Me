# Virtual Harshana: talk to my 3D twin

## How it works now (Netlify)

- **Site:** the Vite + React Three Fiber app in `Frontend/`, deployed on Netlify (`netlify.toml` at the repo root sets `base = "Frontend"`).
- **Answers:** `Frontend/netlify/functions/ask.mjs` (`/api/ask`) asks my portfolio's chat (`/api/chat` on harshanalf.netlify.app), which answers only from the portfolio's own content (RAG). It asks in *voice mode*, so replies come back short and in the first person.
- **Voice + lip sync:** the browser's built-in speech (Web Speech API) speaks the reply; `src/lib/speech.js` turns the text into mouth shapes (visemes) in time with the voice. No ffmpeg, Rhubarb, ElevenLabs or Google keys needed.
- **Mood:** the function picks a facial expression and animation from the reply.

### Deploy
1. Netlify → Add new site → import this repo (settings come from `netlify.toml`).
2. Optional env vars: `RAG_URL` (default `https://harshanalf.netlify.app`), `CHAT_PARTNER_TOKEN` (same value on the portfolio site, so its rate limit counts each visitor separately).

### Docs
- [Roadmap](docs/ROADMAP.md) · [What we learned](docs/LEARNINGS.md) · [Research notes](docs/research/)

### Local
`cd Frontend && npx netlify dev` (runs the site and `/api/ask` together).

> `Backend/` is the old Express + Rhubarb version, kept for reference; the Netlify site doesn't use it.

---

# (Original) Virtual Hotel Assistant with 3D Animation and AI Chatbot

This project implements a virtual assistant with 3D animation capabilities and an AI chatbot powered by Rasa. The assistant can process text input from users, generate audio responses using Eleven Labs for text-to-speech conversion, synchronize lip movements and facial expressions using Rhubarb, and animate responses using ThreeJS.

## Features

- **3D Animation**: Utilizes ThreeJS to create immersive 3D animations for interactive user experiences.
- **Natural Language Processing**: Integrates Rasa for understanding and generating responses based on user input.
- **Text-to-Speech**: Converts generated text responses into audio using Eleven Labs.
- **Lip Sync and Facial Expressions**: Achieves realistic lip sync and facial expressions using Rhubarb.
- **Backend Processing**: Node.js backend processes user input, interfaces with Rasa, manages audio conversion, and synchronization processes.
- **Communication Flow**: Frontend sends user queries to the backend, receives processed responses (text, audio, animation), and renders them for user interaction.

## Technologies Used

- **Frontend**: React with ThreeJS
- **Backend**: Node.js
- **Natural Language Processing**: Rasa
- **Text-to-Speech**: Eleven Labs
- **Audio Conversion**: FFmpeg
- **Lip Sync**: Rhubarb

## Setup Instructions

1. **Clone Repository**:

   ```bash
   git clone <repository_url>
   cd virtual-assistant
   ```

2. **Install Dependencies**:

   ```bash
   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. **Configure Environment Variables**:

   - Set up necessary environment variables for Rasa, Eleven Labs, and any other API keys or configurations required.

4. **Start Development Servers**:

   ```bash
   # Start frontend server (in the frontend directory)
   npm start

   # Start backend server (in the backend directory)
   npm start
   ```

5. **Access the Application**:
   - Open your browser and go to `http://localhost:5173` to view the frontend application.
   - Backend server runs on `http://localhost:8000`.

## Usage

- **Development Mode**: Use `npm start` in both frontend and backend directories to run the development servers concurrently.
- **Production Deployment**: Configure your servers and build processes accordingly for deploying the frontend and backend to production environments.

## Makefile Commands

Ensure you have Make installed (`sudo apt-get install make` on Linux).

- **Install Dependencies**: `make install`
- **Start Development Servers**: `make start`
- **Start Frontend Server**: `make frontend`
- **Start Backend Server**: `make backend`
- **Clean Dependencies**: `make clean`
- **Help**: `make help`

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes.
