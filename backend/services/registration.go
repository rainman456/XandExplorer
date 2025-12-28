// package services

// import (
// 	"encoding/csv"
// 	"fmt"
// 	"log"
// 	"os"
// 	"strings"
// 	"sync"
// )

// type RegistrationService struct {
// 	registeredPubkeys map[string]bool
// 	mutex             sync.RWMutex
// 	csvPath           string
// }

// // NewRegistrationService creates a new registration service from a CSV file
// // CSV format: single column with pubkey per line (optional header)
// func NewRegistrationService(csvPath string) (*RegistrationService, error) {
// 	rs := &RegistrationService{
// 		registeredPubkeys: make(map[string]bool),
// 		csvPath:           csvPath,
// 	}
	
// 	if csvPath == "" {
// 		log.Println("No registration CSV provided, all nodes will be unregistered")
// 		return rs, nil
// 	}
	
// 	if err := rs.loadCSV(); err != nil {
// 		return nil, fmt.Errorf("failed to load registration CSV: %w", err)
// 	}
	
// 	log.Printf("✓ Registration service loaded %d registered pubkeys from %s", 
// 		len(rs.registeredPubkeys), csvPath)
	
// 	return rs, nil
// }

// func (rs *RegistrationService) loadCSV() error {
// 	file, err := os.Open(rs.csvPath)
// 	if err != nil {
// 		return err
// 	}
// 	defer file.Close()
	
// 	reader := csv.NewReader(file)
// 	reader.TrimLeadingSpace = true
	
// 	records, err := reader.ReadAll()
// 	if err != nil {
// 		return err
// 	}
	
// 	rs.mutex.Lock()
// 	defer rs.mutex.Unlock()
	
// 	for i, record := range records {
// 		// Skip empty lines
// 		if len(record) == 0 {
// 			continue
// 		}
		
// 		pubkey := strings.TrimSpace(record[0])
		
// 		// Skip header (if first line looks like "pubkey" or "public_key")
// 		if i == 0 && (strings.ToLower(pubkey) == "pubkey" || 
// 			strings.ToLower(pubkey) == "public_key" ||
// 			strings.ToLower(pubkey) == "pod_id") {
// 			continue
// 		}
		
// 		// Skip empty pubkeys
// 		if pubkey == "" {
// 			continue
// 		}
		
// 		rs.registeredPubkeys[pubkey] = true
// 	}
	
// 	return nil
// }

// // IsRegistered checks if a pubkey is in the registration list
// func (rs *RegistrationService) IsRegistered(pubkey string) bool {
// 	if pubkey == "" {
// 		return false
// 	}
	
// 	rs.mutex.RLock()
// 	defer rs.mutex.RUnlock()
	
// 	return rs.registeredPubkeys[pubkey]
// }

// // GetRegisteredCount returns the total number of registered pubkeys
// func (rs *RegistrationService) GetRegisteredCount() int {
// 	rs.mutex.RLock()
// 	defer rs.mutex.RUnlock()
	
// 	return len(rs.registeredPubkeys)
// }

// // Reload reloads the CSV file (useful for updates without restart)
// func (rs *RegistrationService) Reload() error {
// 	if rs.csvPath == "" {
// 		return nil
// 	}
	
// 	rs.mutex.Lock()
// 	rs.registeredPubkeys = make(map[string]bool)
// 	rs.mutex.Unlock()
	
// 	return rs.loadCSV()
// }


package services

import (
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
)

type RegistrationService struct {
	registeredPubkeys map[string]string // pubkey -> registered time
	mutex             sync.RWMutex
	csvPath           string
}

// NewRegistrationService creates a new registration service from a CSV file
// CSV format: Index, pNode Identity Pubkey, Manager, Registered Time, Version
func NewRegistrationService(csvPath string) (*RegistrationService, error) {
	rs := &RegistrationService{
		registeredPubkeys: make(map[string]string),
		csvPath:           csvPath,
	}
	
	if csvPath == "" {
		log.Println("No registration CSV provided, all nodes will be unregistered")
		return rs, nil
	}
	
	if err := rs.loadCSV(); err != nil {
		return nil, fmt.Errorf("failed to load registration CSV: %w", err)
	}
	
	log.Printf("✓ Registration service loaded %d registered pubkeys from %s", 
		len(rs.registeredPubkeys), csvPath)
	
	return rs, nil
}

func (rs *RegistrationService) loadCSV() error {
	file, err := os.Open(rs.csvPath)
	if err != nil {
		return err
	}
	defer file.Close()
	
	reader := csv.NewReader(file)
	reader.TrimLeadingSpace = true
	
	records, err := reader.ReadAll()
	if err != nil {
		return err
	}
	
	rs.mutex.Lock()
	defer rs.mutex.Unlock()
	
	for i, record := range records {
		// Skip empty lines or incomplete records
		if len(record) < 5 {
			continue
		}
		
		// Skip header if first line looks like "Index"
		if i == 0 && strings.ToLower(strings.TrimSpace(record[0])) == "index" {
			continue
		}
		
		pubkey := strings.TrimSpace(record[1])
		registeredTime := strings.TrimSpace(record[3])
		
		// Skip empty pubkeys
		if pubkey == "" {
			continue
		}
		
		rs.registeredPubkeys[pubkey] = registeredTime
	}
	
	return nil
}

// IsRegistered checks if a pubkey is in the registration list
func (rs *RegistrationService) IsRegistered(pubkey string) bool {
	if pubkey == "" {
		return false
	}
	
	rs.mutex.RLock()
	defer rs.mutex.RUnlock()
	
	_, ok := rs.registeredPubkeys[pubkey]
	return ok
}

// GetRegisteredCount returns the total number of registered pubkeys
func (rs *RegistrationService) GetRegisteredCount() int {
	rs.mutex.RLock()
	defer rs.mutex.RUnlock()
	
	return len(rs.registeredPubkeys)
}

// GetAllRegistered returns a map of all pNode Identity Pubkeys to their Registered Times
func (rs *RegistrationService) GetAllRegistered() map[string]string {
	rs.mutex.RLock()
	defer rs.mutex.RUnlock()
	
	copy := make(map[string]string, len(rs.registeredPubkeys))
	for k, v := range rs.registeredPubkeys {
		copy[k] = v
	}
	return copy
}

// Reload reloads the CSV file (useful for updates without restart)
func (rs *RegistrationService) Reload() error {
	if rs.csvPath == "" {
		return nil
	}
	
	rs.mutex.Lock()
	rs.registeredPubkeys = make(map[string]string)
	rs.mutex.Unlock()
	
	return rs.loadCSV()
}