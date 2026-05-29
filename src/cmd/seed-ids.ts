export const SEED_IDS = {
  // Verticals
  VERTICAL_MEDICAL: "seed-vertical-medical",
  VERTICAL_CAMPING: "seed-vertical-camping",
  VERTICAL_HOSPITALITY: "seed-vertical-hospitality",
  VERTICAL_DELIVERY: "seed-vertical-delivery",

  // Icons
  ICON_DEFAULT: "seed-icon-default",
  ICON_MEDICAL: "seed-icon-medical",
  ICON_CAMPING: "seed-icon-camping",
  ICON_HOSPITALITY: "seed-icon-hospitality",
  ICON_DELIVERY: "seed-icon-delivery",
  ICON_SETUP: "seed-icon-setup",
  ICON_TROUBLESHOOT: "seed-icon-troubleshoot",
  ICON_DEVICE_CONNECT: "seed-icon-device-connect",
  ICON_ALERT: "seed-icon-alert",
  ICON_ACCOUNT: "seed-icon-account",
  ICON_OTHERS: "seed-icon-others",

  // Roles
  ROLE_SUPER_ADMIN: "seed-role-super-admin",
  ROLE_ADMIN: "seed-role-admin",
  ROLE_SUPPORT_MANAGER: "seed-role-support-mgr",
  ROLE_VIEWER: "seed-role-viewer",

  // Admins
  ADMIN_SUPER: "seed-admin-super",
  ADMIN_ONE: "seed-admin-one",
  ADMIN_TWO: "seed-admin-two",
  ADMIN_SUPPORT: "seed-admin-support",
  ADMIN_VIEWER: "seed-admin-viewer",

  // Clients
  CLIENT_ACTIVE_1: "seed-client-active-1",
  CLIENT_ACTIVE_2: "seed-client-active-2",
  CLIENT_ACTIVE_3: "seed-client-active-3",
  CLIENT_SUSPENDED: "seed-client-suspended",
  CLIENT_INACTIVE: "seed-client-inactive",

  // Restaurants
  RESTAURANT_ACTIVE_1: "seed-restaurant-active-1",
  RESTAURANT_ACTIVE_2: "seed-restaurant-active-2",
  RESTAURANT_ACTIVE_3: "seed-restaurant-active-3",
  RESTAURANT_SUSPENDED: "seed-restaurant-suspended",

  // Boxes
  BOX_001: "seed-box-001",
  BOX_002: "seed-box-002",
  BOX_003: "seed-box-003",
  BOX_004: "seed-box-004",
  BOX_005: "seed-box-005",
  BOX_006: "seed-box-006",
  BOX_007: "seed-box-007",
  BOX_008: "seed-box-008",

  // Employees
  EMPLOYEE_MANAGER_1: "seed-emp-mgr-1",
  EMPLOYEE_MANAGER_2: "seed-emp-mgr-2",
  EMPLOYEE_DELIVERY_1: "seed-emp-del-1",
  EMPLOYEE_DELIVERY_2: "seed-emp-del-2",
  EMPLOYEE_SUSPENDED: "seed-emp-suspended",
  EMPLOYEE_UNASSIGNED: "seed-emp-unassigned",
  EMPLOYEE_MEDICAL_DELIVERY: "seed-emp-med-del-1",

  // FAQ Categories
  FAQ_CATEGORY_GETTING_STARTED: "seed-faq-cat-getting-started",
  FAQ_CATEGORY_TROUBLESHOOTING: "seed-faq-cat-troubleshooting",
  FAQ_CATEGORY_BILLING: "seed-faq-cat-billing",
  FAQ_CATEGORY_MEDICAL: "seed-faq-cat-medical",
  FAQ_CATEGORY_SETUP: "seed-faq-cat-setup",
  FAQ_CATEGORY_DEVICE_CONNECT: "seed-faq-cat-device-connect",
  FAQ_CATEGORY_ALERT: "seed-faq-cat-alert",
  FAQ_CATEGORY_ACCOUNT: "seed-faq-cat-account",
  FAQ_CATEGORY_OTHERS: "seed-faq-cat-others",

  // FAQ Questions
  FAQ_QUESTION_GS_1: "seed-faq-q-gs-1",
  FAQ_QUESTION_GS_2: "seed-faq-q-gs-2",
  FAQ_QUESTION_TR_1: "seed-faq-q-tr-1",
  FAQ_QUESTION_TR_2: "seed-faq-q-tr-2",
  FAQ_QUESTION_BILL_1: "seed-faq-q-bill-1",
  FAQ_QUESTION_MED_1: "seed-faq-q-med-1",

  // Notifications
  NOTIFICATION_1: "seed-notification-001",
  NOTIFICATION_2: "seed-notification-002",
  NOTIFICATION_3: "seed-notification-003",
  NOTIFICATION_4: "seed-notification-004",
  NOTIFICATION_5: "seed-notification-005",

  // System Configs
  CONFIG_MIN_ANDROID: "seed-config-min-android",
  CONFIG_MIN_IOS: "seed-config-min-ios",
  CONFIG_ANDROID_LINKS: "seed-config-android-links",
  CONFIG_IOS_LINKS: "seed-config-ios-links",
  CONFIG_MAINTENANCE: "seed-config-maintenance",
  CONFIG_IMAGE_URLS: "seed-config-image-urls",
  CONFIG_PRIVACY: "seed-config-privacy",
  CONFIG_TERMS: "seed-config-terms",
  CONFIG_JWT_ACCESS: "seed-config-jwt-access",
  CONFIG_JWT_REFRESH: "seed-config-jwt-refresh",
  CONFIG_PAGE_SIZE: "seed-config-page-size",
  CONFIG_APP_NAME: "seed-config-app-name",
  CONFIG_SUPPORT_EMAIL: "seed-config-support-email",
  CONFIG_MAX_LOGIN: "seed-config-max-login",
  CONFIG_OTP_EXPIRY: "seed-config-otp-expiry",

  // Archived
  ARCHIVED_ADMIN: "seed-admin-deleted",
  ARCHIVED_CLIENT: "seed-client-deleted",
  ARCHIVED_BOX: "seed-box-deleted",
  ARCHIVED_RESTAURANT: "seed-restaurant-deleted",
  ARCHIVED_EMPLOYEE: "seed-emp-deleted",
} as const;

export type SeedId = (typeof SEED_IDS)[keyof typeof SEED_IDS];
