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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.conn = exports.db = void 0;
// src/lib/db/index.ts
require("dotenv/config");
var postgres_js_1 = require("drizzle-orm/postgres-js");
var postgres_1 = __importDefault(require("postgres"));
var schema = __importStar(require("@/lib/db/schema"));
var DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    // Lança um erro claro se a variável de ambiente não estiver definida em runtime.
    throw new Error('DATABASE_URL is not set in environment variables. The application cannot connect to the database.');
}
// Configuração de connection pooling
var connectionConfig = {
    max: 20, // Máximo de conexões no pool
    idle_timeout: 30, // Timeout de conexões inativas (segundos)
    connect_timeout: 10, // Timeout para estabelecer conexão (segundos)
    prepare: false, // Desabilita prepared statements para melhor compatibilidade
};
var conn;
if (process.env.NODE_ENV === 'production') {
    exports.conn = conn = (0, postgres_1.default)(DATABASE_URL, connectionConfig);
}
else {
    if (!globalThis.conn) {
        globalThis.conn = (0, postgres_1.default)(DATABASE_URL, connectionConfig);
    }
    exports.conn = conn = globalThis.conn;
}
var db = (0, postgres_js_1.drizzle)(conn, { schema: schema });
exports.db = db;
// Exporta explicitamente todas as tabelas e tipos do schema para garantir a resolução de módulos
__exportStar(require("./schema"), exports);
