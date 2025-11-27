// Analytics helper with placeholder calls
// TODO: Integrate PostHog when ready

type EventName = 
  | 'page_view'
  | 'file_upload'
  | 'file_download'
  | 'file_delete'
  | 'results_approved'
  | 'results_revision'
  | 'share_clicked'
  | 'sign_up_started'
  | 'sign_in_success';

interface EventProperties {
  [key: string]: string | number | boolean | undefined;
}

export const analytics = {
  track: (eventName: EventName, properties?: EventProperties) => {
    // TODO: Replace with actual PostHog implementation
    if (import.meta.env.DEV) {
      console.log('[Analytics]', eventName, properties);
    }
    
    // Placeholder for PostHog
    // posthog.capture(eventName, properties);
  },

  page: (pageName: string) => {
    analytics.track('page_view', { page: pageName });
  },

  identify: (userId: string, traits?: Record<string, any>) => {
    // TODO: Replace with actual PostHog implementation
    if (import.meta.env.DEV) {
      console.log('[Analytics] Identify:', userId, traits);
    }
    
    // Placeholder for PostHog
    // posthog.identify(userId, traits);
  },
};
