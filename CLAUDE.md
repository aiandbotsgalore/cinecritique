# CLAUDE.md - AI Assistant Guide for CineCritique AI

## Project Overview

**CineCritique AI** is a professional music video analysis tool powered by Google's Gemini AI. It provides director-level critique, visual timelines, and AI-powered fix generation for music videos.

### Core Features
- Video upload and analysis using Gemini 3 Pro Preview
- Frame-by-frame critique with timestamped feedback
- Visual intensity timeline chart
- Context-aware chat assistant for creative guidance
- Image Studio for visualizing fixes (Imagen 4 for generation, Gemini 2.5 Flash Image for editing)
- Interactive video player with timeline navigation

### Technology Stack
- **Frontend**: React 19.2.0 with TypeScript 5.8.2
- **Build Tool**: Vite 6.2.0
- **AI/ML**: Google Gemini API (@google/genai 1.30.0)
- **Styling**: Tailwind CSS (via CDN)
- **Charts**: Recharts 3.4.1
- **Icons**: Lucide React 0.554.0

## Architecture & Directory Structure

```
cinecritique/
├── App.tsx                    # Main application component
├── index.tsx                  # React entry point
├── index.html                 # HTML template with Tailwind CDN
├── types.ts                   # TypeScript type definitions
├── components/                # React components
│   ├── TimelineChart.tsx      # Visual timeline visualization
│   ├── ChatInterface.tsx      # AI chat assistant UI
│   └── ImageStudio.tsx        # Image generation/editing modal
├── services/                  # API integration services
│   └── geminiService.ts       # Gemini API wrapper
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite build configuration
├── metadata.json              # Project metadata
└── README.md                  # User-facing documentation
```

## Key Files Deep Dive

### App.tsx (lines 1-302)
The main application component orchestrating the entire UI.

**Key Responsibilities**:
- Video file upload and management
- Analysis workflow coordination
- Video player controls and state
- Tab navigation (Overview/Details)
- Modal management for Image Studio
- Frame capture for image editing

**State Management**:
- `video`: Uploaded video data (file, URL, mime type)
- `critique`: Analysis results from Gemini
- `isAnalyzing`: Loading state during analysis
- `currentTime`: Video playback position
- `activeTab`: Current view ('overview' | 'details')
- `isStudioOpen`: Image Studio modal visibility

**Important Functions**:
- `handleFileUpload()`: Processes video file selection
- `runAnalysis()`: Triggers Gemini video analysis
- `captureFrame()`: Captures current video frame as base64 JPEG
- `jumpToTimestamp()`: Navigates video to specific timestamp
- `openStudio()`: Opens Image Studio with pre-filled prompt

### types.ts (lines 1-47)
Comprehensive type definitions for the application.

**Key Interfaces**:
- `TimelineEvent`: Timestamped critique with severity, issue, fix, and image prompt
- `CritiqueAnalysis`: Complete analysis with summary and timeline
- `ChatMessage`: Chat interface message structure
- `VideoData`: Video file metadata
- `GenerationMode`: Image Studio modes (NEW_IMAGE | EDIT_FRAME)
- `AspectRatio`: Supported image aspect ratios

### services/geminiService.ts (lines 1-241)
Centralized Gemini API integration service.

**Key Functions**:

1. **`analyzeVideo(file: File)`** (lines 9-141)
   - Uploads video via File API
   - Polls for processing completion
   - Uses structured JSON schema for reliable parsing
   - Enables thinking mode for deeper analysis (2048 token budget)
   - Returns structured `CritiqueAnalysis`

2. **`initChat(analysis: CritiqueAnalysis)`** (lines 147-169)
   - Creates chat session with analysis context
   - Sets up system instruction with critique data
   - Initializes creative director persona

3. **`sendMessage(message: string)`** (lines 171-176)
   - Sends user message to chat session
   - Returns AI response

4. **`generateImage(prompt: string, aspectRatio: AspectRatio)`** (lines 180-201)
   - Uses Imagen 4.0 for new image generation
   - Returns base64-encoded JPEG

5. **`editImage(base64Image: string, prompt: string)`** (lines 205-241)
   - Uses Gemini 2.5 Flash Image for frame editing
   - Takes video frame and modification prompt
   - Returns edited image as base64 PNG

**API Key Configuration**:
- API key sourced from `process.env.API_KEY` (via Vite env vars)
- Set in `.env.local` as `GEMINI_API_KEY`

### components/TimelineChart.tsx (lines 1-48)
Interactive timeline visualization using Recharts.

**Features**:
- Bar chart showing severity over time
- Color-coded bars (blue < 4, amber 4-7, red > 7)
- Click to jump to timestamp in video
- Responsive container

### components/ChatInterface.tsx (lines 1-140)
Context-aware chat assistant UI.

**Features**:
- Message history with user/model roles
- Auto-scroll to latest message
- Loading state with animated dots
- Enter key to send

### components/ImageStudio.tsx (lines 1-185)
Modal for image generation and editing.

**Two Modes**:
1. **Reimagine Scene** (NEW_IMAGE): Generate concept image from scratch using Imagen 4
2. **Edit Frame** (EDIT_FRAME): Modify actual video frame using Gemini 2.5 Flash Image

**Features**:
- Aspect ratio selection for new images
- Prompt editing
- Download generated images
- Error handling with user-friendly messages

## Development Workflows

### Setup
```bash
npm install
# Create .env.local with GEMINI_API_KEY=your_key_here
npm run dev
```

### Build & Deploy
```bash
npm run build    # Production build
npm run preview  # Preview production build
```

### Local Development
- Server runs on `http://localhost:3000`
- Hot reload enabled via Vite
- No proxy configuration needed (direct API calls)

## Code Conventions

### TypeScript
- Strict mode disabled for flexibility
- Experimental decorators enabled
- Path alias: `@/*` maps to project root
- No emit (Vite handles bundling)

### React
- Functional components with hooks
- TypeScript with explicit prop interfaces
- React 19 features (StrictMode enabled)
- JSX transform (react-jsx)

### Styling
- Tailwind CSS utility classes
- Slate color palette (900-50)
- Indigo/purple accents for primary actions
- Consistent spacing scale (4px base)
- Custom scrollbar styles in index.html

### Component Patterns
- Props interface named `Props` within component file
- Ref usage for video element and chat scroll
- Conditional rendering for loading/error states
- Event handler naming: `handleX` or `onX`

### State Management
- Local component state via `useState`
- No global state management library (Redux, Zustand, etc.)
- Service layer for API calls (stateful chat session)
- Ref forwarding for DOM manipulation

### Error Handling
- Try-catch blocks in async functions
- User-facing error messages via alerts or inline UI
- Console logging for debugging
- Graceful degradation (e.g., chat unavailable message)

## API Integration Guidelines

### Gemini Models Used
1. **gemini-3-pro-preview**: Video analysis and chat
2. **imagen-4.0-generate-001**: Image generation
3. **gemini-2.5-flash-image**: Image editing

### File Upload Pattern
```typescript
// 1. Upload file
const uploadResult = await ai.files.upload({ file, config });
// 2. Extract file metadata (handle SDK wrapper)
const fileData = uploadResult.file ?? uploadResult;
// 3. Poll for PROCESSING -> ACTIVE
while (fileData.state === "PROCESSING") { ... }
// 4. Use fileUri in generateContent
```

### Structured Output Pattern
```typescript
const responseSchema: Schema = { ... };
const response = await ai.models.generateContent({
  contents: { ... },
  config: {
    responseMimeType: "application/json",
    responseSchema: responseSchema,
    thinkingConfig: { thinkingBudget: 2048 }
  }
});
const result = JSON.parse(response.text);
```

### Chat Session Pattern
```typescript
chatSession = ai.chats.create({ model, config });
const result = await chatSession.sendMessage({ message });
```

## Common Tasks

### Adding a New Timeline Event Type
1. Update `TimelineEvent` interface in `types.ts`
2. Update JSON schema in `geminiService.ts` (lines 63-96)
3. Update UI rendering in `App.tsx` (lines 242-269)

### Adding a New Image Generation Model
1. Add function to `geminiService.ts`
2. Create new mode in `GenerationMode` enum (`types.ts`)
3. Update `ImageStudio.tsx` to support new mode

### Modifying Video Analysis Prompt
- Edit prompt string in `geminiService.ts` (lines 98-111)
- Adjust thinking budget if needed (line 129)
- Update response schema if output structure changes

### Adding New Chat Commands
- Update system instruction in `initChat()` (lines 149-161)
- No frontend changes needed (chat is freeform)

### Changing UI Theme
- Modify Tailwind classes in components
- Update color palette in `index.html` custom styles
- Consider updating gradient colors (indigo/purple)

## Important Conventions for AI Assistants

### When Modifying Code

1. **Preserve Type Safety**: Always maintain TypeScript types. Update interfaces when changing data structures.

2. **Handle Async Errors**: Wrap all API calls in try-catch blocks with user-friendly error messages.

3. **Maintain Loading States**: Always set loading state before async operations and clear it in finally blocks.

4. **Update Schemas**: If changing Gemini response structure, update both TypeScript types AND JSON schemas.

5. **Test Video Upload**: Large file support is critical. Don't add size limits without consulting requirements.

6. **Preserve API Key Pattern**: Always use `process.env.API_KEY` (injected via Vite). Never hardcode keys.

7. **Maintain Responsive Design**: Preserve flex layouts and overflow handling. Test on different screen sizes.

8. **Keep Chat Stateful**: Chat session is initialized once per analysis. Don't recreate unnecessarily.

### File Organization Rules

- **No CSS files**: Styles are inline Tailwind or in `index.html`
- **Component files**: One component per file in `components/`
- **Service files**: API wrappers in `services/`
- **Types**: All shared types in `types.ts`

### Testing Considerations

Currently no test framework is configured. When adding tests:
- Use Vitest (Vite's testing framework)
- Mock Gemini API calls
- Test component rendering with React Testing Library
- Test video upload edge cases (large files, unsupported formats)

## Git Workflow

### Branching
- Feature branches: `claude/feature-name-<session-id>`
- Always work on designated branch
- Never push to main/master directly

### Commits
- Clear, descriptive commit messages
- Commit atomic changes (single feature/fix)
- Run build before committing (`npm run build`)

### Pull Requests
- Include summary of changes
- List testing steps
- Reference related issues

## Environment Variables

Required in `.env.local`:
```
GEMINI_API_KEY=your_api_key_here
```

Accessed in code via:
```typescript
process.env.API_KEY  // Vite injects this
```

## Performance Considerations

1. **Video Upload**: Uses File API to support large files without size limits
2. **Frame Capture**: Canvas-based, synchronous operation
3. **Chart Rendering**: Recharts handles virtualization
4. **State Updates**: Minimal re-renders via proper state management
5. **API Polling**: 5-second intervals during file processing

## Security Considerations

1. **API Key**: Stored in `.env.local`, not committed to git
2. **File Upload**: Client-side only, no server storage
3. **CORS**: Direct Gemini API calls (no proxy needed)
4. **XSS**: React escapes all rendered content by default

## Known Limitations

1. No authentication system
2. No video storage (session-based only)
3. No critique history/persistence
4. No export functionality (except images)
5. Single video analysis at a time
6. Chat context limited to current analysis

## Future Enhancement Ideas

- Save/load analysis results
- Compare multiple video versions
- Batch processing
- Export reports as PDF
- User accounts and history
- Real-time collaboration
- Video trimming/editing
- Custom analysis templates

## Troubleshooting

### Video Won't Upload
- Check file type (must be video/*)
- Verify GEMINI_API_KEY is set
- Check browser console for errors
- Ensure Gemini API quota available

### Analysis Fails
- Check API key validity
- Verify video format is supported by Gemini
- Check file processing status in console logs
- Increase polling timeout if needed

### Chat Not Working
- Ensure analysis completed successfully
- Check chat initialization in console
- Verify API key has chat model access

### Image Generation Fails
- Check prompt length (not too short/long)
- Verify API key has Imagen access
- Check aspect ratio is valid
- For EDIT_FRAME, ensure video is loaded

## Resources

- [Gemini API Documentation](https://ai.google.dev/docs)
- [React 19 Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Recharts Documentation](https://recharts.org)

---

**Last Updated**: 2025-11-20
**Project Version**: 0.0.0
**Maintained By**: AI Studio
