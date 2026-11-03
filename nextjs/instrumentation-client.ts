// Observe startup errors immediately; download the SDK after the first paint.
import { startClientErrorReporting } from '@/lib/sentry/client-reporting';

startClientErrorReporting();
