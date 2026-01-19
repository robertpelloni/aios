
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@aios/core';

export const trpc = createTRPCReact<AppRouter>();
