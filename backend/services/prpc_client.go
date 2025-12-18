package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"xand/config"
	"xand/models"
)

// PRPCClient handles communication with pNodes
type PRPCClient struct {
	config     *config.Config
	httpClient *http.Client
}

// NewPRPCClient creates a new client
func NewPRPCClient(cfg *config.Config) *PRPCClient {
	return &PRPCClient{
		config: cfg,
		httpClient: &http.Client{
			Timeout: cfg.PRPCTimeoutDuration(),
		},
	}
}

// CallPRPC makes a generic JSON-RPC 2.0 call
func (c *PRPCClient) CallPRPC(nodeIP string, method string, params interface{}) (*models.RPCResponse, error) {
	// 1. Build Payload
	reqBody := models.RPCRequest{
		JSONRPC: "2.0",
		Method:  method,
		Params:  params,
		ID:      1,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// 2. Construct URL
	url := fmt.Sprintf("http://%s/rpc", nodeIP)

	// 3. Execute with Retry
	var resp *http.Response

	delay := 200 * time.Millisecond
	maxRetries := c.config.PRPC.MaxRetries
	if maxRetries <= 0 {
		maxRetries = 1
	}

	for i := 0; i < maxRetries; i++ {
		// Re-create request for each attempt
		httpReq, reqErr := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
		if reqErr != nil {
			err = fmt.Errorf("failed to create request: %w", reqErr)
			break
		}
		httpReq.Header.Set("Content-Type", "application/json")

		resp, err = c.httpClient.Do(httpReq)
		if err == nil {
			// Check for server-side errors that might justify retry (5xx, 429)
			if resp.StatusCode >= 500 || resp.StatusCode == 429 {
				resp.Body.Close()
				err = fmt.Errorf("server error: %d", resp.StatusCode)
				// fallthrough to retry
			} else {
				break // Success (at network level)
			}
		}

		if i < maxRetries-1 {
			time.Sleep(delay)
			delay *= 2
		}
	}

	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("http error: %d", resp.StatusCode)
	}

	// 5. Decode Response
	var rpcResp models.RPCResponse
	if err := json.NewDecoder(resp.Body).Decode(&rpcResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// 6. Check RPC Error
	if rpcResp.Error != nil {
		return &rpcResp, fmt.Errorf("rpc error %d: %s", rpcResp.Error.Code, rpcResp.Error.Message)
	}

	return &rpcResp, nil
}

// GetVersion calls "get_version"
func (c *PRPCClient) GetVersion(nodeIP string) (*models.VersionResponse, error) {
	resp, err := c.CallPRPC(nodeIP, "get_version", nil)
	if err != nil {
		return nil, err
	}

	var verResp models.VersionResponse
	if err := json.Unmarshal(resp.Result, &verResp); err != nil {
		return nil, fmt.Errorf("failed to list unmarshal version result: %w", err)
	}
	return &verResp, nil
}

// GetStats calls "get_stats"
func (c *PRPCClient) GetStats(nodeIP string) (*models.PRPCStatsResponse, error) {
	resp, err := c.CallPRPC(nodeIP, "get_stats", nil)
	if err != nil {
		return nil, err
	}

	var statsResp models.PRPCStatsResponse
	if err := json.Unmarshal(resp.Result, &statsResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal stats result: %w", err)
	}
	return &statsResp, nil
}

// GetPods calls "get_pods"
func (c *PRPCClient) GetPods(nodeIP string) (*models.PodsResponse, error) {
	resp, err := c.CallPRPC(nodeIP, "get-pods-with-stats", nil)
	if err != nil {
		return nil, err
	}

	var podsResp models.PodsResponse
	if err := json.Unmarshal(resp.Result, &podsResp); err != nil {
		return nil, fmt.Errorf("failed to unmarshal pods result: %w", err)
	}
	return &podsResp, nil
}
