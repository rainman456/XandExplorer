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
pNodes communicate with each other through a gossip protocol—a peer-to-peer communication pattern where nodes periodically share information about other nodes they know about.

Think of it like this:
- Node A knows about Nodes B, C, and D
- Node B knows about Nodes A, E, and F
- When you ask Node A who it knows, it tells you about B, C, and D
- When you ask Node B, it tells you about A, E, and F
- By asking just a few nodes, you quickly learn about the entire network
### Fast Propagation
In the Xandeum network, gossip updates happen every second, meaning:
- New nodes are discovered within seconds
- Offline nodes are detected within 5-8 minutes based on gossip timestamp age
- The backend always has a near-real-time view of network topology
### Node Identity & Indexing
The backend uses a dual-indexing strategy:
- **Primary Index**: Nodes are stored by IP address (nodesByIP map)
  - One IP = one node entry
  - Handles the reality that nodes are identified by their network location
- **Reverse Index**: A pubkeyToIPs map tracks all IPs associated with each public key
  - One pubkey can run multiple nodes at different IPs
  - Enables quick lookups like "show me all nodes for this validator"

Each node tracks multiple addresses:
- Gossip address: The peer-to-peer communication endpoint (always working if we received gossip)
- RPC address: The query endpoint (verified separately for public nodes)
### Bootstrap Process
When the backend starts:
1. **Seed Query (Parallel)**: Connects to configured seed nodes simultaneously
   - Queries each seed's get-pods-with-stats endpoint
   - 200ms stagger between requests to prevent network spikes
2. **Strategic Discovery**: Queries discovered public nodes for their peer lists
3. **Gossip Propagation Wait**: Pauses for 30 seconds
   - With 1-second gossip intervals, this allows ~30 hops of network propagation
   - Ensures the backend learns about nodes that aren't directly connected to seeds
4. **Final Sweep**: Queries top public nodes one more time to catch late-arriving gossip

Result: Within 30-45 seconds, discovers most of the network (both public and private nodes)
### Public vs Private Nodes: A Critical Distinction
The backend treats two types of nodes differently:

**Public Nodes**
- Have accessible RPC endpoints (not behind NAT/firewall)
- Can be queried directly for detailed metrics
- Receive health checks via RPC every 60-120 seconds
- Status determined by: Gossip timestamp + RPC reachability

**Private Nodes**
- Behind NAT or firewall (no direct RPC access)
- Discovered only through gossip (other nodes report seeing them)
- Never receive RPC queries (would fail anyway)
- Status determined by: Gossip timestamp only

This distinction is critical for accuracy:
- Attempting to RPC query private nodes would waste resources and generate false "offline" signals
- Gossip data is the source of truth for all nodes, with RPC providing additional detail for public nodes
---
## How Data Is Collected
### pRPC: The Query Protocol
Once public nodes are discovered, the backend uses pRPC (a JSON-RPC protocol) to directly query them for detailed information.

Each public pNode exposes several endpoints:
- **`get-version`** – Returns the software version (used for health checks)
- **`get-stats`** – Returns real-time system metrics (CPU, RAM, storage, uptime, network packets)
- **`get-pods-with-stats`** – Returns the node's view of the network (peers + their stats)
### Concurrency Control: The Semaphore Pattern
To prevent overwhelming the network or exhausting local resources, the backend uses a rate limiter:
- `rateLimiter`: buffered channel with capacity 50

How it works:
- Before making any RPC call, acquire a token from the channel
- Maximum 50 concurrent RPC operations at any time
- Prevents ephemeral port exhaustion and network congestion
- Automatically throttles during high-load periods
### Health Check Strategy: Batched Processing
Health checks for public nodes use intelligent batching:
- **Batch Size**: 10 nodes processed concurrently
- **Stagger Delay**: 200ms between starting each node check within a batch
- **Inter-Batch Pause**: 1 second between batches

Metrics Tracked:
- Response time (latency in milliseconds)
- Success/failure rate
- Call history (sliding window of last 10 attempts)

Example: For 100 public nodes:
- Processes in 10 batches of 10 nodes each
- Each batch takes ~2 seconds (10 nodes × 200ms stagger)
- Total health check cycle: ~20 seconds
### Status Determination: Gossip Timestamp Logic
Node status is primarily determined by gossip timestamp age, not RPC reachability:
- Gossip age < 5 minutes: Status = "online", IsOnline = true
- Gossip age 5-8 minutes: Status = "warning", IsOnline = true
- Gossip age > 8 minutes: Status = "offline", IsOnline = false

For public nodes only, RPC results refine the status:
- If gossip is fresh (<5min) but RPC fails → Status = "warning" (degraded)
- If gossip is fresh and RPC succeeds → Status = "online" (healthy)

Why gossip is the source of truth:
- Works for both public and private nodes
- Reflects actual network participation (not just RPC availability)
- Updates every second across the network
### Polling Strategy
The backend uses optimized polling loops running concurrently:
- **Discovery Loop** – Every 45 seconds
  - Queries top 5-7 most recently seen public nodes
  - Sorted by LastSeen timestamp to get freshest gossip
- **Stats Collection Loop** – Configurable (typically 30-60 seconds)
  - Only queries public nodes that are currently online
  - Gathers CPU, RAM, storage, and network metrics
- **Health Check Loop** – Configurable (typically 60-120 seconds)
  - Only checks public nodes (private nodes use gossip only)
  - Uses batched processing as described above
- **Cleanup Loop** – Every 10 minutes
  - Removes stale failed RPC addresses from tracking
  - Allows retry of previously failed endpoints
---
## Backend Data Flow
Here's how raw network data becomes dashboard-ready analytics:

### 1. Discovery Layer
- Maintains nodesByIP map (IP → Node object)
- Maintains pubkeyToIPs reverse index (pubkey → list of IPs)
- Tracks multiple addresses per node:
  - Gossip endpoint (always marked as working if we received data)
  - RPC endpoint (verified separately, marked working only after successful query)
- Handles node updates from gossip (partial field updates)
- Creates new nodes when first discovered

### 2. Collection Layer
- For public nodes only:
  - Queries for version information during health checks
  - Queries for detailed stats (CPU, RAM, storage, packets)
  - Updates ResponseTime, SuccessCalls, TotalCalls metrics
  - Maintains CallHistory (sliding window of last 10 RPC attempts)
- For all nodes:
  - Updates from gossip data (storage, uptime, version)
  - Tracks LastSeen timestamp from gossip protocol
- Handles failures gracefully (timeouts don't affect gossip-based status)

### 3. Enrichment Layer
- **Geolocation** – Maps IP addresses to countries, cities, and coordinates
  - Performed once when node is first discovered
  - Used for map visualizations and geographic analytics
- **Credits System** – Tracks node contributions and rankings
  - Enriches nodes with credits data if pubkey is available
  - Updates Credits, CreditsRank, CreditsChange fields
- **Registration Status** – Identifies registered vs. unregistered nodes
  - Checks against RegistrationService by pubkey
  - Updates IsRegistered field
- **Version Tracking** – Records software version
  - From gossip data (all nodes)
  - Verified/updated via RPC for public nodes
  - Enables detection of outdated software

### 4. Scoring & Performance Layer
- **Uptime Score** – Calculated from gossip-reported uptime vs. time since first seen
  - Formula: (reported_uptime_seconds / known_duration_seconds) × 100
  - Capped at 100% to handle nodes with longer uptime than we've known them
- **Performance Score** – Calculated from call history and response times
  - Uses sliding window of last 10 RPC attempts
  - Only applicable to public nodes
- **Call History Tracking** – Maintains boolean array of recent RPC results
  - Max 10 entries (oldest removed when new added)
  - Used for reliability scoring

### 5. Aggregation Layer
- Combines individual node data into network-wide statistics
- Differentiates between:
  - Total IPs: Count of unique IP addresses (len(nodesByIP))
  - Unique Pubkeys: Count of unique validators (len(pubkeyToIPs))
  - Public vs Private: Nodes with IsPublic flag
  - Online/Warning/Offline: Based on gossip timestamp age
- Calculates network health scores and averages

### 6. Caching Layer
- Stores processed data in Redis (or in-memory fallback)
- Refreshes cache every 30 seconds
- Provides fast, consistent access for frontend queries
- Reduces load on the discovery service

### 7. History Layer
- Records snapshots over time
- Stores historical data in MongoDB
- Enables trend analysis, forecasting, and growth tracking
---
## What Data the Frontend Receives
The backend exposes data through a REST API. Here's what types of information are available:

### Node Data
Each node in the system has:

**Identity & Location:**
- ID: IP address (primary identifier)
- Pubkey: Validator public key (may be shared across multiple IPs)
- IP & Port: Network location
- Addresses: Array of endpoints (gossip + RPC)
- Country, City, Lat/Lon: Geographic location

**Status & Health:**
- IsOnline: Boolean (based on gossip age)
- Status: "online", "warning", or "offline"
- IsPublic: Whether node accepts RPC connections
- IsRegistered: Whether validator is officially registered
- LastSeen: Timestamp from gossip protocol
- FirstSeen: When backend first discovered this node

**Performance Metrics (public nodes only):**
- ResponseTime: RPC latency in milliseconds
- SuccessCalls / TotalCalls: RPC reliability counters
- CallHistory: Last 10 RPC attempt results
- UptimeScore: Calculated reliability percentage
- PerformanceScore: Overall performance rating

**System Metrics:**
- Version: Software version string
- CPUPercent: CPU usage percentage
- RAMUsed / RAMTotal: Memory utilization
- StorageCapacity / StorageUsed: Disk space
- StorageUsagePercent: Disk utilization percentage
- UptimeSeconds: Reported uptime from node
- PacketsReceived / PacketsSent: Network activity

**Reputation:**
- Credits: Contribution credits earned
- CreditsRank: Ranking by credits
- CreditsChange: Recent credit delta

### Network Statistics
Aggregated metrics across all nodes:

**Node Counts:**
- Total unique IPs
- Unique pubkeys (validators)
- Online / Warning / Offline breakdown

**Public vs Private:**
- Public nodes (RPC-accessible)
- Private nodes (gossip-only)

**Storage:**
- Total capacity across network
- Total usage
- Average per node
- Network-wide utilization percentage

**Health:**
- Network-wide health score (0-100%)
- Percentage of nodes online
- Average uptime score

**Performance (public nodes):**
- Average response time
- Average success rate
- RPC reachability percentage

### Historical Analytics
Time-series data for trend analysis:
- **Network Growth**: Nodes added over time (by IP and by pubkey)
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
- **Multi-IP Validators**: Pubkeys running multiple nodes
---
## How the Frontend Uses This Data
The backend's data powers various UI components:

### Dashboards
- **Live counters**: Total IPs, unique pubkeys, online percentage, network health
- **Real-time charts**: Node count over time, storage growth, geographic distribution
- **Public/Private breakdown**: Connectivity type distribution

### Node Explorer
- **Searchable tables**: Filter by status, country, version, registration, or public/private
- **Sorting**: Order by uptime, performance, credits, storage, or last seen
- **Pagination**: Handle thousands of nodes efficiently
- **Multi-address display**: Show both gossip and RPC endpoints

### Node Detail Pages
- **Comprehensive profiles**: All metrics for a single IP
- **Address status**: Which endpoints are working
- **Historical charts**: Uptime trends, performance over time
- **Connection status**: RPC reachability, gossip age, last seen timestamp
- **Related nodes**: Other IPs with same pubkey

### Analytics Pages
- **Forecasting**: When will storage fill up?
- **Leaderboards**: Top nodes by credits, uptime, or performance
- **Health Reports**: Daily/weekly snapshots
- **Network topology**: IP vs pubkey counts, multi-node validators

### Map Visualizations
- **Geographic clustering**: Where nodes are concentrated
- **Interactive markers**: Click a location to see nodes in that region
- **Public/private overlay**: Visual distinction of node types
---
## Design Philosophy
The backend is built around four principles:

### 1. Hybrid Architecture
Combines two complementary data sources:
- Gossip protocol for universal discovery (works for all nodes)
- Direct RPC queries for detailed metrics (public nodes only)

This makes the system accurate and efficient—no wasted queries on unreachable nodes.

### 2. IP-Centric Indexing
Uses IP addresses as the primary key, not pubkeys:
- Reflects network reality (one validator can run multiple nodes)
- Enables proper tracking of multi-node operators
- Maintains reverse index for pubkey-based queries

This makes the system truthful about network topology.

### 3. Observability
Every layer logs its activity:
- Discovery cycles report IPs discovered and pubkeys found
- Health checks show success/failure rates for public nodes
- Gossip age calculations logged for status transitions
- Batch processing progress tracked

This makes it easy to monitor, troubleshoot, and optimize.

### 4. Extensibility
The architecture separates concerns:
- Services handle specific tasks (discovery, caching, alerts, credits)
- Handlers expose data via API
- Models define data structures
- Concurrent loops run independently with shared state

This makes it easy to add new features like alerting, forecasting, or cross-chain comparisons.
---
## Technology Choices (High-Level)
The backend uses:
- **Gossip Protocol** for peer discovery and status tracking
- **pRPC (JSON-RPC)** for direct node queries
- **Semaphore Pattern** for concurrency control (rate limiting)
- **Batched Processing** for efficient health checks
- **Redis** for fast caching (with in-memory fallback)
- **MongoDB** for historical data storage
- **GeoIP databases** for location lookups
- **REST APIs** for frontend communication

These technologies were chosen for speed, reliability, and accurate representation of a distributed network.
---
## Summary
The pNode Analytics Backend transforms a chaotic, distributed network into a clear, real-time picture of system health and performance.

It does this by:
1. **Discovering nodes** through gossip protocol propagation
   - Indexes by IP address with reverse pubkey lookup
   - Tracks multiple addresses per node (gossip + RPC)
2. **Differentiating node types**
   - Public nodes: RPC-accessible, receive health checks
   - Private nodes: Gossip-only, status from timestamp age
3. **Querying public nodes** for detailed metrics via pRPC
   - Rate-limited to 50 concurrent operations
   - Batched health checks (10 at a time)
   - Tracks response times and success rates
4. **Using gossip as source of truth**
   - Status determined by gossip timestamp age
   - <5min = online, 5-8min = warning, >8min = offline
   - Works universally for all nodes
5. **Enriching data** with geolocation, credits, and health scores
   - Uptime scores from gossip-reported uptime
   - Performance scores from RPC call history
   - Geographic mapping for visualization
6. **Aggregating statistics** for network-wide insights
   - Separates IP count from pubkey count
   - Tracks public vs private distribution
   - Calculates network health and performance
7. **Caching results** for fast frontend access
8. **Recording history** for trend analysis

The result is a powerful analytics platform that accurately represents both the physical network topology (IPs) and the logical validator network (pubkeys), helping operators, developers, and users understand the Xandeum network at a glance—or dive deep into individual node performance.
