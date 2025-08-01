#!/usr/bin/env node
import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { HttpServerTransport } from '@modelcontextprotocol/sdk/transport/http.js';
import {
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Weather API configuration
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'demo_key';
const WEATHER_API_BASE = 'http://api.openweathermap.org/data/2.5';

class WeatherMCPServer {
  private server: Server;
  private app = express();
  private port: number;

  constructor() {
    this.port = Number(process.env.PORT) || 8080;

    /* ---------- HTTP health route so Cloud Run succeeds ---------- */
    this.app.get('/', (_, res) => res.send('Weather MCP up'));

    this.app.listen(this.port, () => {
      console.log(`Weather MCP HTTP server listening on ${this.port}`);
    });

    /* ---------- MCP core server ---------- */
    this.server = new Server(
      { name: 'weather-mcp-server', version: '1.0.0' },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );

    this.setupHandlers();
  }

  /* ---------- Handler registrations (unchanged) ---------- */
  private setupHandlers() {
    // List tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get_weather',
          description: 'Get current weather information for a city',
          inputSchema: {
            type: 'object',
            properties: {
              city: { type: 'string', description: 'The city name to get weather for' },
              units: {
                type: 'string',
                enum: ['metric', 'imperial', 'kelvin'],
                description: 'Temperature units',
                default: 'metric'
              }
            },
            required: ['city']
          }
        },
        {
          name: 'get_forecast',
          description: 'Get 5-day weather forecast for a city',
          inputSchema: {
            type: 'object',
            properties: {
              city: { type: 'string', description: 'City name' },
              units: {
                type: 'string',
                enum: ['metric', 'imperial', 'kelvin'],
                description: 'Temperature units',
                default: 'metric'
              }
            },
            required: ['city']
          }
        }
      ]
    }));

    // Tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async req => {
      const { name, arguments: args } = req.params as { name: string; arguments: any };
      try {
        switch (name) {
          case 'get_weather':
            return await this.getCurrentWeather(args.city, args.units || 'metric');
          case 'get_forecast':
            return await this.getWeatherForecast(args.city, args.units || 'metric');
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (err) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Error: ${err instanceof Error ? err.message : 'Unknown error'}` }]
        };
      }
    });

    // Resources list
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'weather://cities/popular',
          name: 'Popular Cities',
          description: 'Frequently queried cities',
          mimeType: 'application/json'
        },
        {
          uri: 'weather://api/status',
          name: 'API Status',
          description: 'Current status of the weather API',
          mimeType: 'application/json'
        }
      ]
    }));

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async req => {
      const { uri } = req.params;
      switch (uri) {
        case 'weather://cities/popular':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify({
                  cities: ['New York', 'London', 'Tokyo', 'Paris', 'Sydney', 'Berlin', 'San Francisco', 'Toronto', 'Mumbai', 'Singapore']
                })
              }
            ]
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
                  timestamp: new Date().toISOString()
                })
              }
            ]
          };
        default:
          throw new Error(`Unknown resource: ${uri}`);
      }
    });

    // Prompts list
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => ({
      prompts: [
        {
          name: 'weather_summary',
          description: 'Generate a comprehensive weather summary',
          arguments: [{ name: 'city', description: 'City to summarize', required: true }]
        },
        {
          name: 'travel_weather_advice',
          description: 'Provide travel advice based on weather',
          arguments: [
            { name: 'destination', description: 'Destination city', required: true },
            { name: 'travel_date', description: 'Travel date (YYYY-MM-DD)', required: false }
          ]
        }
      ]
    }));
  }

  /* ---------- Weather helpers (unchanged) ---------- */
  private async getCurrentWeather(city: string, units: string) {
    try {
      const { data } = await axios.get(
        `${WEATHER_API_BASE}/weather?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=${units}`
      );
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
Visibility: ${data.visibility / 1000} km`
          }
        ]
      };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) throw new Error(`City "${city}" not found`);
        if (err.response?.status === 401) throw new Error('Invalid API key');
      }
      throw new Error(`Failed to fetch weather data: ${err}`);
    }
  }

  private async getWeatherForecast(city: string, units: string) {
    try {
      const { data } = await axios.get(
        `${WEATHER_API_BASE}/forecast?q=${encodeURIComponent(city)}&appid=${WEATHER_API_KEY}&units=${units}`
      );
      const unitSymbol = units === 'metric' ? '°C' : units === 'imperial' ? '°F' : 'K';
      let text = `5-day forecast for ${data.city.name}, ${data.city.country}:\n\n`;
      const daily = data.list.reduce((acc: any, item: any) => {
        const date = new Date(item.dt * 1000).toDateString();
        (acc[date] ||= []).push(item);
        return acc;
      }, {});
      Object.entries(daily)
        .slice(0, 5)
        .forEach(([date, forecasts]: [string, any]) => {
          text += `${date}:\n`;
          (forecasts as any[]).slice(0, 3).forEach(f => {
            const time = new Date(f.dt * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            text += `  ${time}: ${f.main.temp}${unitSymbol}, ${f.weather[0].description}\n`;
          });
          text += '\n';
        });
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404) throw new Error(`City "${city}" not found`);
        if (err.response?.status === 401) throw new Error('Invalid API key');
      }
      throw new Error(`Failed to fetch forecast: ${err}`);
    }
  }

  /* ---------- Start transports ---------- */
  async start() {
    // Stdio transport (so you can run locally)
    const stdio = new StdioServerTransport();
    await this.server.connect(stdio);

    // HTTP transport (for remote MCP clients / Windsurf)
    const http = new HttpServerTransport({ port: this.port });
    await this.server.connect(http);

    console.error('Weather MCP server ready (stdio & HTTP)');
  }
}

/* ---------- Bootstrap ---------- */
const srv = new WeatherMCPServer();
srv.start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});