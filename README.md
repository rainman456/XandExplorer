# pNode Analytics Backend

## Overview

The pNode Analytics Backend is a **real-time monitoring and data aggregation system** for the Xandeum network. It continuously discovers, tracks, and analyzes pNodes (network participants), making their operational data available to frontend dashboards and analytics tools.

This backend serves as the **central intelligence layer** that transforms raw network data into actionable insights about network health, node performance, and system-wide metrics.

---

## What This Backend Does

The backend has three core responsibilities:

1. **Discovery** – Automatically finds all pNodes in the network
2. **Data Collection** – Gathers operational metrics from each pNode
3. **Aggregation & Analysis** – Processes and enriches data for consumption by dashboards

The result is a **live view** of the entire network: which nodes are online, where they're located, how they're performing, and how the network is growing over time.

---

## How pNode Discovery Works

### The Gossip Protocol

pNodes communicate with each other through a **gossip protocol**—a peer-to-peer communication pattern where nodes periodically share information about other nodes they know about.

Think of it like this:
- **Node A** knows about **Nodes B, C, and D**
- **Node B** knows about **Nodes A, E, and F**
- When you ask **Node A** who it knows, it tells you about B, C, and D
- When you ask **Node B**, it tells you about A, E, and F
- By asking just a few nodes, you quickly learn about the entire network

### Fast Propagation

In the Xandeum network, gossip updates happen **every second**, meaning:
- New nodes are discovered within minutes
- Offline nodes are detected within 5-8 minutes
- The backend always has a near-real-time view of network topology

### Bootstrap Process

When the backend starts:
1. Connects to a few **seed nodes** (known, reliable entry points)
2. Asks each seed node for its list of peers
3. Recursively discovers new nodes from those peers
4. Within 10-15 seconds, discovers most of the network

---

## How Data Is Collected

### pRPC: The Query Protocol

Once nodes are discovered, the backend uses **pRPC** (a JSON-RPC protocol) to directly query individual pNodes for detailed information.

Each pNode exposes several endpoints:

- **`get-version`** – Returns the software version the node is running
- **`get-stats`** – Returns real-time system metrics (CPU, RAM, storage, uptime, network packets)
- **`get-pods-with-stats`** – Returns the node's view of the network (peers + their stats)

### What Makes pRPC Useful

pRPC allows the backend to:
- **Verify connectivity** – Confirm a node is actually reachable (not just rumored to exist)
- **Gather metrics** – Collect performance data that isn't available through gossip
- **Assess health** – Determine if a node is online, struggling, or offline

### Polling Strategy

The backend uses **optimized polling** to balance freshness with efficiency:

- **Discovery** – Every 45 seconds (after initial bootstrap)
- **Stats Collection** – Every 30 seconds for active nodes
- **Health Checks** – Every 2 minutes for all known nodes

Because gossip propagates quickly, the backend can trust that data is relatively fresh without hammering nodes with requests.

---

## Backend Data Flow

Here's how raw network data becomes dashboard-ready analytics:

### 1. **Discovery Layer**
- Maintains a list of all known nodes
- Tracks multiple addresses per node (RPC endpoints, gossip endpoints)
- Handles duplicates (same node appearing at multiple IPs)

### 2. **Collection Layer**
- Queries nodes for version, stats, and peer lists
- Handles failures gracefully (timeouts, offline nodes)
- Updates node records with fresh data

### 3. **Enrichment Layer**
- **Geolocation** – Maps IP addresses to countries and cities
- **Credits System** – Tracks node contributions and rankings
- **Registration Status** – Identifies registered vs. unregistered nodes
- **Version Checking** – Flags outdated or deprecated software

### 4. **Aggregation Layer**
- Combines individual node data into network-wide statistics
- Calculates uptime scores, performance scores, and health scores
- Differentiates between public nodes (accept connections) and private nodes (behind NAT/firewall)

### 5. **Caching Layer**
- Stores processed data in Redis (or in-memory fallback)
- Refreshes cache every 30 seconds
- Provides fast, consistent access for frontend queries

### 6. **History Layer**
- Records snapshots over time
- Stores historical data in MongoDB
- Enables trend analysis, forecasting, and growth tracking

---

## What Data the Frontend Receives

The backend exposes data through a REST API. Here's what types of information are available:

### Node Data
Each node in the system has:
- **Identity**: Public key, IP address, version
- **Status**: Online, warning, or offline
- **Location**: Country, city, coordinates (for map visualizations)
- **Metrics**: CPU usage, RAM, storage capacity/usage, uptime
- **Performance**: Response time, uptime score, success rate
- **Credits**: Contribution ranking and credits earned
- **Registration**: Whether the node is officially registered

### Network Statistics
Aggregated metrics across all nodes:
- **Node Counts**: Total nodes, online nodes, warning nodes, offline nodes
- **Pod Counts**: Unique participants (one identity may have multiple IPs)
- **Public vs Private**: Breakdown of connectivity types
- **Storage**: Total capacity, total usage, average per node
- **Health**: Network-wide health score (0-100%)
- **Performance**: Average uptime, average response time

### Historical Analytics
Time-series data for trend analysis:
- **Network Growth**: Nodes added over time
- **Storage Growth**: Capacity and usage trends
- **Uptime Reports**: Reliability over days/weeks/months
- **Health Trends**: Daily health snapshots
- **Node Lifecycle**: When nodes joined, went offline, or died

### Advanced Features
Special analytics endpoints:
- **Topology**: Geographic distribution and clustering
- **Capacity Forecasting**: Predicted storage saturation dates
- **High Uptime Nodes**: Top performers by reliability
- **Node Graveyard**: Inactive or dead nodes
- **Weekly Comparisons**: Week-over-week performance changes

---

## How the Frontend Uses This Data

The backend's data powers various UI components:

### Dashboards
- **Live counters**: Total nodes, online percentage, network health
- **Real-time charts**: Node count over time, storage growth, geographic distribution

### Node Explorer
- **Searchable tables**: Filter by status, country, version, or registration
- **Sorting**: Order by uptime, performance, credits, or storage
- **Pagination**: Handle thousands of nodes efficiently

### Node Detail Pages
- **Comprehensive profiles**: All metrics for a single node
- **Historical charts**: Uptime trends, performance over time
- **Connection status**: RPC reachability, last seen timestamp

### Analytics Pages
- **Forecasting**: When will storage fill up?
- **Leaderboards**: Top nodes by credits, uptime, or performance
- **Health Reports**: Daily/weekly snapshots

### Map Visualizations
- **Geographic clustering**: Where nodes are concentrated
- **Interactive markers**: Click a location to see nodes in that region

---

## Design Philosophy

The backend is built around three principles:

### 1. **Simplicity**
Complex distributed systems are simplified into:
- Gossip for discovery
- Direct queries for details
- Centralized aggregation for analytics

This makes the system **easy to understand, debug, and extend**.

### 2. **Observability**
Every layer logs its activity:
- Discovery cycles report progress
- Health checks show success/failure rates
- Cache refreshes log timing and performance

This makes it **easy to monitor, troubleshoot, and optimize**.

### 3. **Extensibility**
The architecture separates concerns:
- **Services** handle specific tasks (discovery, caching, alerts)
- **Handlers** expose data via API
- **Models** define data structures

This makes it **easy to add new features** like alerting, forecasting, or cross-chain comparisons.

---

## Technology Choices (High-Level)

The backend uses:
- **Redis** for fast caching (with in-memory fallback)
- **MongoDB** for historical data storage
- **GeoIP databases** for location lookups
- **REST APIs** for frontend communication

These technologies were chosen for **speed, reliability, and ease of integration** with modern frontend frameworks.

---

## Summary

The pNode Analytics Backend transforms a chaotic, distributed network into a **clear, real-time picture** of system health and performance.

It does this by:
1. **Discovering nodes** through gossip propagation
2. **Querying nodes** for detailed metrics via pRPC
3. **Enriching data** with geolocation, credits, and health scores
4. **Aggregating statistics** for network-wide insights
5. **Caching results** for fast frontend access
6. **Recording history** for trend analysis

The result is a **powerful analytics platform** that helps operators, developers, and users understand the Xandeum network at a glance—or dive deep into individual node performance.