package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/mattn/go-sqlite3"
	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/store/sqlstore"
	"go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
	waProto "go.mau.fi/whatsmeow/binary/proto"
	waLog "go.mau.fi/whatsmeow/util/log"
	"google.golang.org/protobuf/proto"
)

var (
	waClient         *whatsmeow.Client
	nextjsWebhookURL = getEnv("NEXTJS_WEBHOOK_URL", "http://localhost:5000/api/webhook/whatsmeow")
	webhookSecret    = getEnv("WEBHOOK_SECRET", "default-secret")
)

type MessageRequest struct {
	To      string `json:"to"`
	Message string `json:"message"`
}

type PollRequest struct {
	To         string   `json:"to"`
	Name       string   `json:"name"`
	Options    []string `json:"options"`
	MaxChoices int      `json:"maxChoices"`
}

type ButtonRequest struct {
	To      string   `json:"to"`
	Body    string   `json:"body"`
	Footer  string   `json:"footer"`
	Buttons []string `json:"buttons"`
}

type WebhookPayload struct {
	Type      string                 `json:"type"`
	From      string                 `json:"from"`
	MessageID string                 `json:"messageId"`
	Timestamp int64                  `json:"timestamp"`
	Data      map[string]interface{} `json:"data"`
}

func main() {
	log.Println("🚀 Starting whatsmeow service...")

	// Initialize database
	dbLog := waLog.Stdout("Database", "INFO", true)
	container, err := sqlstore.New("sqlite3", "file:storages/whatsapp.db?_foreign_keys=on", dbLog)
	if err != nil {
		log.Fatalf("❌ Failed to initialize database: %v", err)
	}

	// Get or create device
	deviceStore, err := container.GetFirstDevice()
	if err != nil {
		log.Fatalf("❌ Failed to get device: %v", err)
	}

	// Create client
	clientLog := waLog.Stdout("Client", "INFO", true)
	waClient = whatsmeow.NewClient(deviceStore, clientLog)

	// Register event handler
	waClient.AddEventHandler(handleWhatsAppEvent)

	// Connect to WhatsApp
	if waClient.Store.ID == nil {
		// New device - need QR code
		log.Println("📱 New device detected, generating QR code...")
		qrChan, _ := waClient.GetQRChannel(context.Background())
		err = waClient.Connect()
		if err != nil {
			log.Fatalf("❌ Failed to connect: %v", err)
		}

		for evt := range qrChan {
			if evt.Event == "code" {
				log.Printf("📲 QR Code: %s", evt.Code)
				saveQRCode(evt.Code)
			} else {
				log.Printf("🔐 Login event: %s", evt.Event)
			}
		}
	} else {
		// Existing session
		log.Println("🔄 Connecting with existing session...")
		err = waClient.Connect()
		if err != nil {
			log.Fatalf("❌ Failed to connect: %v", err)
		}
	}

	// Setup HTTP server
	http.HandleFunc("/api/send-message", corsMiddleware(sendMessageHandler))
	http.HandleFunc("/api/send-poll", corsMiddleware(sendPollHandler))
	http.HandleFunc("/api/send-buttons", corsMiddleware(sendButtonsHandler))
	http.HandleFunc("/api/health", corsMiddleware(healthHandler))
	http.HandleFunc("/api/qr", corsMiddleware(qrCodeHandler))
	http.HandleFunc("/api/status", corsMiddleware(statusHandler))

	// Start server
	port := getEnv("PORT", "8001")

	log.Printf("✅ whatsmeow service running on port %s", port)
	log.Printf("🔗 Webhook URL: %s", nextjsWebhookURL)

	go func() {
		if err := http.ListenAndServe(":"+port, nil); err != nil {
			log.Fatalf("❌ Server failed: %v", err)
		}
	}()

	// Wait for interrupt
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	log.Println("🛑 Shutting down...")
	waClient.Disconnect()
}

func handleWhatsAppEvent(evt interface{}) {
	switch v := evt.(type) {
	case *events.Message:
		handleIncomingMessage(v)
	case *events.Receipt:
		handleReceipt(v)
	case *events.Connected:
		log.Println("✅ Connected to WhatsApp")
	case *events.Disconnected:
		log.Println("⚠️  Disconnected from WhatsApp")
	case *events.LoggedOut:
		log.Println("🚪 Logged out from WhatsApp")
	}
}

func handleIncomingMessage(v *events.Message) {
	log.Printf("📨 Message from %s: %s", v.Info.Sender.User, v.Info.ID)

	// Extract message text
	var messageText string
	if v.Message.GetConversation() != "" {
		messageText = v.Message.GetConversation()
	} else if v.Message.GetExtendedTextMessage() != nil {
		messageText = v.Message.GetExtendedTextMessage().GetText()
	}

	// Prepare webhook payload
	payload := WebhookPayload{
		Type:      "message",
		From:      v.Info.Sender.User,
		MessageID: v.Info.ID,
		Timestamp: v.Info.Timestamp.Unix(),
		Data: map[string]interface{}{
			"text":      messageText,
			"chat":      v.Info.Chat.User,
			"isGroup":   v.Info.IsGroup,
			"fromMe":    v.Info.IsFromMe,
			"pushName":  v.Info.PushName,
			"messageType": getMessageType(v.Message),
		},
	}

	// Send to Next.js webhook
	sendToNextJS(payload)
}

func handleReceipt(v *events.Receipt) {
	log.Printf("✓ Receipt: %s - %s", v.MessageIDs[0], v.Type)
}

func sendToNextJS(payload WebhookPayload) {
	if nextjsWebhookURL == "" {
		return
	}

	jsonData, _ := json.Marshal(payload)

	client := &http.Client{Timeout: 5 * time.Second}
	req, _ := http.NewRequest("POST", nextjsWebhookURL, bytes.NewBuffer(jsonData))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Webhook-Secret", webhookSecret)

	resp, err := client.Do(req)
	if err != nil {
		log.Printf("❌ Failed to send to Next.js: %v", err)
		return
	}
	defer resp.Body.Close()

	log.Printf("✅ Sent to Next.js: %d", resp.StatusCode)
}

func sendMessageHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req MessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Parse JID
	jid, err := types.ParseJID(req.To)
	if err != nil {
		http.Error(w, "Invalid phone number", http.StatusBadRequest)
		return
	}

	// Send message
	msg := &waProto.Message{
		Conversation: proto.String(req.Message),
	}

	resp, err := waClient.SendMessage(context.Background(), jid, msg)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to send: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"messageId": resp.ID,
		"timestamp": resp.Timestamp.Unix(),
	})
}

func sendPollHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req PollRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	jid, err := types.ParseJID(req.To)
	if err != nil {
		http.Error(w, "Invalid phone number", http.StatusBadRequest)
		return
	}

	// Build poll
	pollOptions := make([]*waProto.PollCreationMessage_Option, len(req.Options))
	for i, opt := range req.Options {
		pollOptions[i] = &waProto.PollCreationMessage_Option{
			OptionName: proto.String(opt),
		}
	}

	msg := &waProto.Message{
		PollCreationMessage: &waProto.PollCreationMessage{
			Name:                   proto.String(req.Name),
			Options:                pollOptions,
			SelectableOptionsCount: proto.Uint32(uint32(req.MaxChoices)),
		},
	}

	resp, err := waClient.SendMessage(context.Background(), jid, msg)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to send poll: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"messageId": resp.ID,
	})
}

func sendButtonsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ButtonRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	jid, err := types.ParseJID(req.To)
	if err != nil {
		http.Error(w, "Invalid phone number", http.StatusBadRequest)
		return
	}

	// Build buttons
	buttons := make([]*waProto.ButtonsMessage_Button, len(req.Buttons))
	for i, btnText := range req.Buttons {
		buttons[i] = &waProto.ButtonsMessage_Button{
			ButtonId: proto.String(fmt.Sprintf("btn_%d", i)),
			ButtonText: &waProto.ButtonsMessage_Button_ButtonText{
				DisplayText: proto.String(btnText),
			},
			Type: waProto.ButtonsMessage_Button_RESPONSE.Enum(),
		}
	}

	msg := &waProto.Message{
		ButtonsMessage: &waProto.ButtonsMessage{
			ContentText: proto.String(req.Body),
			FooterText:  proto.String(req.Footer),
			Buttons:     buttons,
		},
	}

	resp, err := waClient.SendMessage(context.Background(), jid, msg)
	if err != nil {
		http.Error(w, fmt.Sprintf("Failed to send buttons: %v", err), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":   true,
		"messageId": resp.ID,
	})
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	status := map[string]interface{}{
		"status":    "healthy",
		"timestamp": time.Now().Unix(),
		"connected": waClient.IsConnected(),
		"service":   "whatsmeow",
		"version":   "1.0.0",
	}

	if !waClient.IsConnected() {
		status["status"] = "unhealthy"
		w.WriteHeader(http.StatusServiceUnavailable)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

func statusHandler(w http.ResponseWriter, r *http.Request) {
	info := map[string]interface{}{
		"connected":    waClient.IsConnected(),
		"loggedIn":     waClient.Store.ID != nil,
		"pushName":     waClient.Store.PushName,
		"platform":     waClient.Store.Platform,
		"businessName": waClient.Store.BusinessName,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(info)
}

func qrCodeHandler(w http.ResponseWriter, r *http.Request) {
	qrCode, err := loadQRCode()
	if err != nil {
		http.Error(w, "No QR code available", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"qrCode": qrCode,
	})
}

func saveQRCode(code string) {
	os.MkdirAll("storages", 0755)
	os.WriteFile("storages/qr_code.txt", []byte(code), 0644)
}

func loadQRCode() (string, error) {
	data, err := os.ReadFile("storages/qr_code.txt")
	if err != nil {
		return "", err
	}
	return string(data), nil
}

func getMessageType(msg *waProto.Message) string {
	if msg.GetConversation() != "" {
		return "text"
	}
	if msg.GetImageMessage() != nil {
		return "image"
	}
	if msg.GetVideoMessage() != nil {
		return "video"
	}
	if msg.GetAudioMessage() != nil {
		return "audio"
	}
	if msg.GetDocumentMessage() != nil {
		return "document"
	}
	if msg.GetStickerMessage() != nil {
		return "sticker"
	}
	return "unknown"
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func corsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next(w, r)
	}
}
