/**
 * Centralized logging configuration to enable/disable logging features globally.
 * Nested structure: each category has its own types toggle.
 */
export const LOG_CONFIG = {
	enabled: true, // Global toggle
	categories: {
		Restaurant: {
			enabled: true,
			types: {
				Creation: true,
				Deletion: true,
				Suspension: true,
				Activation: true,
				Updation: true,
				Assignment: true,
				Reassignment: true,
			},
		},
		Employee: {
			enabled: true,
			types: {
				Creation: true,
				Deletion: true,
				Suspension: true,
				Activation: true,
				Updation: true,
				Reassignment: true,
				Assignment: true,
				"Connection status": true,
				GrubLock: true,
				Alerts: true,
				"Employee mgmt.": true,
				"Box mgmt.": true,
				"Restaurant mgmt.": true,
			},
		},
		GrubPac: {
			enabled: true,
			types: {
				Creation: true,
				Deletion: true,
				Suspension: true,
				Activation: true,
				Updation: true,
				Reassignment: true,
				Assignment: true,
				Ownership: true,
				"Box status": true,
				"Connection status": true,
				"Door status": true,
				GrubLock: true,
				"Temperature set": true,
				"Temp. self check": true,
				"Ioniser status": true,
				"Battery status": true,
				"Battery self check": true,
				"Emergency unlock": true,
				OTP: true,
			},
		},
		GrubLock: {
			enabled: true,
			types: {
				Status: true,
				"Emergency unlock": true,
				Updation: true,
				OTP: true,
			},
		},
		Profile: {
			enabled: true,
			types: {
				Updation: true,
				"Connection status": true,
				Access: true,
				Creation: true,
				Suspension: true,
				Activation: true,
				Reassignment: true,
				Assignment: true,
			},
		},
	},
	other_types: {
		// Placeholders for future types not tied to a category
		General: true,
	},
};

export type LogConfig = typeof LOG_CONFIG;
