package services

import (
	"math"
	"sync"

	"xand/models"
)

type TopologyService struct {
	cache      *CacheService
	discovery  *NodeDiscovery
	peerGraph  map[string][]string // NodeID -> []PeerIDs
	graphMutex sync.RWMutex
}

func NewTopologyService(cache *CacheService, discovery *NodeDiscovery) *TopologyService {
	return &TopologyService{
		cache:     cache,
		discovery: discovery,
		peerGraph: make(map[string][]string),
	}
}

// BuildTopology constructs the network graph
func (ts *TopologyService) BuildTopology() models.NetworkTopology {
	nodes, _, found := ts.cache.GetNodes(true)
	if !found {
		return models.NetworkTopology{
			Nodes: []models.TopologyNode{},
			Edges: []models.TopologyEdge{},
			Stats: models.TopologyStats{},
		}
	}

	topology := models.NetworkTopology{
		Nodes: make([]models.TopologyNode, 0),
		Edges: make([]models.TopologyEdge, 0),
	}

	// Build topology nodes
	nodeMap := make(map[string]*models.Node)
	for _, node := range nodes {
		nodeMap[node.ID] = node
		
		tNode := models.TopologyNode{
			ID:        node.ID,
			Address:   node.Address,
			Status:    node.Status,
			Country:   node.Country,
			City:      node.City,
			Lat:       node.Lat,
			Lon:       node.Lon,
			Version:   node.Version,
			PeerCount: 0, // Will be calculated
		}
		topology.Nodes = append(topology.Nodes, tNode)
	}

	// Build edges from peer relationships
	// In a real implementation, we'd track actual peer connections
	// For now, we'll create a simulated topology based on geography
	ts.graphMutex.RLock()
	peerGraph := make(map[string][]string)
	for k, v := range ts.peerGraph {
		peerGraph[k] = v
	}
	ts.graphMutex.RUnlock()

	// If we have tracked peer relationships, use them
	if len(peerGraph) > 0 {
		for sourceID, peerIDs := range peerGraph {
			for _, targetID := range peerIDs {
				if _, exists := nodeMap[targetID]; !exists {
					continue
				}

				sourceNode := nodeMap[sourceID]
				targetNode := nodeMap[targetID]

				edgeType := "local"
				if sourceNode.Country != targetNode.Country {
					edgeType = "bridge"
				}

				edge := models.TopologyEdge{
					Source:   sourceID,
					Target:   targetID,
					Type:     edgeType,
					Strength: 5, // Default strength
				}
				topology.Edges = append(topology.Edges, edge)
			}
		}
	} else {
		// Generate simulated topology based on proximity
		topology.Edges = ts.generateSimulatedTopology(nodes, nodeMap)
	}

	// Calculate peer counts
	peerCounts := make(map[string]int)
	for _, edge := range topology.Edges {
		peerCounts[edge.Source]++
		peerCounts[edge.Target]++
	}
	for i := range topology.Nodes {
		topology.Nodes[i].PeerCount = peerCounts[topology.Nodes[i].ID]
	}

	// Calculate stats
	topology.Stats = ts.calculateTopologyStats(topology)

	return topology
}

func (ts *TopologyService) generateSimulatedTopology(nodes []*models.Node, nodeMap map[string]*models.Node) []models.TopologyEdge {
	edges := make([]models.TopologyEdge, 0)

	// Connect each node to 3-6 closest nodes geographically
	for _, sourceNode := range nodes {
		if sourceNode.Lat == 0 && sourceNode.Lon == 0 {
			continue // Skip nodes without geolocation
		}

		distances := make([]struct {
			nodeID   string
			distance float64
		}, 0)

		// Calculate distances to all other nodes
		for _, targetNode := range nodes {
			if sourceNode.ID == targetNode.ID {
				continue
			}
			if targetNode.Lat == 0 && targetNode.Lon == 0 {
				continue
			}

			dist := ts.haversineDistance(
				sourceNode.Lat, sourceNode.Lon,
				targetNode.Lat, targetNode.Lon,
			)

			distances = append(distances, struct {
				nodeID   string
				distance float64
			}{targetNode.ID, dist})
		}

		// Sort by distance (simple bubble sort for small arrays)
		for i := 0; i < len(distances); i++ {
			for j := i + 1; j < len(distances); j++ {
				if distances[j].distance < distances[i].distance {
					distances[i], distances[j] = distances[j], distances[i]
				}
			}
		}

		// Connect to 3-6 nearest nodes
		numPeers := 3
		if len(distances) > 6 {
			numPeers = 5
		} else if len(distances) < 3 {
			numPeers = len(distances)
		}

		for i := 0; i < numPeers && i < len(distances); i++ {
			targetID := distances[i].nodeID
			targetNode := nodeMap[targetID]

			edgeType := "local"
			if sourceNode.Country != targetNode.Country {
				edgeType = "bridge"
			}

			// Calculate strength based on distance (closer = stronger)
			strength := 10
			if distances[i].distance > 1000 {
				strength = 5
			} else if distances[i].distance > 5000 {
				strength = 3
			}

			edge := models.TopologyEdge{
				Source:   sourceNode.ID,
				Target:   targetID,
				Type:     edgeType,
				Strength: strength,
			}
			edges = append(edges, edge)
		}
	}

	return edges
}

func (ts *TopologyService) calculateTopologyStats(topology models.NetworkTopology) models.TopologyStats {
	stats := models.TopologyStats{
		TotalConnections: len(topology.Edges),
	}

	// Count local vs bridge
	for _, edge := range topology.Edges {
		if edge.Type == "local" {
			stats.LocalConnections++
		} else {
			stats.BridgeConnections++
		}
	}

	// Average connections per node
	if len(topology.Nodes) > 0 {
		stats.AverageConnections = float64(stats.TotalConnections*2) / float64(len(topology.Nodes))
	}

	// Network density (edges / max_possible_edges)
	maxEdges := len(topology.Nodes) * (len(topology.Nodes) - 1) / 2
	if maxEdges > 0 {
		stats.NetworkDensity = float64(stats.TotalConnections) / float64(maxEdges)
	}

	// Largest connected component (simplified)
	stats.LargestComponent = len(topology.Nodes) // Assume all connected for simplicity

	return stats
}

// UpdatePeerGraph updates the tracked peer relationships
func (ts *TopologyService) UpdatePeerGraph(nodeID string, peers []string) {
	ts.graphMutex.Lock()
	defer ts.graphMutex.Unlock()
	ts.peerGraph[nodeID] = peers
}

// GetRegionalClusters groups nodes by region
func (ts *TopologyService) GetRegionalClusters() []models.RegionalCluster {
	nodes, _, found := ts.cache.GetNodes(true)
	if !found {
		return []models.RegionalCluster{}
	}

	// Group nodes by country
	countryMap := make(map[string][]string)
	for _, node := range nodes {
		if node.Country == "" {
			continue
		}
		countryMap[node.Country] = append(countryMap[node.Country], node.ID)
	}

	clusters := make([]models.RegionalCluster, 0)
	for country, nodeIDs := range countryMap {
		cluster := models.RegionalCluster{
			Region:    country,
			NodeCount: len(nodeIDs),
			NodeIDs:   nodeIDs,
		}
		clusters = append(clusters, cluster)
	}

	return clusters
}

// haversineDistance calculates distance between two lat/lon points in km
func (ts *TopologyService) haversineDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadius = 6371.0 // km

	dLat := (lat2 - lat1) * math.Pi / 180.0
	dLon := (lon2 - lon1) * math.Pi / 180.0

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180.0)*math.Cos(lat2*math.Pi/180.0)*
			math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return earthRadius * c
}