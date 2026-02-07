import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api';

export function initializeTracing(serviceName: string) {
    // Enable diagnostics (optional, for debugging)
    if (process.env.NODE_ENV === 'development') {
        diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
    }

    // Configure OTLP exporter (sends to Jaeger/Grafana Tempo/any OTLP-compatible backend)
    const traceExporter = new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
        headers: {
            // Optional: Add authentication headers if needed
            // 'Authorization': `Bearer ${process.env.OTEL_AUTH_TOKEN}`,
        },
    });

    // Create resource with service information
    const resource = new Resource({
        [ATTR_SERVICE_NAME]: serviceName,
        [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0',
        'deployment.environment': process.env.NODE_ENV || 'development',
        'service.namespace': 'flight-booking',
    });

    // Initialize SDK
    const sdk = new NodeSDK({
        resource,
        spanProcessor: new BatchSpanProcessor(traceExporter, {
            maxQueueSize: 1000,
            maxExportBatchSize: 512,
            scheduledDelayMillis: 5000,
        }),
        instrumentations: [
            getNodeAutoInstrumentations({
                '@opentelemetry/instrumentation-fs': { enabled: false },
                '@opentelemetry/instrumentation-http': {
                    enabled: true,
                    ignoreIncomingRequestHook: (request) => {
                        // Ignore health checks
                        return request.url?.includes('/health') || request.url?.includes('/metrics');
                    },
                },
                '@opentelemetry/instrumentation-express': { enabled: true },
                '@opentelemetry/instrumentation-nestjs-core': { enabled: true },
                '@opentelemetry/instrumentation-pg': { enabled: true },
                '@opentelemetry/instrumentation-redis-4': { enabled: true },
            }),
        ],
    });

    // Start the SDK
    sdk.start();

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        try {
            await sdk.shutdown();
            console.log('OpenTelemetry tracing terminated gracefully');
        } catch (error) {
            console.error('Error shutting down OpenTelemetry:', error);
        } finally {
            process.exit(0);
        }
    });

    console.log(`OpenTelemetry initialized for ${serviceName}`);
    console.log(`Exporting traces to: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'}`);

    return sdk;
}