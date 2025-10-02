import { EventEmitter } from "events";
import type { HumanCallback, StreamCallback, StreamCallbackMessage } from "@eko-ai/eko";
import { logger, type ErrorContext } from "../simple-logger";
import { getSocketIO } from "../socket";

export type HumanRequestType = "confirm" | "input" | "select" | "help";

export type PendingHumanRequest = {
  id: string;
  type: HumanRequestType;
  prompt: string;
  options?: string[];
  multiple?: boolean;
  taskId: string;
  companyId?: string;
  metadata?: Record<string, unknown>;
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  createdAt: number;
  context: CallbackContext;
};

const humanEvents = new EventEmitter();
const pendingRequests = new Map<string, PendingHumanRequest>();

const HUMAN_REQUEST_TIMEOUT_MS = 2 * 60 * 1000;

function emitSocketEvent(event: string, payload: Record<string, unknown>, companyId?: string) {
  const io = getSocketIO();
  if (!io) {
    return;
  }

  const room = companyId ? `company:${companyId}` : undefined;
  if (room) {
    io.to(room).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
}

function buildErrorContext(context: CallbackContext, overrides: Partial<ErrorContext> = {}): ErrorContext {
  return {
    requestId: overrides.requestId ?? context.requestId ?? "eko-stream",
    userId: overrides.userId ?? context.userId ?? "system",
    companyId: overrides.companyId ?? context.companyId ?? "",
    userAgent: overrides.userAgent ?? "eko-agent",
    ip: overrides.ip ?? "127.0.0.1",
  };
}

function registerRequest(request: PendingHumanRequest) {
  pendingRequests.set(request.id, request);

  const timeout = setTimeout(() => {
    if (pendingRequests.has(request.id)) {
      request.reject(new Error(`Human callback timed out for request ${request.id}`));
      pendingRequests.delete(request.id);
    }
  }, HUMAN_REQUEST_TIMEOUT_MS);

  humanEvents.once(`resolve:${request.id}`, (result: unknown) => {
    clearTimeout(timeout);
    if (!pendingRequests.has(request.id)) {
      return;
    }
    request.resolve(result);
    pendingRequests.delete(request.id);
  });

  humanEvents.once(`reject:${request.id}`, (error: unknown) => {
    clearTimeout(timeout);
    if (!pendingRequests.has(request.id)) {
      return;
    }
    request.reject(error);
    pendingRequests.delete(request.id);
  });
}

function createRequestId(taskId: string, suffix: string) {
  return `${taskId}:${suffix}:${Date.now()}`;
}

export function resolveHumanRequest(requestId: string, result: unknown) {
  const request = pendingRequests.get(requestId);
  if (request) {
    logger.info(
      "Eko human callback resolved",
      buildErrorContext(request.context, {
        requestId,
        companyId: request.companyId,
        userId: (request.metadata?.userId as string) ?? request.context.userId ?? "system",
      }),
      { requestType: request.type },
    );
  }
  humanEvents.emit(`resolve:${requestId}`, result);
}

export function rejectHumanRequest(requestId: string, error: unknown) {
  const request = pendingRequests.get(requestId);
  if (request) {
    logger.error(
      "Eko human callback rejected",
      buildErrorContext(request.context, {
        requestId,
        companyId: request.companyId,
        userId: (request.metadata?.userId as string) ?? request.context.userId ?? "system",
      }),
      error,
    );
  }
  humanEvents.emit(`reject:${requestId}`, error);
}

export type CallbackContext = {
  companyId?: string;
  requestId?: string;
  userId?: string;
};

function logStreamEvent(message: StreamCallbackMessage, context: CallbackContext) {
  const baseContext = buildErrorContext(context, {
    requestId: message.taskId ?? context.requestId,
    companyId: context.companyId,
  });
  const details = {
    nodeId: message.nodeId,
    agentName: message.agentName,
    messageType: message.type,
  };

  if (message.type === "error") {
    logger.error("Eko stream error", baseContext, message.error);
    return;
  }

  if (message.type === "finish") {
    logger.info("Eko workflow finished", baseContext, { ...details, usage: message.usage });
    return;
  }

  logger.info("Eko stream event", baseContext, { ...details, payload: message });
}

export function createStreamCallback(context: CallbackContext = {}): StreamCallback {
  return {
    onMessage: async (message) => {
      logStreamEvent(message, context);

      emitSocketEvent(
        "eko:stream",
        {
          context,
          message,
        },
        context.companyId,
      );
    },
  };
}

async function createHumanRequest<T = unknown>(
  type: HumanRequestType,
  taskId: string,
  prompt: string,
  context: CallbackContext,
  extra: Partial<PendingHumanRequest> = {},
) {
  const id = createRequestId(taskId, type);

  const payload = {
    id,
    type,
    taskId,
    prompt,
    companyId: context.companyId,
    options: extra.options,
    multiple: extra.multiple,
    metadata: extra.metadata,
    createdAt: Date.now(),
    context,
  } satisfies Omit<PendingHumanRequest, "resolve" | "reject">;

  const base = {
    requestId: context.requestId ?? id,
    userId: context.userId ?? "system",
    companyId: context.companyId ?? "",
    userAgent: "eko-agent",
    ip: "127.0.0.1",
  };

  logger.info(`Eko human callback requested: ${type}`, base, payload);
  emitSocketEvent("eko:human-request", payload, context.companyId);

  return await new Promise<T>((resolve, reject) => {
    registerRequest({
      ...payload,
      resolve: (value) => resolve(value as T),
      reject,
      type,
    });
  });
}

function resolveTaskId(agentContext: unknown, fallback?: string) {
  if (agentContext && typeof agentContext === "object") {
    const ctx = agentContext as { taskId?: string; task?: { id?: string } };
    return ctx.taskId ?? ctx.task?.id ?? fallback ?? "eko-task";
  }
  return fallback ?? "eko-task";
}

export function createHumanCallback(context: CallbackContext = {}): HumanCallback {
  return {
    onHumanConfirm: async (agentContext, prompt) => {
      const result = await createHumanRequest<boolean>(
        "confirm",
        resolveTaskId(agentContext, context.requestId),
        prompt,
        context,
      );
      return Boolean(result);
    },
    onHumanInput: async (agentContext, prompt) => {
      const result = await createHumanRequest<string>(
        "input",
        resolveTaskId(agentContext, context.requestId),
        prompt,
        context,
      );
      return String(result);
    },
    onHumanSelect: async (agentContext, prompt, options, multiple) => {
      const result = await createHumanRequest<string[] | string>(
        "select",
        resolveTaskId(agentContext, context.requestId),
        prompt,
        context,
        { options, multiple },
      );

      if (Array.isArray(result)) {
        return result;
      }

      return [String(result)];
    },
    onHumanHelp: async (agentContext, prompt, extInfo) => {
      const result = await createHumanRequest<boolean>(
        "help",
        resolveTaskId(agentContext, context.requestId),
        prompt,
        context,
        { metadata: { extInfo } },
      );
      return Boolean(result);
    },
  };
}

export function getPendingHumanRequests() {
  return Array.from(pendingRequests.values()).map(({ resolve, reject, ...rest }) => rest);
}
