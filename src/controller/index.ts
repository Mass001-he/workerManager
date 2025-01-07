import { Logger } from '../logger';

class ApiGateway {
  private logger = Logger.scope('ApiGateway');
  private baseUrl: string;
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.logger.info('ApiGateway created');
  }

  async get(path: string, params?: Record<string, any>): Promise<any> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.keys(params).forEach((key) =>
        url.searchParams.append(key, params[key]),
      );
    }

    this.logger.info(`GET request to ${url.toString()}`);
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      this.logger.error(
        `GET request to ${url.toString()} failed with status ${response.status}`,
      );
      throw new Error(`GET request failed with status ${response.status}`);
    }

    return response.json();
  }

  async post(path: string, body: any): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    this.logger.info(`POST request to ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      this.logger.error(
        `POST request to ${url} failed with status ${response.status}`,
      );
      throw new Error(`POST request failed with status ${response.status}`);
    }

    return response.json();
  }
}

export default ApiGateway;
