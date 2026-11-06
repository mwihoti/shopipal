"use client";
import { useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
} from "ag-grid-community";
import { money } from "@/lib/money";
ModuleRegistry.registerModules([AllCommunityModule]);
export type DashboardOrder = {
  id: string;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  status: string;
  created_at: number;
  captured_at: number | null;
  commission_cents: number;
  title: string;
  amount_cents: number;
  referral_code: string | null;
};
const theme = themeQuartz.withParams({
  backgroundColor: "#fdfef9",
  foregroundColor: "#344936",
  headerBackgroundColor: "#eef2e4",
  headerTextColor: "#6a795b",
  borderColor: "#dce2d1",
  accentColor: "#6c874c",
  fontFamily: "Arial, sans-serif",
  fontSize: 12,
  rowHeight: 55,
  headerHeight: 42,
});
export default function OrdersGrid({ orders }: { orders: DashboardOrder[] }) {
  const columns = useMemo<ColDef<DashboardOrder>[]>(
    () => [
      { field: "title", headerName: "Product", minWidth: 180, flex: 1 },
      {
        field: "amount_cents",
        headerName: "Amount",
        valueFormatter: (p) => money(p.value),
        width: 120,
      },
      { field: "status", headerName: "Payment status", width: 150 },
      {
        field: "referral_code",
        headerName: "Referral",
        valueFormatter: (p) => p.value || "Direct",
        width: 120,
      },
      {
        field: "commission_cents",
        headerName: "Commission owed",
        valueFormatter: (p) => money(p.value),
        width: 160,
      },
      { field: "paypal_capture_id", headerName: "Capture ID", width: 195 },
      { field: "paypal_order_id", headerName: "PayPal order", width: 195 },
      {
        field: "created_at",
        headerName: "Created",
        valueFormatter: (p) => new Date(p.value).toLocaleString(),
        width: 185,
      },
    ],
    [],
  );
  return (
    <div className="orders-grid">
      <AgGridReact<DashboardOrder>
        theme={theme}
        rowData={orders}
        columnDefs={columns}
        defaultColDef={{ sortable: true, filter: true, resizable: true }}
        getRowId={(p) => p.data.id}
        pagination
        paginationPageSize={20}
        paginationPageSizeSelector={[20, 50, 100]}
        overlayNoRowsTemplate="No orders yet. Complete a sandbox purchase to see it here."
      />
    </div>
  );
}
