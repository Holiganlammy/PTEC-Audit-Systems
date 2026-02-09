// lib/utils/icon-mapper.ts
import {
  Home,
  FileText,
  Users,
  Settings,
  BarChart,
  FolderOpen,
  Shield,
  Bell,
  Calendar,
  Mail,
  Search,
  Database,
  Lock,
  Eye,
  Edit,
  Trash,
  Plus,
  Download,
  Upload,
  RefreshCw,
  Check,
  X,
  ChevronRight,
  Menu,
  LogOut,
  User,
  type LucideIcon,
} from "lucide-react";

export const iconMap: Record<string, LucideIcon> = {
  home: Home,
  "Permission Manage": Users,
};

export function getIcon(iconName: string | null): LucideIcon {
  if (!iconName) return FileText;
  return iconMap[iconName.toLowerCase()] || FileText;
}
 