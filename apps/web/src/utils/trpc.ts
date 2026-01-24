
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@borg/core';

export const trpc = createTRPCReact<AppRouter>();
