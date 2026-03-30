import React from "react";
import { useProfile } from "@/contexts/ProfileContext";
import DashboardExecutivo from "@/components/dashboards/DashboardExecutivo";
import DashboardFacilitador from "@/components/dashboards/DashboardFacilitador";
import DashboardTecnico from "@/components/dashboards/DashboardTecnico";

export default function DashboardPage() {
  const { currentProfile } = useProfile();
  const role = currentProfile.role;

  if (role === "tecnico") return <DashboardTecnico />;
  if (role === "coordenador") return <DashboardFacilitador />;
  // backoffice_dr, backoffice_uo, administrador → executivo
  return <DashboardExecutivo />;
}
