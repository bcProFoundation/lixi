import { useMemo } from 'react';

export const useInit = (callback, depends = []) => useMemo(callback, depends);
