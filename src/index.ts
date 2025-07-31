#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Weather API configuration
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'demo_key';
const WEATHER_API_BASE = 'http://api.openweathermap.org/data/2.5';

class WeatherMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'weather-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_weather',
            description: 'Get current weather information for a city',
            inputSchema: {
              type: 'object',
              properties: {
                city: {
                  type: 'string',
                  description: 'The city name to get weather for',
                },
                units: {
                  type: 'string',
                  enum: ['metric', 'imperial', 'kelvin'],
                  description: 'Temperature units (metric=Celsius, imperial=Fahrenheit, kelvin=Kelvin)',
                  default: 'metric',
                },
              },
              required: ['city'],
            },
          },
          {
            name: 'get_forecast',
            description: 'Get 5-day weather forecast for a city',
            inputSchema: {
              type: 'object',
              properties: {
                city: {
                  type: 'string',
                  description: 'The city name to get forecast for',
                },
                units: {
                  type: 'string',
                  enum: ['metric', 'imperial', 'kelvin'],
                  description: 'Temperature units',
                  default: 'metric',
                },
              },
              required: ['city'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_weather':
            return await this.getCurrentWeather(args.city, args.units || 'metric');
          case 'get_forecast':
            return await this.getWeatherForecast(args.city, args.units || 'metric');
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: 'weather://cities/popular',
            name: 'Popular Cities',
            description: 'List of popular cities for weather queries',
            mimeType: 'application/json',
          },
          {
            uri: 'weather://api/status',
            name: 'API Status',
            description: 'Current status of the weather API',
            mimeType: 'application/json',
          },
        ],
      };
    });

    // Handle resource requests
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      switch (uri) {
        case 'weather://cities/popular':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  cities: [
                    'New York',
                    'London',
                    'Tokyo',
                    'Paris',
                    'Sydney',
                    'Berlin',
                    'San Francisco',
                    'Toronto',
                    'Mumbai',
                    'Singapore',
                  ],
                }),
              },
            ],
          };

        case 'weather://api/status':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  status: 'operational',
                  apiKey: WEATHER_API_KEY !== 'demo_key' ? 'configured' : 'demo',
                  timestamp: new Date().toISOString(),
                }),
              },
            ],
          };

        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });

    // List available prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: 'weather_summary',
            description: 'Generate a comprehensive weather summary',
            arguments: [
              {
                name: 'city',
                description: 'The city to generate weather summary for',
                required: true,
              },
            ],
          },
          {
            name: 'travel_weather_advice',
            description: 'Provide travel advice based on weather conditions',
            arguments: [
              {
                name: 'destination',
                description: 'Travel destination city',
                required: true,
              },
              {
                name: 'travel_date',
                description: 'Planned travel date (YYYY-MM-DD)',
                required: false,
              },
            ],
          },
        ],
      };
    });
  }

  private async getCurrentWeather(city: string, units: string) {
    try {
      const response = await axios.get(
        `${WEATHER_API_BASE}/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=${units}`
      );

      const data = response.data;
      const unitSymbol = units === 'metric' ? '°C' : units === 'imperial' ? '°F' : 'K';

      return {
        content: [
          {
            type: 'text',
            text: `Current weather in ${data.name}, ${data.sys.country}:
Temperature: ${data.main.temp}${unitSymbol}
Feels like: ${data.main.feels_like}${unitSymbol}
Description: ${data.weather[0].description}
Humidity: ${data.main.humidity}%
Pressure: ${data.main.pressure} hPa
Wind: ${data.wind.speed} m/s
Visibility: ${data.visibility / 1000} km`,
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`City "${city}" not found`);
        }
        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please configure WEATHER_API_KEY environment variable');
        }
      }
      throw new Error(`Failed to fetch weather data: ${error}`);
    }
  }

  private async getWeatherForecast(city: string, units: string) {
    try {
      const response = await axios.get(
        `${WEATHER_API_BASE}/forecast?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=${units}`
      );

      const data = response.data;
      const unitSymbol = units === 'metric' ? '°C' : units === 'imperial' ? '°F' : 'K';

      let forecastText = `5-day weather forecast for ${data.city.name}, ${data.city.country}:\n\n`;

      // Group forecasts by day
      const dailyForecasts = data.list.reduce((acc: any, item: any) => {
        const date = new Date(item.dt * 1000).toDateString();
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(item);
        return acc;
      }, {});

      Object.entries(dailyForecasts).slice(0, 5).forEach(([date, forecasts]: [string, any]) => {
        const dayForecasts = forecasts.slice(0, 3); // First 3 forecasts of the day
        forecastText += `${date}:\n`;
        
        dayForecasts.forEach((forecast: any) => {
          const time = new Date(forecast.dt * 1000).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
          forecastText += `  ${time}: ${forecast.main.temp}${unitSymbol}, ${forecast.weather[0].description}\n`;
        });
        forecastText += '\n';
      });

      return {
        content: [
          {
            type: 'text',
            text: forecastText,
          },
        ],
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`City "${city}" not found`);
        }
        if (error.response?.status === 401) {
          throw new Error('Invalid API key. Please configure WEATHER_API_KEY environment variable');
        }
      }
      throw new Error(`Failed to fetch weather forecast: ${error}`);
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Weather MCP server running on stdio');
  }
}

// Start the server
const server = new WeatherMCPServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
