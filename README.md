# Pi coding agent DeepSeek Balance Extension

A [Pi coding agent](https://pi.dev/) extension that monitors your [DeepSeek](https://platform.deepseek.com/) API account balance and automatically displays it in the footer when using a DeepSeek provider.

## Features

- **Auto Footer Display**: Shows remaining account balance when using DeepSeek models
- **Multi-Currency**: Prefers USD, falls back to CNY or other currencies from your account
- **Smart Caching**: Caches balance data for 30 seconds to avoid excessive API calls

## Install

```bash
pi install npm:@alexanderfortin/pi-deepseek-usage
```

or

```
pi install git:github.com/shaftoe/pi-deepseek-usage
```

or test from source:

```bash
git clone https://github.com/shaftoe/pi-deepseek-usage
cd pi-deepseek-usage

bun install
bun run build
pi -e .
```

## Usage

### Automatic Footer Display

When using a DeepSeek model (e.g., `deepseek-v4-flash`, `deepseek-v4-pro`), the extension automatically displays your remaining account balance in the footer:

```
DeepSeek: $17.35
```

The footer updates after each AI turn and on model selection changes. When you switch away from a DeepSeek model, the footer is cleared.

## Configuration

No configuration needed. The extension automatically:

- Uses cached data for 30 seconds to avoid excessive API calls
- Shows/updates status only when DeepSeek models are active
- Clears status when switching to non-DeepSeek models
- Prefers USD balance, falls back to the first available currency

Make sure your DeepSeek API key is configured (e.g., via `DEEPSEEK_API_KEY` environment variable or Pi's provider settings).

## API

The extension uses the DeepSeek balance endpoint: `GET https://api.deepseek.com/user/balance`

## Development

```bash
# Run tests
bun run test

# Type check + lint
bun run check

# Auto-fix lint issues
bun run lint:fix

# Watch mode
bun run dev
```

## License

MIT
