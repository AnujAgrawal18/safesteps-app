import { Suspense, lazy } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';

const WebSafeRoutes = lazy(() => 
  Platform.select({
    web: () => import('./saferoutes.web'),
    default: () => import('./saferoutes.native'),
  })()
);

export function SafeRoutesScreen() {
  return (
    <Suspense 
      fallback={
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1E90FF" />
        </View>
      }
    >
      <WebSafeRoutes />
    </Suspense>
  );
}

// Removed duplicate import of Platform

export default Platform.select({
  web: () => require('./saferoutes.web').default,
  default: () => require('./saferoutes.native').default,
})();
