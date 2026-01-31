# Cobalt Crew Hackathon

## 🎤 NEW: Voice Input Feature!

Add multiple mates and select your trip theme using just your voice! Say everything in one command and watch the app auto-fill all fields.

**Quick Setup:**
1. Get your free Gemini API key: [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Add to `.env.local`: `GEMINI_API_KEY=your_key_here`
3. Restart dev server and start using voice!

👉 **[Full Voice Setup Guide](VOICE_SETUP.md)**

**Example:** 
"Add John from Berlin, Sarah from Munich, and Tom from Paris. I want a cultural trip."

**Cost:** $0 (Free tier: 1,500 requests/day)

**Tech:** Web Speech API + Google Gemini Flash (via official `@google/genai` SDK)