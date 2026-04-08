export interface Property {
  _id: string;
  name: string;
  address: string;
  type: string;
  total_units: number;
  description: string;
  amenities: string[];
  is_active: boolean;
  units_count?: number;
  occupied_count?: number;
  occupancy_pct?: number;
  created_at?: string;
}

export interface Unit {
  _id: string;
  property_id: string;
  unit_number: string;
  floor: number;
  bedrooms: number;
  bathrooms: number;
  area_sqft: number;
  rent_amount: number;
  deposit_amount: number;
  status: string;
  current_tenant_id: string | null;
  tenant_name?: string;
  tenant_phone?: string;
}

export interface Tenant {
  _id: string;
  name: string;
  phone: string;
  email: string;
  id_proof_type: string;
  id_proof_number: string;
  emergency_contact: string;
  occupation: string;
  move_in_date: string;
  current_unit?: string;
  current_property_id?: string;
  active_lease?: Lease;
  maintenance_requests?: MaintenanceRequest[];
}

export interface Lease {
  _id: string;
  property_id: string;
  unit_number: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  deposit_amount: number;
  terms: string;
  status: string;
  tenant_name?: string;
  property_name?: string;
}

export interface Payment {
  _id: string;
  lease_id: string;
  amount: number;
  month_year: string;
  payment_method: string;
  transaction_ref: string;
  receipt_number: string;
  tenant_name?: string;
  property_name?: string;
  unit_number?: string;
  created_at?: string;
}

export interface MaintenanceRequest {
  _id: string;
  property_id: string;
  unit_number: string;
  tenant_id: string;
  title: string;
  description: string;
  priority: string;
  category: string;
  status: string;
  tenant_name?: string;
  property_name?: string;
  created_at?: string;
  resolved_at?: string;
}

export interface DashboardStats {
  total_properties: number;
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  maintenance_units: number;
  total_tenants: number;
  active_leases: number;
  monthly_revenue: number;
  overdue_count: number;
  expiring_leases: number;
  open_maintenance: number;
  urgent_maintenance: number;
  occupancy_by_property: { name: string; total: number; occupied: number; pct: number }[];
  recent_payments: Payment[];
  revenue_trend: { month: string; amount: number }[];
}

export interface PaymentStats {
  total_collected: number;
  total_expected: number;
  pending_amount: number;
  overdue: number;
  total_all_time: number;
  current_month: string;
}

export interface MaintenanceStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  urgent: number;
  high_priority: number;
  by_category: Record<string, number>;
}

export interface Settings {
  company_name: string;
  late_fee_per_day: number;
  payment_due_day: number;
  currency: string;
  currency_symbol: string;
}
