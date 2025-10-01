FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev sqlite-dev

# Copy go mod files
COPY go.mod go.sum* ./
RUN go mod download || go mod tidy

# Copy source
COPY . .

# Build
RUN CGO_ENABLED=1 GOOS=linux go build -o whatsmeow-service main.go

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates sqlite-libs

WORKDIR /root/

# Copy binary
COPY --from=builder /app/whatsmeow-service .

# Create storage directory
RUN mkdir -p storages

EXPOSE 8001

CMD ["./whatsmeow-service"]
