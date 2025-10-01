"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppQRService = void 0;
var baileys_1 = __importStar(require("@whiskeysockets/baileys"));
var QRCode = __importStar(require("qrcode"));
var db_1 = require("../db");
var schema_1 = require("../db/schema");
var drizzle_orm_1 = require("drizzle-orm");
var path_1 = __importDefault(require("path"));
var promises_1 = __importDefault(require("fs/promises"));
var WhatsAppQRService = /** @class */ (function () {
    function WhatsAppQRService() {
        this.sessions = new Map();
    }
    WhatsAppQRService.getInstance = function () {
        if (!WhatsAppQRService.instance) {
            WhatsAppQRService.instance = new WhatsAppQRService();
        }
        return WhatsAppQRService.instance;
    };
    WhatsAppQRService.prototype.setSocketIO = function (io) {
        this.io = io;
        console.log('[WhatsApp QR] Socket.IO instance set successfully');
    };
    WhatsAppQRService.prototype.getSessionPath = function (connectionId) {
        return path_1.default.join(process.cwd(), 'whatsapp_sessions', connectionId);
    };
    WhatsAppQRService.prototype.connectSession = function (connectionId, companyId) {
        return __awaiter(this, void 0, void 0, function () {
            var sessionPath, _a, state, saveCreds, version, createSilentLogger, silentLogger, store, storeFile, storeData, err_1, socket;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        console.log("[WhatsApp QR] Starting connection for ".concat(connectionId, ", company: ").concat(companyId));
                        if (this.sessions.has(connectionId)) {
                            console.log("[WhatsApp QR] Session already active for connection ".concat(connectionId));
                            return [2 /*return*/];
                        }
                        if (!this.io) {
                            console.error('[WhatsApp QR] ERROR: Socket.IO not initialized before connecting session');
                        }
                        sessionPath = this.getSessionPath(connectionId);
                        // Ensure directory exists
                        return [4 /*yield*/, promises_1.default.mkdir(sessionPath, { recursive: true })];
                    case 1:
                        // Ensure directory exists
                        _b.sent();
                        return [4 /*yield*/, (0, baileys_1.useMultiFileAuthState)(sessionPath)];
                    case 2:
                        _a = _b.sent(), state = _a.state, saveCreds = _a.saveCreds;
                        return [4 /*yield*/, (0, baileys_1.fetchLatestBaileysVersion)()];
                    case 3:
                        version = (_b.sent()).version;
                        createSilentLogger = function () {
                            var logger = {
                                trace: function () { },
                                debug: function () { },
                                info: function () { },
                                warn: function () { },
                                error: function () { },
                                fatal: function () { },
                                level: 'silent',
                                child: function () { return createSilentLogger(); }
                            };
                            return logger;
                        };
                        silentLogger = createSilentLogger();
                        store = (0, baileys_1.makeInMemoryStore)({
                        // Removido logger: console para evitar erro
                        });
                        storeFile = path_1.default.join(sessionPath, 'store.json');
                        _b.label = 4;
                    case 4:
                        _b.trys.push([4, 6, , 7]);
                        return [4 /*yield*/, promises_1.default.readFile(storeFile, 'utf8')];
                    case 5:
                        storeData = _b.sent();
                        store.readFromFile(storeFile);
                        return [3 /*break*/, 7];
                    case 6:
                        err_1 = _b.sent();
                        return [3 /*break*/, 7];
                    case 7:
                        socket = (0, baileys_1.default)({
                            version: version,
                            auth: {
                                creds: state.creds,
                                keys: (0, baileys_1.makeCacheableSignalKeyStore)(state.keys, silentLogger),
                            },
                            logger: silentLogger,
                            printQRInTerminal: false,
                            generateHighQualityLinkPreview: true,
                        });
                        store.bind(socket.ev);
                        // Save store periodically
                        setInterval(function () {
                            store.writeToFile(storeFile);
                        }, 10000);
                        this.sessions.set(connectionId, {
                            socket: socket,
                            config: { connectionId: connectionId, companyId: companyId },
                            store: store,
                        });
                        // Handle connection events
                        socket.ev.on('connection.update', function (update) { return __awaiter(_this, void 0, void 0, function () {
                            var connection, lastDisconnect, qr, qrCode, error_1, shouldReconnect, phoneNumber;
                            var _this = this;
                            var _a, _b, _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        connection = update.connection, lastDisconnect = update.lastDisconnect, qr = update.qr;
                                        console.log("[WhatsApp QR] Connection update for ".concat(connectionId, ":"), {
                                            connection: connection,
                                            hasQR: !!qr,
                                            hasLastDisconnect: !!lastDisconnect
                                        });
                                        if (!qr) return [3 /*break*/, 4];
                                        console.log("[WhatsApp QR] QR Code received for connection ".concat(connectionId));
                                        _d.label = 1;
                                    case 1:
                                        _d.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, QRCode.toDataURL(qr)];
                                    case 2:
                                        qrCode = _d.sent();
                                        // Emit QR code via Socket.IO to company room only (SECURITY FIX)
                                        if (this.io) {
                                            // IMPORTANT: Emit apenas para a sala da empresa específica para isolamento multi-tenant
                                            console.log("[WhatsApp QR] Emitting QR to room company:".concat(companyId, " for connection ").concat(connectionId));
                                            this.io.to("company:".concat(companyId)).emit("whatsapp:qr:".concat(connectionId), {
                                                qrCode: qrCode,
                                                connectionId: connectionId
                                            });
                                            // Também emitir sem o connectionId para debug
                                            this.io.to("company:".concat(companyId)).emit('whatsapp:qr', {
                                                qrCode: qrCode,
                                                connectionId: connectionId
                                            });
                                        }
                                        else {
                                            console.error('[WhatsApp QR] ERROR: Socket.IO not initialized, cannot emit QR code');
                                        }
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_1 = _d.sent();
                                        console.error('[WhatsApp QR] Error generating QR code data URL:', error_1);
                                        return [3 /*break*/, 4];
                                    case 4:
                                        if (!(connection === 'close')) return [3 /*break*/, 8];
                                        shouldReconnect = ((_b = (_a = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode) !== baileys_1.DisconnectReason.loggedOut;
                                        if (!shouldReconnect) return [3 /*break*/, 5];
                                        console.log("Reconnecting session ".concat(connectionId, "..."));
                                        setTimeout(function () {
                                            _this.connectSession(connectionId, companyId);
                                        }, 5000);
                                        return [3 /*break*/, 7];
                                    case 5:
                                        console.log("Session ".concat(connectionId, " logged out, cleaning up..."));
                                        return [4 /*yield*/, this.disconnectSession(connectionId)];
                                    case 6:
                                        _d.sent();
                                        _d.label = 7;
                                    case 7: return [3 /*break*/, 10];
                                    case 8:
                                        if (!(connection === 'open')) return [3 /*break*/, 10];
                                        console.log("[WhatsApp QR] WhatsApp CONNECTED for ".concat(connectionId));
                                        phoneNumber = ((_c = socket.user) === null || _c === void 0 ? void 0 : _c.id.split('@')[0]) || '';
                                        console.log("[WhatsApp QR] Phone number: ".concat(phoneNumber));
                                        return [4 /*yield*/, db_1.db.update(schema_1.whatsappQrSessions)
                                                .set({
                                                phoneNumber: phoneNumber,
                                                isActive: true,
                                                lastConnectedAt: new Date(),
                                                updatedAt: new Date(),
                                            })
                                                .where((0, drizzle_orm_1.eq)(schema_1.whatsappQrSessions.connectionId, connectionId))];
                                    case 9:
                                        _d.sent();
                                        // Notify frontend of successful connection - only to company room (SECURITY FIX)
                                        if (this.io) {
                                            // IMPORTANT: Emit apenas para a sala da empresa específica para isolamento multi-tenant
                                            console.log("[WhatsApp QR] Emitting connected event to room company:".concat(companyId));
                                            this.io.to("company:".concat(companyId)).emit("whatsapp:connected:".concat(connectionId), {
                                                connectionId: connectionId,
                                                phoneNumber: phoneNumber,
                                                status: 'connected',
                                            });
                                        }
                                        else {
                                            console.error('[WhatsApp QR] ERROR: Socket.IO not initialized, cannot emit connected event');
                                        }
                                        _d.label = 10;
                                    case 10: return [2 /*return*/];
                                }
                            });
                        }); });
                        socket.ev.on('creds.update', saveCreds);
                        // Handle incoming messages
                        socket.ev.on('messages.upsert', function (messageUpdate) { return __awaiter(_this, void 0, void 0, function () {
                            var _i, _a, msg;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _i = 0, _a = messageUpdate.messages;
                                        _b.label = 1;
                                    case 1:
                                        if (!(_i < _a.length)) return [3 /*break*/, 4];
                                        msg = _a[_i];
                                        if (!msg.message || msg.key.fromMe)
                                            return [3 /*break*/, 3];
                                        return [4 /*yield*/, this.handleIncomingMessage(msg, connectionId, companyId)];
                                    case 2:
                                        _b.sent();
                                        _b.label = 3;
                                    case 3:
                                        _i++;
                                        return [3 /*break*/, 1];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); });
                        // Handle message status updates
                        socket.ev.on('messages.update', function (messageUpdates) { return __awaiter(_this, void 0, void 0, function () {
                            var _i, messageUpdates_1, update;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _i = 0, messageUpdates_1 = messageUpdates;
                                        _a.label = 1;
                                    case 1:
                                        if (!(_i < messageUpdates_1.length)) return [3 /*break*/, 4];
                                        update = messageUpdates_1[_i];
                                        return [4 /*yield*/, this.handleMessageStatusUpdate(update)];
                                    case 2:
                                        _a.sent();
                                        _a.label = 3;
                                    case 3:
                                        _i++;
                                        return [3 /*break*/, 1];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); });
                        return [2 /*return*/];
                }
            });
        });
    };
    WhatsAppQRService.prototype.handleIncomingMessage = function (msg, connectionId, companyId) {
        return __awaiter(this, void 0, void 0, function () {
            var fromNumber, messageText, contact, newContact, conversation, newConversation, error_2;
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        fromNumber = ((_a = msg.key.remoteJid) === null || _a === void 0 ? void 0 : _a.split('@')[0]) || '';
                        messageText = ((_b = msg.message) === null || _b === void 0 ? void 0 : _b.conversation) ||
                            ((_d = (_c = msg.message) === null || _c === void 0 ? void 0 : _c.extendedTextMessage) === null || _d === void 0 ? void 0 : _d.text) ||
                            '';
                        if (!fromNumber || !messageText)
                            return [2 /*return*/];
                        _e.label = 1;
                    case 1:
                        _e.trys.push([1, 9, , 10]);
                        return [4 /*yield*/, db_1.db.select().from(schema_1.contacts)
                                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.contacts.phone, fromNumber), (0, drizzle_orm_1.eq)(schema_1.contacts.companyId, companyId)))
                                .limit(1)];
                    case 2:
                        contact = _e.sent();
                        if (!!contact.length) return [3 /*break*/, 4];
                        return [4 /*yield*/, db_1.db.insert(schema_1.contacts)
                                .values({
                                companyId: companyId,
                                name: msg.pushName || fromNumber,
                                phone: fromNumber,
                            })
                                .returning()];
                    case 3:
                        newContact = (_e.sent())[0];
                        contact = [newContact];
                        _e.label = 4;
                    case 4: return [4 /*yield*/, db_1.db.select().from(schema_1.conversations)
                            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.conversations.contactId, contact[0].id), (0, drizzle_orm_1.eq)(schema_1.conversations.connectionId, connectionId)))
                            .limit(1)];
                    case 5:
                        conversation = _e.sent();
                        if (!!conversation.length) return [3 /*break*/, 7];
                        return [4 /*yield*/, db_1.db.insert(schema_1.conversations)
                                .values({
                                companyId: companyId,
                                contactId: contact[0].id,
                                connectionId: connectionId,
                                status: 'active',
                            })
                                .returning()];
                    case 6:
                        newConversation = (_e.sent())[0];
                        conversation = [newConversation];
                        _e.label = 7;
                    case 7: 
                    // Save message
                    return [4 /*yield*/, db_1.db.insert(schema_1.messages)
                            .values({
                            conversationId: conversation[0].id,
                            senderType: 'contact',
                            content: messageText,
                            status: 'received',
                            providerMessageId: msg.key.id,
                        })];
                    case 8:
                        // Save message
                        _e.sent();
                        console.log("Incoming message from ".concat(fromNumber, ": ").concat(messageText));
                        return [3 /*break*/, 10];
                    case 9:
                        error_2 = _e.sent();
                        console.error('Error handling incoming message:', error_2);
                        return [3 /*break*/, 10];
                    case 10: return [2 /*return*/];
                }
            });
        });
    };
    WhatsAppQRService.prototype.handleMessageStatusUpdate = function (update) {
        return __awaiter(this, void 0, void 0, function () {
            var statusMap, status, error_3;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        if (!((_a = update.key) === null || _a === void 0 ? void 0 : _a.id))
                            return [2 /*return*/];
                        statusMap = {
                            1: 'sent',
                            2: 'delivered',
                            3: 'read',
                        };
                        status = statusMap[((_b = update.update) === null || _b === void 0 ? void 0 : _b.status) || 0];
                        if (!status)
                            return [2 /*return*/];
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, db_1.db.update(schema_1.messages)
                                .set({ status: status })
                                .where((0, drizzle_orm_1.eq)(schema_1.messages.providerMessageId, update.key.id))];
                    case 2:
                        _c.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _c.sent();
                        console.error('Error updating message status:', error_3);
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    WhatsAppQRService.prototype.sendMessage = function (connectionId, phoneNumber, content) {
        return __awaiter(this, void 0, void 0, function () {
            var session, jid, messageContent, result, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        session = this.sessions.get(connectionId);
                        if (!session) {
                            return [2 /*return*/, { success: false, error: 'Session not found or not connected' }];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        jid = phoneNumber.includes('@') ? phoneNumber : "".concat(phoneNumber, "@s.whatsapp.net");
                        messageContent = typeof content === 'string'
                            ? { text: content }
                            : content;
                        return [4 /*yield*/, session.socket.sendMessage(jid, messageContent)];
                    case 2:
                        result = _a.sent();
                        return [2 /*return*/, {
                                success: true,
                                messageId: (result === null || result === void 0 ? void 0 : result.key.id) || undefined
                            }];
                    case 3:
                        error_4 = _a.sent();
                        console.error('Error sending message:', error_4);
                        return [2 /*return*/, {
                                success: false,
                                error: error_4 instanceof Error ? error_4.message : 'Failed to send message'
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    WhatsAppQRService.prototype.getStatus = function (connectionId) {
        return __awaiter(this, void 0, void 0, function () {
            var session, dbSession, phoneNumber;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        session = this.sessions.get(connectionId);
                        if (!!session) return [3 /*break*/, 2];
                        return [4 /*yield*/, db_1.db.select()
                                .from(schema_1.whatsappQrSessions)
                                .where((0, drizzle_orm_1.eq)(schema_1.whatsappQrSessions.connectionId, connectionId))
                                .limit(1)];
                    case 1:
                        dbSession = (_b.sent())[0];
                        return [2 /*return*/, {
                                isConnected: false,
                                phoneNumber: (dbSession === null || dbSession === void 0 ? void 0 : dbSession.phoneNumber) || undefined,
                                lastConnectedAt: (dbSession === null || dbSession === void 0 ? void 0 : dbSession.lastConnectedAt) || undefined,
                            }];
                    case 2:
                        phoneNumber = (_a = session.socket.user) === null || _a === void 0 ? void 0 : _a.id.split('@')[0];
                        return [2 /*return*/, {
                                isConnected: true,
                                phoneNumber: phoneNumber || undefined,
                                lastConnectedAt: new Date(),
                            }];
                }
            });
        });
    };
    WhatsAppQRService.prototype.disconnectSession = function (connectionId) {
        return __awaiter(this, void 0, void 0, function () {
            var session, sessionPath, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        session = this.sessions.get(connectionId);
                        if (!session) return [3 /*break*/, 2];
                        return [4 /*yield*/, session.socket.logout()];
                    case 1:
                        _a.sent();
                        this.sessions.delete(connectionId);
                        _a.label = 2;
                    case 2: 
                    // Update database
                    return [4 /*yield*/, db_1.db.update(schema_1.whatsappQrSessions)
                            .set({
                            isActive: false,
                            updatedAt: new Date(),
                        })
                            .where((0, drizzle_orm_1.eq)(schema_1.whatsappQrSessions.connectionId, connectionId))];
                    case 3:
                        // Update database
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        _a.trys.push([4, 6, , 7]);
                        sessionPath = this.getSessionPath(connectionId);
                        return [4 /*yield*/, promises_1.default.rm(sessionPath, { recursive: true, force: true })];
                    case 5:
                        _a.sent();
                        return [3 /*break*/, 7];
                    case 6:
                        error_5 = _a.sent();
                        console.error('Error cleaning up session files:', error_5);
                        return [3 /*break*/, 7];
                    case 7:
                        console.log("Session ".concat(connectionId, " disconnected and cleaned up"));
                        return [2 /*return*/];
                }
            });
        });
    };
    WhatsAppQRService.prototype.reconnectAllSessions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var activeSessions, _i, activeSessions_1, session, connection;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, db_1.db.select()
                            .from(schema_1.whatsappQrSessions)
                            .where((0, drizzle_orm_1.eq)(schema_1.whatsappQrSessions.isActive, true))];
                    case 1:
                        activeSessions = _a.sent();
                        _i = 0, activeSessions_1 = activeSessions;
                        _a.label = 2;
                    case 2:
                        if (!(_i < activeSessions_1.length)) return [3 /*break*/, 6];
                        session = activeSessions_1[_i];
                        return [4 /*yield*/, db_1.db.select()
                                .from(require('../db/schema').connections)
                                .where((0, drizzle_orm_1.eq)(require('../db/schema').connections.id, session.connectionId))
                                .limit(1)];
                    case 3:
                        connection = _a.sent();
                        if (!connection[0]) return [3 /*break*/, 5];
                        console.log("Attempting to reconnect session ".concat(session.connectionId, "..."));
                        return [4 /*yield*/, this.connectSession(session.connectionId, connection[0].companyId)];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 2];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return WhatsAppQRService;
}());
exports.WhatsAppQRService = WhatsAppQRService;
exports.default = WhatsAppQRService;
