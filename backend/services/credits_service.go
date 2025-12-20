package services

import (
	"context"
	"encoding/json"
	//"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"xand/models"
)

type CreditsService struct {
	httpClient    *http.Client
	credits       map[string]*models.PodCredits // Key: pubkey
	creditsMutex  sync.RWMutex
	stopChan      chan struct{}
	apiEndpoint   string
}

func NewCreditsService() *CreditsService {
	return &CreditsService{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		credits:     make(map[string]*models.PodCredits),
		stopChan:    make(chan struct{}),
		apiEndpoint: "https://podcredits.xandeum.network/api/pods-credits",
	}
}

func (cs *CreditsService) Start() {
	log.Println("Starting Pod Credits Service (updates every 30 seconds)...")
	
	// Initial fetch
	cs.fetchCredits()
	
	// Update every 30 seconds (as per Discord info)
	ticker := time.NewTicker(30 * time.Second)
	
	go func() {
		for {
			select {
			case <-ticker.C:
				cs.fetchCredits()
			case <-cs.stopChan:
				ticker.Stop()
				log.Println("Pod Credits Service stopped")
				return
			}
		}
	}()
}

func (cs *CreditsService) Stop() {
	close(cs.stopChan)
}

func (cs *CreditsService) fetchCredits() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", cs.apiEndpoint, nil)
	if err != nil {
		log.Printf("Error creating credits request: %v", err)
		return
	}

	resp, err := cs.httpClient.Do(req)
	if err != nil {
		log.Printf("Error fetching pod credits: %v", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("Pod credits API returned status %d", resp.StatusCode)
		return
	}

	var creditsResp models.PodCreditsResponse
	if err := json.NewDecoder(resp.Body).Decode(&creditsResp); err != nil {
		log.Printf("Error decoding credits response: %v", err)
		return
	}

	// Update credits map
	cs.creditsMutex.Lock()
	defer cs.creditsMutex.Unlock()

	newCredits := make(map[string]*models.PodCredits)
	
	for i, entry := range creditsResp.Pods {
		oldCredits := int64(0)
		if existing, exists := cs.credits[entry.Pubkey]; exists {
			oldCredits = existing.Credits
		}

		newCredits[entry.Pubkey] = &models.PodCredits{
			Pubkey:        entry.Pubkey,
			Credits:       entry.Credits,
			LastUpdated:   time.Now(),
			Rank:          i + 1, // Position in the list
			CreditsChange: entry.Credits - oldCredits,
		}
	}

	cs.credits = newCredits
	log.Printf("Updated pod credits: %d nodes tracked", len(cs.credits))
}

// GetCredits returns credits for a specific pubkey
func (cs *CreditsService) GetCredits(pubkey string) (*models.PodCredits, bool) {
	cs.creditsMutex.RLock()
	defer cs.creditsMutex.RUnlock()
	
	credits, exists := cs.credits[pubkey]
	return credits, exists
}

// GetAllCredits returns all pod credits
func (cs *CreditsService) GetAllCredits() []*models.PodCredits {
	cs.creditsMutex.RLock()
	defer cs.creditsMutex.RUnlock()
	
	result := make([]*models.PodCredits, 0, len(cs.credits))
	for _, c := range cs.credits {
		result = append(result, c)
	}
	return result
}

// GetTopCredits returns top N nodes by credits
func (cs *CreditsService) GetTopCredits(limit int) []*models.PodCredits {
	cs.creditsMutex.RLock()
	defer cs.creditsMutex.RUnlock()
	
	// Already ranked, just return top N
	result := make([]*models.PodCredits, 0, limit)
	for _, c := range cs.credits {
		if c.Rank <= limit {
			result = append(result, c)
		}
		if len(result) >= limit {
			break
		}
	}
	return result
}