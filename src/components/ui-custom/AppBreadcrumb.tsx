import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { NAV_ITEMS, getNavItemByPath } from "@/config/navigation";
import { useProfile } from "@/contexts/ProfileContext";
import { ChevronRight, Home, MapPin, FileText, Package } from "lucide-react";
import { UOS, CONTRATOS, SERVICOS } from "@/data/mockData";

export function AppBreadcrumb() {
  const location = useLocation();
  const navigate = useNavigate();
  const { operationalContext, setOperationalContext } = useProfile();

  const currentNav = getNavItemByPath(location.pathname);
  const isHome = location.pathname === "/";

  return null;
































































}