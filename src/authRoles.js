export const USER_ROLES = {
  TENANT: "tenant",
  ADVERTISER: "advertiser",
  ADMIN: "admin",
};

export function getRoleLabel(role) {
  if (role === USER_ROLES.ADMIN) return "NamRent Admin";
  if (role === USER_ROLES.ADVERTISER) return "Advertiser";
  return "Tenant";
}