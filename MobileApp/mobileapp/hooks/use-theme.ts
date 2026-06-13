import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * Returns the current theme color object (either `Colors.light` or `Colors.dark`)
 * based on the device color scheme.
 */
export function useTheme() {
  const scheme = useColorScheme();
  return Colors[scheme === 'dark' ? 'dark' : 'light'];
}
