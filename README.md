# Weather MCP Server

A sample Model Context Protocol (MCP) server that provides weather information tools. This server demonstrates how to build MCP servers that can be deployed using the MCP Autodeploy platform.

## Features

### Tools
- **get_weather**: Get current weather information for any city
- **get_forecast**: Get 5-day weather forecast for any city

### Resources
- **weather://cities/popular**: List of popular cities for weather queries
- **weather://api/status**: Current status of the weather API

### Prompts
- **weather_summary**: Generate a comprehensive weather summary
- **travel_weather_advice**: Provide travel advice based on weather conditions

## Setup

1. **Clone this repository** (or use it as a template)
2. **Get a weather API key** from [OpenWeatherMap](https://openweathermap.org/api)
3. **Set environment variable**: `WEATHER_API_KEY=your_api_key_here`

## Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

## Deployment with MCP Autodeploy

1. **Push to GitHub**: Make sure your code is in a GitHub repository
2. **Visit MCP Autodeploy**: Go to [your deployment URL]
3. **Deploy**: Paste your GitHub repository URL and click deploy
4. **Configure**: Add your `WEATHER_API_KEY` as an environment variable
5. **Use**: Get your deployment URL and integrate with AI applications

## Usage with Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "weather": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-remote"],
      "env": {
        "REMOTE_SERVER_URL": "https://your-deployed-server.run.app"
      }
    }
  }
}
```

## API Reference

### Tools

#### get_weather
Get current weather for a city.

**Parameters:**
- `city` (string, required): City name
- `units` (string, optional): Temperature units (`metric`, `imperial`, `kelvin`)

**Example:**
```json
{
  "name": "get_weather",
  "arguments": {
    "city": "San Francisco",
    "units": "metric"
  }
}
```

#### get_forecast
Get 5-day weather forecast for a city.

**Parameters:**
- `city` (string, required): City name  
- `units` (string, optional): Temperature units (`metric`, `imperial`, `kelvin`)

**Example:**
```json
{
  "name": "get_forecast",
  "arguments": {
    "city": "London",
    "units": "metric"
  }
}
```

### Resources

#### weather://cities/popular
Returns a JSON list of popular cities for weather queries.

#### weather://api/status
Returns the current status of the weather API and configuration.

### Prompts

#### weather_summary
Generates a comprehensive weather summary for a city.

**Arguments:**
- `city` (required): The city to generate weather summary for

#### travel_weather_advice
Provides travel advice based on weather conditions.

**Arguments:**
- `destination` (required): Travel destination city
- `travel_date` (optional): Planned travel date (YYYY-MM-DD)

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `WEATHER_API_KEY` | OpenWeatherMap API key | Yes | `demo_key` |
| `NODE_ENV` | Environment mode | No | `development` |

## Error Handling

The server handles various error conditions:
- **City not found**: Returns a user-friendly error message
- **Invalid API key**: Prompts to configure the API key
- **Network errors**: Returns connection error information
- **Rate limits**: Handles API rate limit responses

## Testing

```bash
# Run tests
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- Documentation: [MCP Autodeploy Docs](https://docs.mcp-autodeploy.com)
- Issues: [GitHub Issues](https://github.com/mcp-autodeploy/weather-mcp-server/issues)
- Community: [Discord](https://discord.gg/mcp-autodeploy)
