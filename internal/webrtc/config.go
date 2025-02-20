package webrtc

import (
	"os"
	"strconv"
	"strings"

	"github.com/pion/webrtc/v4"
)

type BitrateOption int

const (
	Bitrate2Mbps  BitrateOption = 2000000
	Bitrate5Mbps  BitrateOption = 5000000
	Bitrate10Mbps BitrateOption = 10000000
	Bitrate15Mbps BitrateOption = 15000000
	Bitrate20Mbps BitrateOption = 20000000
	Bitrate25Mbps BitrateOption = 25000000
	Bitrate30Mbps BitrateOption = 30000000
)

type AudioQuality struct {
	DisableEchoCancellation bool
	DisableNoiseSuppression bool
	DisableAGC              bool
	SampleRate              int
	Channels                int
}

type WebRTCConfig struct {
	// Video settings
	MaxBitrate      BitrateOption
	PreferredCodecs []string

	// Audio settings
	AudioQuality AudioQuality

	// Custom endpoint
	CustomEndpoint string
}

var defaultConfig = WebRTCConfig{
	MaxBitrate:      Bitrate30Mbps,
	PreferredCodecs: []string{webrtc.MimeTypeH264, webrtc.MimeTypeH265, webrtc.MimeTypeVP9},
	AudioQuality: AudioQuality{
		DisableEchoCancellation: true,
		DisableNoiseSuppression: true,
		DisableAGC:              true,
		SampleRate:              48000,
		Channels:                2,
	},
}

func loadConfigFromEnv() WebRTCConfig {
	config := defaultConfig

	// Load bitrate setting
	if bitrateStr := os.Getenv("WEBRTC_MAX_BITRATE"); bitrateStr != "" {
		if bitrate, err := strconv.Atoi(bitrateStr); err == nil {
			config.MaxBitrate = BitrateOption(bitrate)
		}
	}

	// Load preferred codecs
	if codecsStr := os.Getenv("WEBRTC_PREFERRED_CODECS"); codecsStr != "" {
		config.PreferredCodecs = strings.Split(codecsStr, ",")
	}

	// Load audio settings
	if os.Getenv("WEBRTC_DISABLE_ECHO_CANCELLATION") != "" {
		config.AudioQuality.DisableEchoCancellation = true
	}
	if os.Getenv("WEBRTC_DISABLE_NOISE_SUPPRESSION") != "" {
		config.AudioQuality.DisableNoiseSuppression = true
	}
	if os.Getenv("WEBRTC_DISABLE_AGC") != "" {
		config.AudioQuality.DisableAGC = true
	}
	if sampleRate := os.Getenv("WEBRTC_AUDIO_SAMPLE_RATE"); sampleRate != "" {
		if rate, err := strconv.Atoi(sampleRate); err == nil {
			config.AudioQuality.SampleRate = rate
		}
	}
	if channels := os.Getenv("WEBRTC_AUDIO_CHANNELS"); channels != "" {
		if ch, err := strconv.Atoi(channels); err == nil {
			config.AudioQuality.Channels = ch
		}
	}

	// Load custom endpoint
	if endpoint := os.Getenv("WEBRTC_CUSTOM_ENDPOINT"); endpoint != "" {
		config.CustomEndpoint = endpoint
	}

	return config
}

var currentConfig = loadConfigFromEnv()
