# Xandeum Analytics Backend

The official backend service for the Xandeum pNode Analytics Platform. This service aggregates data from Xandeum pNodes via pRPC, calculates network statistics, and exposes a REST API for the frontend dashboard.

## Features

-   **Node Discovery**: Recursively discovers pNodes via gossip protocol starting from seed nodes.
-   **Data Aggregation**: collects and calculates detailed network stats (Storage, Staking, Uptime).
-   **Health & Status**: Real-time status determination (Online, Warning, Offline) based on latency and uptime.
-   **Caching**: In-memory caching with TTL and stale data fallback for resilience.
-   **Geolocation**: IP-to-Location resolution using MaxMind DB with API fallback.
-   **REST API**: JSON endpoints for Nodes, Network Stats, and RPC proxying.

## Configuration

The application is configured via Environment Variables.

| Variable | Description | Default |
| :--- | :--- | :--- |
| `XAND_SERVER_PORT` | HTTP Port to listen on | `8080` |
| `XAND_SERVER_HOST` | Host interface to bind to | `0.0.0.0` |
| `XAND_SEED_NODES` | Comma-separated list of initial pNode IPs/Domains | `127.0.0.1:3000` |
| `XAND_ALLOWED_ORIGINS`| Comma-separated CORS allowed origins | `*` |
| `XAND_PRPC_TIMEOUT` | Timeout for pRPC calls (e.g., "5s", "500ms") | `10s` |
| `XAND_PRPC_MAX_RETRIES`| Max retries for failed pRPC calls | `3` |
| `GEOIP_DB_PATH` | Path to MaxMind GeoLite2-City.mmdb | (Empty - uses API fallback) |

## Deployment

### Docker

1.  **Build and Run**:
    ```bash
    docker-compose up --build -d
    ```

2.  **Manual Build**:
    ```bash
    docker build -t xandeum-backend .
    docker run -p 8080:8080 -e XAND_SEED_NODES="1.2.3.4" xandeum-backend
    ```

### Manual

1.  **Prerequisites**: Go 1.24+
2.  **Run**:
    ```bash
    go mod download
    go run main.go
    ```
    Or build:
    ```bash
    go build -o server
    ./server
    ```

## API Endpoints

-   `GET /api/nodes`: List all discovered nodes with status and stats.
-   `GET /api/nodes/:id`: Get details for a specific node.
-   `GET /api/stats`: Get aggregated network statistics.
-   `GET /health`: Health check endpoint (for load balancers).
-   `GET /api/status`: Internal backend status.
