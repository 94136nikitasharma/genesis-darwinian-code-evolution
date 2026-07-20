# GENESIS — Darwinian Code Evolution Engine

GENESIS is a web application that applies biological evolution to code. Powered by OpenAI gpt-4o-mini, it breeds, mutates, and evolves optimal algorithms through natural selection. Watch code organisms compete, crossover, and mutate in real-time to discover solutions no human would write.

Created for the **OpenAI Build Week 2026** (Developer Tools track).

## Features

- **AI Mutation Engine:** Uses OpenAI gpt-4o-mini to intelligently mutate and recombine JavaScript functions.
- **Darwinian Selection:** Evaluates code organisms based on correctness (unit tests) and performance (execution time).
- **Interactive Visualization:** D3.js force-directed graph to visualize population relationships, ancestry, and fitness in real-time.
- **Live Code Inspector:** Click on any organism to view its source code, syntax highlighting, and test execution details.
- **Problem Library:** Preset algorithms to evolve (Sorting, Fibonacci, String Matching, Flattening) with varying difficulty.
- **Dark Glassmorphism UI:** Stunning aesthetic optimized for developer experience with animations and neon glow effects.

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd genesis
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment setup:**
   Create a `.env.local` file in the root directory and add your OpenAI API key (or you can paste it directly into the UI when running the app):
   ```
   OPENAI_API_KEY=sk-your_api_key_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open the app:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## How it Works

1. **Initialization:** GENESIS requests GPT to generate a diverse initial population of JavaScript functions attempting to solve the selected problem.
2. **Evaluation:** Each function runs in isolated browser execution with timeout and is evaluated against test cases. A correctness-first fitness score (0.0 to 1.2) rewards verified performance only after all tests pass.
3. **Selection:** The top performers ("elites") are preserved for the next generation.
4. **Crossover & Mutation:** The remaining slots in the new generation are filled by:
   - **Crossover (🧬):** Combining the best traits of two high-performing parent functions.
   - **Mutation (⚡):** Intelligently modifying a parent function to optimize it, fix bugs, or try new logic.
   - **Novel (✨):** Generating completely new approaches to maintain genetic diversity and avoid local maxima.
5. **Iteration:** The cycle repeats for the configured number of generations while retaining high-fitness candidates and exploring new variants.

## Technologies Used
- Next.js (App Router)
- React
- D3.js (Force graphs)
- OpenAI API (gpt-4o-mini)
- Vanilla CSS (CSS Modules with CSS Variables for Design System)

## License
MIT
