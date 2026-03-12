# Word Generator Scripts

Scripts for generating and managing words in the Outsider word bank.

## generate-words.ts

Generates random words using Gemini AI and adds them to the database via the API endpoint.

### Prerequisites

1. **Gemini API Key**: Get a free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. **Backend Running**: The backend server must be running on port 3001

### Setup

1. Set your Gemini API key as an environment variable:
```bash
export GEMINI_API_KEY=your_gemini_api_key_here
```

2. (Optional) Set custom API URL if not using default:
```bash
export API_BASE_URL=http://localhost:3001
```

### Usage

Generate words for both languages:
```bash
bun run scripts/generate-words.ts [count] [language]
```

### Examples

**Generate 50 English words (all difficulties):**
```bash
export GEMINI_API_KEY=your_key
bun run scripts/generate-words.ts 50 english
```

**Generate 30 Thai words (all difficulties):**
```bash
export GEMINI_API_KEY=your_key
bun run scripts/generate-words.ts 30 thai
```

**Generate 20 words for all languages:**
```bash
export GEMINI_API_KEY=your_key
bun run scripts/generate-words.ts 20 all
```

### Output

The script will:
1. Connect to the backend API
2. Call Gemini AI to generate words for each difficulty level
3. Parse and validate the generated words
4. Add words to the database via the `/api/words` endpoint
5. Display progress and statistics

Example output:
```
🚀 Word Generator Script
========================
Target: 20 words per difficulty
Language: all
API URL: http://localhost:3001

✅ Connected to API
   Current word count: 199

==================================================
🌐 Generating ENGLISH words
==================================================

📝 Generating easy english words...
  Attempt 1/3...
  Generated 22 words
  ✅ Added: Cat
  ✅ Added: Dog
  ✅ Added: House
  ...
  📊 Added 20/20 easy english words
```

### Word Distribution

The script generates words for three difficulty levels:

- **Easy**: Common, everyday nouns (e.g., "cat", "บ้าน")
- **Medium**: More specific or abstract nouns (e.g., "telescope", "อิสรภาพ")
- **Hard**: Complex, technical, or obscure nouns (e.g., "quantum", "อัลกอริทึม")

### Error Handling

- **Duplicate Words**: Skips words that already exist in the database
- **API Errors**: Retries up to 3 times per difficulty level
- **Rate Limiting**: Includes small delays to avoid hitting API limits
- **Invalid Words**: Filters out very short words and numbered lists

### Troubleshooting

**"GEMINI_API_KEY environment variable is not set"**
- Make sure you've exported the environment variable before running

**"Cannot connect to API"**
- Ensure the backend server is running: `cd service && bun run dev`
- Check that the API_BASE_URL is correct

**"Gemini API error: 400"**
- Check that your API key is valid
- Verify you have quota remaining

**Words not being added**
- Check backend logs for errors
- Verify the word doesn't already exist in the database

### Tips

1. **Start Small**: Test with 5-10 words first to ensure everything works
2. **Monitor Quality**: Review generated words and remove any inappropriate ones
3. **Batch Processing**: Generate in batches of 20-50 to avoid API rate limits
4. **Language Balance**: Generate equal amounts for both languages for fairness

### Alternative: Manual Word Addition

If you prefer not to use AI generation, you can add words manually via the API:

```bash
curl -X POST http://localhost:3001/api/words \
  -H "Content-Type: application/json" \
  -d '{"word":"example","difficulty":"medium","language":"english","wordType":"noun"}'
```

Or use the Swagger UI at `http://localhost:3001/swagger` to test the endpoints interactively.
