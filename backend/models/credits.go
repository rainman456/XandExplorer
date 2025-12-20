package models

import "time"

// PodCredits represents the reputation/reliability score for a pNode
type PodCredits struct {
	Pubkey         string    `json:"pubkey" bson:"pubkey"`
	Credits        int64     `json:"credits" bson:"credits"`
	LastUpdated    time.Time `json:"last_updated" bson:"last_updated"`
	Rank           int       `json:"rank,omitempty" bson:"rank,omitempty"`
	CreditsChange  int64     `json:"credits_change,omitempty" bson:"credits_change,omitempty"` // Change since last check
}

// PodCreditsResponse from the API
type PodCreditsResponse struct {
	Pods       []PodCreditsEntry `json:"pods"`
	TotalCount int               `json:"total_count"`
	UpdatedAt  time.Time         `json:"updated_at"`
}

type PodCreditsEntry struct {
	Pubkey  string `json:"pubkey"`
	Credits int64  `json:"credits"`
}