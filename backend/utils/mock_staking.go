package utils

import (
	"math/rand"
	"time"
)

// MockStakingGenerator handles generation of mock staking metrics
type MockStakingGenerator struct {
	rnd *rand.Rand
}

func NewMockStakingGenerator() *MockStakingGenerator {
	return &MockStakingGenerator{
		rnd: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// GenerateMetrics returns mocked stake, commission, boost, and APY
func (g *MockStakingGenerator) GenerateMetrics() (stake float64, commission float64, boost float64, apy float64) {
	// Stake: 100K - 5M
	stake = 100000 + g.rnd.Float64()*(5000000-100000)

	// Commission: 5% - 15%
	commission = 5 + g.rnd.Float64()*(15-5)

	// Boost: 16, 176, or 11
	boosts := []float64{11, 16, 176}
	boost = boosts[g.rnd.Intn(len(boosts))]

	// APY: Mock calculation
	// Base 4% + Boost/100 + (Commission inverse influence)
	// Just a reasonable range 6% - 18%
	apy = 6 + g.rnd.Float64()*(18-6)

	return
}
